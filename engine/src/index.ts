import "dotenv/config";
import { createClient } from "redis";
import { createOrder } from "./handler/create-order";
import { liquidation } from "./handler/liquidation";

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

await Promise.all([brokerClient.connect(), responseClient.connect()]);

const engineQueue = process.env.ENGINE_QUEUE ?? "backend-engine-queue";

async function sendResponse(responseQueue: string, response: EngineResponse): Promise<void> {
  await responseClient.lPush(responseQueue, JSON.stringify(response));
}

function handleEngineRequest(message: OrderRequest): unknown {

switch (message.type) {
  case  "create_order":
    return(createOrder(message))
  // case "get_user_balance":
  //   return getUserBalances(message)
  // case "get_depth":
  //   return getDepth(message)
  // case "get_order":
  //   return getOrder(message)
  default:
    break;
}

}

console.log(`Engine listening on Redis queue: ${engineQueue}`);

for (;;) {
  const item = await brokerClient.brPop(engineQueue, 0);
  if (!item) continue;

  let message: BrokerMessage;

  try {
    message = JSON.parse(item.element) as BrokerMessage;
  } catch {
    console.error("Skipping invalid broker message");
    continue;
  }

  if (message.type === "mark_price") {
    try {
      liquidation(message);
    } catch (error) {
      console.error("Failed to process mark price", error);
    }
    continue;
  }

  try {
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
