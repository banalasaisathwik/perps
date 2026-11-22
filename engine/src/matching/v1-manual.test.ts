import { beforeEach, describe, expect, test } from "bun:test";
import { createOrder } from "../handler/createOrder";
import { cancelOrder } from "../handler/cancelOrder";
import { getDepth } from "../handler/getDepth";
import { getMarketOrderPrice } from "../utils/getMarketOrderPrice";
import { BALANCES, FILLS, ORDERBOOKS, ORDERS, POSITIONS, type Side } from "../store/memory";

const SYMBOL = "BTCUSDC";

function place(
  userId: string,
  side: Side,
  price: number | null,
  qty = 1,
) {
  return createOrder({
    correlationId: crypto.randomUUID(),
    responseQueue: "test",
    type: "create_order",
    payload: {
      userId,
      side,
      type: price === null ? "market" : "limit",
      symbol: SYMBOL,
      price,
      qty,
      leverage: 5,
    },
  });
}

function depth() {
  return getDepth({
    correlationId: "depth-test",
    responseQueue: "test",
    type: "get_depth",
    payload: { symbol: SYMBOL },
  });
}

beforeEach(() => {
  BALANCES.clear();
  ORDERBOOKS.clear();
  ORDERS.clear();
  POSITIONS.clear();
  FILLS.length = 0;
});

describe("V1 human-only matching engine", () => {
  test("two different users' matching limit orders fill with no bot", () => {
    const aliceSell = place("alice", "short", 100, 1);
    expect(aliceSell.status).toBe("open");
    expect(depth().asks).toEqual([{ price: 100, qty: 1 }]);
    expect(depth().bids).toEqual([]);

    const bobBuy = place("bob", "long", 100, 1);

    expect(bobBuy.status).toBe("filled");
    expect(aliceSell.status).toBe("filled");
    expect(bobBuy.filledQty).toBe(1);
    expect(FILLS).toHaveLength(1);
    expect(FILLS[0]?.price).toBe(100);
    expect(depth()).toEqual({ symbol: SYMBOL, bids: [], asks: [] });
    expect(BALANCES.get("alice")?.locked).toBe(20);
    expect(BALANCES.get("bob")?.locked).toBe(20);
  });

  test("a non-crossing sell stays on the ask book", () => {
    const bobBuy = place("bob", "long", 100);
    const aliceSell = place("alice", "short", 101);

    expect(bobBuy.status).toBe("open");
    expect(aliceSell.status).toBe("open");
    expect(FILLS).toHaveLength(0);
    expect(depth()).toEqual({
      symbol: SYMBOL,
      bids: [{ price: 100, qty: 1 }],
      asks: [{ price: 101, qty: 1 }],
    });
  });

  test("partial fills leave the remaining quantity on the right side", () => {
    const aliceSell = place("alice", "short", 100, 2);
    const bobBuy = place("bob", "long", 100, 1);

    expect(aliceSell.status).toBe("partially_filled");
    expect(aliceSell.filledQty).toBe(1);
    expect(bobBuy.status).toBe("filled");
    expect(depth().asks).toEqual([{ price: 100, qty: 1 }]);
  });

  test("market order cancels without counterparty and fills when one exists", () => {
    expect(getMarketOrderPrice(SYMBOL, "long")).toBeNull();
    const noLiquidity = place("bob", "long", null);
    expect(noLiquidity.status).toBe("cancelled");
    expect(noLiquidity.filledQty).toBe(0);

    place("alice", "short", 100);
    expect(getMarketOrderPrice(SYMBOL, "long")).toBe(105);
    const marketBuy = place("bob", "long", null);
    expect(marketBuy.status).toBe("filled");
    expect(FILLS).toHaveLength(1);
  });

  test("cancelling a resting sell removes it from the book", () => {
    const ask = place("alice", "short", 100);
    const canceled = cancelOrder({
      correlationId: "cancel-test",
      responseQueue: "test",
      type: "cancel_order",
      payload: { userId: "alice", orderId: ask.orderId },
    });

    expect(canceled.status).toBe("cancelled");
    expect(depth().asks).toEqual([]);
  });
});
