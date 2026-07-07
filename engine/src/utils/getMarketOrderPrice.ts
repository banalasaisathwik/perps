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
    if (!book.asks || book.asks.size === 0) return null;

    const keys = [...book.asks.keys()].map(Number);
    const bestAsk = Math.min(...keys);

    return bestAsk * (1 + SLIPPAGE_PERCENT / 100);
  }

  if (!book.bids || book.bids.size === 0) return null;

  const bidKeys = [...book.bids.keys()].map(Number);
  const bestBid = Math.max(...bidKeys);

  return bestBid * (1 - SLIPPAGE_PERCENT / 100);
}
