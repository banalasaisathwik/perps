import { ORDERBOOKS, type OrderRecord } from "../store/memory";
import { getSortedAsks } from "../utils/getSortedVal";
import { pushToOrderBook } from "../utils/pushToOrderBook";
import { createFill } from "../utils/createFill";

export function matchLimitLong(order: OrderRecord): OrderRecord {
  const orderbook = ORDERBOOKS.get(order.symbol);

  if (!orderbook) {
    if (order.type === "limit") {
      pushToOrderBook(order, "bids");
      order.status = "open";
    } else {
      order.status = "cancelled";
    }

    return order;
  }

  while (order.filledQty < order.qty) {
    const sortedAsks = getSortedAsks(order.symbol);

    if (!sortedAsks || sortedAsks.size === 0) {
      break;
    }

    const bestAskPrice = sortedAsks.keys().next().value;

    const restingOrders = sortedAsks.values().next().value;

    if (
      bestAskPrice === undefined ||
      !restingOrders ||
      restingOrders.length === 0
    ) {
      break;
    }

    if (bestAskPrice > order.price!) {
      break;
    }

    const fullyConsumed: string[] = [];

    for (const restingOrder of restingOrders) {
      if (order.filledQty >= order.qty) {
        break;
      }

      const remainingQty = order.qty - order.filledQty;

      const fillQty = Math.min(remainingQty, restingOrder.remainQty);

      createFill(order, restingOrder, fillQty, restingOrder.price);

      restingOrder.remainQty -= fillQty;

      if (restingOrder.remainQty === 0) {
        fullyConsumed.push(restingOrder.orderId);
      }
    }

    const remainingOrders = restingOrders.filter(
      (o) => !fullyConsumed.includes(o.orderId),
    );

    if (remainingOrders.length === 0) {
      orderbook.asks.delete(bestAskPrice);
    } else {
      orderbook.asks.set(bestAskPrice, remainingOrders);
    }
  }

  if (order.filledQty === order.qty) {
    order.status = "filled";

    return order;
  }

  const remainingQty = order.qty - order.filledQty;

  if (remainingQty > 0) {
    if (order.type === "limit") {
      pushToOrderBook(order, "bids");

      order.status = order.filledQty > 0 ? "partially_filled" : "open";
    } else {
      order.status = order.filledQty > 0 ? "partially_filled" : "cancelled";
    }
  }

  return order;
}
