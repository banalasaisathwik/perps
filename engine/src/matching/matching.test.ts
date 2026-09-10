import { beforeEach, describe, expect, test } from "bun:test";
import { createOrder } from "../handler/createOrder";
import { cancelOrder } from "../handler/cancelOrder";
import { liquidation } from "../handler/liquidation";
import { getOpenOrders } from "../handler/getOpenOrders";
import { BALANCES, FILLS, ORDERBOOKS, ORDERS, POSITIONS } from "../store/memory";
import { getOrderBookSnapshot } from "../utils/getOrderBookSnapshot";

const SYMBOL = "BTCUSDT";

function submit(input: {
  userId: string;
  side: "long" | "short";
  type?: "limit" | "market";
  price?: number | null;
  qty?: number;
  leverage?: number;
}) {
  const type = input.type ?? "limit";
  return createOrder({
    correlationId: crypto.randomUUID(),
    responseQueue: "test",
    type: "create_order",
    payload: {
      userId: input.userId,
      side: input.side,
      type,
      symbol: SYMBOL,
      price: type === "market" ? null : input.price ?? 100,
      qty: input.qty ?? 1,
      leverage: input.leverage ?? 10,
    },
  });
}

function ask(userId = "maker", price = 100, qty = 1) {
  return submit({ userId, side: "short", price, qty });
}

function bid(userId = "maker", price = 100, qty = 1) {
  return submit({ userId, side: "long", price, qty });
}

beforeEach(() => {
  BALANCES.clear();
  FILLS.length = 0;
  ORDERBOOKS.clear();
  ORDERS.clear();
  POSITIONS.clear();
});

describe("price-time matching and order lifecycle", () => {
  test("buy limit matches an equal or cheaper ask", () => {
    ask("seller", 100);
    const order = submit({ userId: "buyer", side: "long", price: 100 });
    expect(order.status).toBe("filled");
    expect(order.fills[0]?.price).toBe(100);
  });

  test("buy limit does not match an ask above its limit", () => {
    ask("seller", 101);
    const order = submit({ userId: "buyer", side: "long", price: 100 });
    expect(order.status).toBe("open");
    expect(getOrderBookSnapshot(SYMBOL).asks[0]?.price).toBe(101);
  });

  test("sell limit matches an equal or higher bid", () => {
    bid("buyer", 100);
    const order = submit({ userId: "seller", side: "short", price: 100 });
    expect(order.status).toBe("filled");
    expect(order.fills[0]?.price).toBe(100);
  });

  test("sell limit does not match a bid below its limit", () => {
    bid("buyer", 99);
    const order = submit({ userId: "seller", side: "short", price: 100 });
    expect(order.status).toBe("open");
    expect(getOrderBookSnapshot(SYMBOL).bids[0]?.price).toBe(99);
  });

  test("partial fills leave the correct remainder on the book", () => {
    ask("seller", 100, 1);
    const order = submit({ userId: "buyer", side: "long", price: 100, qty: 2 });
    expect(order.status).toBe("partially_filled");
    expect(order.filledQty).toBe(1);
    expect(getOrderBookSnapshot(SYMBOL).bids[0]).toEqual({ price: 100, qty: 1 });
  });

  test("full fills remove their price level", () => {
    ask("seller", 100);
    submit({ userId: "buyer", side: "long", price: 100 });
    expect(getOrderBookSnapshot(SYMBOL).asks).toEqual([]);
  });

  test("a limit order walks multiple executable price levels", () => {
    ask("seller-one", 100);
    ask("seller-two", 101);
    const order = submit({ userId: "buyer", side: "long", price: 101, qty: 2 });
    expect(order.fills.map((fill) => fill.price)).toEqual([100, 101]);
  });

  test("market buy consumes all available asks without becoming a resting order", () => {
    ask("seller-one", 100);
    ask("seller-two", 105);
    const order = submit({ userId: "buyer", side: "long", type: "market", qty: 2 });
    expect(order.status).toBe("filled");
    expect(order.fills.map((fill) => fill.price)).toEqual([100, 105]);
    expect(getOrderBookSnapshot(SYMBOL).bids).toEqual([]);
  });

  test("market sell consumes all available bids", () => {
    bid("buyer-one", 105);
    bid("buyer-two", 100);
    const order = submit({ userId: "seller", side: "short", type: "market", qty: 2 });
    expect(order.status).toBe("filled");
    expect(order.fills.map((fill) => fill.price)).toEqual([105, 100]);
  });

  test("an empty market order is cancelled", () => {
    const order = submit({ userId: "buyer", side: "long", type: "market" });
    expect(order.status).toBe("cancelled");
  });

  test("same-price resting orders preserve FIFO", () => {
    const first = ask("first", 100);
    const second = ask("second", 100);
    const order = submit({ userId: "buyer", side: "long", price: 100, qty: 1.5 });
    expect(order.fills.map((fill) => fill.sellOrderId)).toEqual([first.orderId, second.orderId]);
  });

  test("depth aggregates remaining orders after fills", () => {
    ask("first", 100, 2);
    ask("second", 101, 1);
    submit({ userId: "buyer", side: "long", price: 100, qty: 1 });
    expect(getOrderBookSnapshot(SYMBOL).asks).toEqual([
      { price: 100, qty: 1 },
      { price: 101, qty: 1 },
    ]);
  });

  test("open-order reads are scoped to the authenticated user", () => {
    const buyersOrder = bid("buyer", 99);
    bid("another-user", 98);
    const orders = getOpenOrders({
      correlationId: crypto.randomUUID(), responseQueue: "test", type: "get_open_orders",
      payload: { userId: "buyer", symbol: SYMBOL },
    });
    expect(orders.map((order) => order.orderId)).toEqual([buyersOrder.orderId]);
  });
});

describe("positions, reservations, and liquidation", () => {
  test("a fill creates a funded position for each participant", () => {
    ask("seller", 100);
    submit({ userId: "buyer", side: "long", price: 100 });
    expect(POSITIONS.get("buyer")?.[0]).toMatchObject({ side: "long", qty: 1, averagePrice: 100, margin: 10 });
    expect(POSITIONS.get("seller")?.[0]).toMatchObject({ side: "short", qty: 1, averagePrice: 100, margin: 10 });
  });

  test("same-side fills merge positions using a weighted average entry", () => {
    ask("seller-one", 100);
    submit({ userId: "buyer", side: "long", price: 100 });
    ask("seller-two", 110);
    submit({ userId: "buyer", side: "long", price: 110 });
    expect(POSITIONS.get("buyer")?.[0]).toMatchObject({ qty: 2, averagePrice: 105, margin: 21 });
  });

  test("an opposite-side market order closes, rather than reverses, an exact position", () => {
    ask("seller", 100);
    submit({ userId: "trader", side: "long", price: 100 });
    bid("exit-maker", 100);
    const close = submit({ userId: "trader", side: "short", type: "market" });
    expect(close.status).toBe("filled");
    expect(POSITIONS.get("trader")).toEqual([]);
  });

  test("cancelling a resting order releases its reserved margin", () => {
    const order = bid("buyer", 100, 2);
    expect(BALANCES.get("buyer")).toEqual({ available: 999999980, locked: 20 });
    cancelOrder({ correlationId: crypto.randomUUID(), responseQueue: "test", type: "cancel_order", payload: { userId: "buyer", orderId: order.orderId } });
    expect(BALANCES.get("buyer")).toEqual({ available: 1_000_000_000, locked: 0 });
  });

  test("a long liquidates at or below its liquidation price exactly once", () => {
    ask("seller", 100);
    submit({ userId: "buyer", side: "long", price: 100 });
    liquidation({ type: "mark_price", symbol: SYMBOL, latestPrice: 90 });
    liquidation({ type: "mark_price", symbol: SYMBOL, latestPrice: 80 });
    expect(POSITIONS.get("buyer")).toEqual([]);
  });

  test("a short liquidates at or above its liquidation price", () => {
    bid("buyer", 100);
    submit({ userId: "seller", side: "short", price: 100 });
    liquidation({ type: "mark_price", symbol: SYMBOL, latestPrice: 110 });
    expect(POSITIONS.get("seller")).toEqual([]);
  });
});
