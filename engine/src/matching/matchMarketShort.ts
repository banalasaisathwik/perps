import type { OrderRecord } from "../store/memory";
import { matchLimitShort } from "./matchLimitShort";

// Market matching shares the same price-time traversal as a sell limit order,
// but matchLimitShort deliberately skips the price guard for type=market.
export function matchMarketShort(order: OrderRecord): OrderRecord {
  if (order.type !== "market" || order.side !== "short") {
    throw new Error("market-short matcher received the wrong order side or type");
  }
  return matchLimitShort(order);
}
