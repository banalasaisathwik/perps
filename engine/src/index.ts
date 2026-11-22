import "dotenv/config";
import { createClient } from "redis";
import { createOrder } from "./handler/createOrder";
import { liquidation } from "./handler/liquidation";
import { getUserBalances } from "./handler/getUserBalances";
import { getDepth } from "./handler/getDepth";
import { getOrder } from "./handler/getOrder";
import { cancelOrder } from "./handler/cancelOrder";
import { getOpenOrders } from "./handler/getOpenOrders";
import { getMarkPrice } from "./handler/getMarkPrice";
import { MARK_PRICES } from "./store/memory";
import { connectOrderBookPublisher, publishOrderBookSnapshot } from "./redis/orderBookPublisher";
import { connectRedisClient, loadRedisConfig } from "../../shared/redis-config";

export type EngineCommandType =
  | "create_order"
  | "get_depth"
  | "get_user_balance"
  | "get_order"
  | "cancel_order"
  | "get_open_orders"
  | "get_mark_price";

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

const { clientOptions, startupTimeout } = loadRedisConfig();

const brokerClient = createClient(clientOptions).on("error", (error) => {
  console.error("Redis broker client error", error);
});

const responseClient = createClient(clientOptions).on("error", (error) => {
  console.error("Redis response client error", error);
});

await Promise.all([
  connectRedisClient(brokerClient, "Redis engine broker", startupTimeout),
  connectRedisClient(responseClient, "Redis engine responses", startupTimeout),
  connectOrderBookPublisher(),
]);

const engineCommandStream =
  process.env.REDIS_STREAM_ENGINE_COMMANDS ?? "perps:engine:commands";
const markPriceStream =
  process.env.REDIS_STREAM_MARK_PRICE ?? "perps:market:mark-price";

async function sendResponse(responseQueue: string, response: EngineResponse): Promise<void> {
  await responseClient.xAdd(
    responseQueue,
    "*",
    { data: JSON.stringify(response) },
  );
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
  case "get_open_orders":
    return getOpenOrders(message)
  case "get_mark_price":
    return getMarkPrice(message)
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
  try {
    const response = await brokerClient.xRead(
      [
        { key: engineCommandStream, id: lastIds.get(engineCommandStream) ?? "$" },
        { key: markPriceStream, id: lastIds.get(markPriceStream) ?? "$" },
      ],
      { COUNT: 1, BLOCK: 2000 },
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
            MARK_PRICES.set(message.symbol, message.latestPrice);
            liquidation(message);
          } catch (error) {
            console.error("Failed mark price execution", error);
          }
          continue;
        }

        let engineResponse: EngineResponse;
        try {
          console.log(
            `[engine] command ${message.type} correlationId=${message.correlationId}`,
          );
          const data = handleEngineRequest(message);

          engineResponse = {
            correlationId: message.correlationId,
            ok: true,
            data,
          };
        } catch (error) {
          engineResponse = {
            correlationId: message.correlationId,
            ok: false,
            error: error instanceof Error ? error.message : "engine_error",
          };
        }

        try {
          await sendResponse(message.responseQueue, engineResponse);
        } catch (error) {
          console.error("Failed to publish engine response", error);
          // The command is retained for diagnosis; never discard it merely
          // because the response could not be published.
          continue;
        }

        // Command entries must not be MAXLEN-trimmed: an overloaded engine
        // could otherwise silently drop unprocessed orders/cancellations.
        // Remove the command only after its response was published.
        try {
          await brokerClient.xDel(engineCommandStream, entry.id);
        } catch (error) {
          console.error("Failed to remove processed engine command", error);
        }
      }
    }
  } catch (error) {
    console.error("Engine Redis stream read failed", error);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}
