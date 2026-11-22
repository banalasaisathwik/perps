import { createClient } from "redis";
import { getOrderBookSnapshot } from "../utils/getOrderBookSnapshot";
import {
  connectRedisClient,
  loadRedisConfig,
} from "../../../shared/redis-config";

const orderBookStream =
  process.env.REDIS_STREAM_ORDERBOOK ?? "perps:events:orderbook";

const { clientOptions, startupTimeout, streamAddOptions } = loadRedisConfig();

const orderBookPublisher = createClient(clientOptions).on(
  "error",
  () => console.log("orderbook publisher redis error"),
);

export async function connectOrderBookPublisher() {
  if (!orderBookPublisher.isOpen) {
    await connectRedisClient(
      orderBookPublisher,
      "Redis order-book publisher",
      startupTimeout,
    );
  }
}

export async function publishOrderBookSnapshot(symbol: string) {
  const snapshot = getOrderBookSnapshot(symbol);

  await orderBookPublisher.xAdd(orderBookStream, "*", {
    data: JSON.stringify({
      type: "orderbook.updated",
      ...snapshot,
      ts: Date.now(),
    }),
  }, streamAddOptions);
}
