import { ORDERBOOKS, type DepthLevel, type DepthResponse } from "../store/memory";

function buildDepthLevel(orders: { price: number; remainQty: number }[]): DepthLevel {
  if (!orders || orders.length === 0) {
    return { price: 0, qty: 0 };
  }

  const firstOrder = orders[0];
  const price = firstOrder?.price ?? 0;
  const qty = orders.reduce((acc, o) => acc + (o.remainQty ?? 0), 0);

  return { price, qty };
}

export function getOrderBookSnapshot(symbol: string): DepthResponse {
  const orderbook = ORDERBOOKS.get(symbol);

  if (!orderbook) {
    return { symbol, bids: [], asks: [] };
  }

  const bids = [...orderbook.bids.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, orders]) => buildDepthLevel(orders))
    .filter((level) => level.qty > 0);

  const asks = [...orderbook.asks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, orders]) => buildDepthLevel(orders))
    .filter((level) => level.qty > 0);

  return { symbol, bids, asks };
}
