import { ORDERBOOKS } from "../store/memory";

const SLIPPAGE_PERCENT = 5;

export function getMarketOrderPrice(
  symbol: string,
  side: "long" | "short",
): number | null {
  const book = ORDERBOOKS.get(symbol);

  if (!book) {
    return null
  }

  if (side === "long") {
    if (book.asks.size === 0) return null;
    const bestAsk = Math.min(...book.asks.keys());

    return bestAsk * (1 + SLIPPAGE_PERCENT / 100);
  }

  if (book.bids.size === 0) return null;
  const bestBid = Math.max(...book.bids.keys());

  return bestBid * (1 - SLIPPAGE_PERCENT / 100);
}
