import type { OrderRecord } from "../store/memory";
import { matchLimitLong } from "./matchLimitLong";

// Market matching shares the same price-time traversal as a buy limit order,
// but matchLimitLong deliberately skips the price guard for type=market.
export function matchMarketLong(order: OrderRecord): OrderRecord {
  if (order.type !== "market" || order.side !== "long") {
    throw new Error("market-long matcher received the wrong order side or type");
  }
  return matchLimitLong(order);
}
