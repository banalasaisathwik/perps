import "dotenv/config";
import { createClient } from "redis";
import { createOrder } from "./handler/createOrder";
import { liquidation } from "./handler/liquidation";
import { getUserBalances } from "./handler/getUserBalances";
import { getDepth } from "./handler/getDepth";
import { getOrder } from "./handler/getOrder";
import { cancelOrder } from "./handler/cancelOrder";
import { connectOrderBookPublisher, publishOrderBookSnapshot } from "./redis/orderBookPublisher";

export type EngineCommandType =
  | "create_order"
  | "get_depth"
  | "get_user_balance"
  | "get_order"
  | "cancel_order";

export interface OrderRequest {
  correlationId: string;
  responseQueue: string;
  type: EngineCommandType;
  payload: Record<string, unknown>;
}

export interface MarkPriceEvent {
  type: "mark_price";
  symbol: string;
  latestPrice: number;
}

export type BrokerMessage = OrderRequest | MarkPriceEvent 

export interface EngineResponse {
  correlationId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

const brokerClient = createClient({ url: process.env.REDIS_URL }).on("error", (error) => {
  console.error("Redis broker client error", error);
});

const responseClient = createClient({ url: process.env.REDIS_URL }).on("error", (error) => {
  console.error("Redis response client error", error);
});

await Promise.all([
  brokerClient.connect(),
  responseClient.connect(),
  connectOrderBookPublisher(),
]);

const engineCommandStream =
  process.env.REDIS_STREAM_ENGINE_COMMANDS ?? "perps:engine:commands";
const markPriceStream =
  process.env.REDIS_STREAM_MARK_PRICE ?? "perps:market:mark-price";

async function sendResponse(responseQueue: string, response: EngineResponse): Promise<void> {
  await responseClient.xAdd(responseQueue, "*", { data: JSON.stringify(response) });
}

function handleEngineRequest(message: OrderRequest): unknown {
let result: unknown;

switch (message.type) {
  case  "create_order":
    result = createOrder(message)
    break
  case "get_user_balance":
    return getUserBalances(message)
  case "get_depth":
    return getDepth(message)
  case "get_order":
    return getOrder(message)
  case "cancel_order":
    result = cancelOrder(message)
    break
  default:
    throw new Error("unknown engine command");
}

if (message.type === "create_order" || message.type === "cancel_order") {
  const symbol = (result as { symbol?: unknown }).symbol;
  if (typeof symbol === "string") {
    void publishOrderBookSnapshot(symbol).catch((error) => {
      console.error("Failed orderbook snapshot publish", error);
    });
  }
}

return result;
}

console.log(`Engine listening on Redis streams: ${engineCommandStream}, ${markPriceStream}`);

type RedisXReadResponse = Array<{
  name: string;
  messages: Array<{
    id: string;
    message: Record<string, string>;
  }>;
}>;

const lastIds = new Map<string, string>([
  [engineCommandStream, "$"],
  [markPriceStream, "$"],
]);

for (;;) {
  const response = await brokerClient.xRead(
    [
      { key: engineCommandStream, id: lastIds.get(engineCommandStream) ?? "$" },
      { key: markPriceStream, id: lastIds.get(markPriceStream) ?? "$" },
    ],
    { COUNT: 1, BLOCK: 2000 }
  ) as unknown as RedisXReadResponse;

  if (!response || response.length === 0) {
    continue;
  }

  for (const stream of response) {
    if (!stream.messages || stream.messages.length === 0) {
      continue;
    }

    for (const entry of stream.messages) {
      lastIds.set(stream.name, entry.id);

      const rawPayload = entry.message.data;
      if (!rawPayload) {
        console.error("Skipping message: No data field present in stream object.");
        continue;
      }

      let message: BrokerMessage;

      try {
        message = JSON.parse(rawPayload) as BrokerMessage;
      } catch {
        console.error("Skipping invalid broker message format");
        continue;
      }

      if (message.type === "mark_price") {
        try {
          liquidation(message);
        } catch (error) {
          console.error("Failed mark price execution", error);
        }
        continue;
      }

      try {
        console.log(
          `[engine] command ${message.type} correlationId=${message.correlationId}`,
        );
        const data = handleEngineRequest(message);

        await sendResponse(message.responseQueue, {
          correlationId: message.correlationId,
          ok: true,
          data,
        });
      } catch (error) {
        await sendResponse(message.responseQueue, {
          correlationId: message.correlationId,
          ok: false,
          error: error instanceof Error ? error.message : "engine_error",
        });
      }
    }
  }
}
