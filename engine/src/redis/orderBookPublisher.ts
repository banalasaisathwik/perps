import { createClient } from "redis";
import { getOrderBookSnapshot } from "../utils/getOrderBookSnapshot";

const orderBookStream =
  process.env.REDIS_STREAM_ORDERBOOK ?? "perps:events:orderbook";

const orderBookPublisher = createClient({ url: process.env.REDIS_URL }).on(
  "error",
  () => console.log("orderbook publisher redis error"),
);

export async function connectOrderBookPublisher() {
  if (!orderBookPublisher.isOpen) {
    await orderBookPublisher.connect();
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
  });
}
