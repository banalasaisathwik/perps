import { ORDERBOOKS, type OrderRecord } from "../store/memory";
import { getSortedBids } from "../utils/getSortedVal";
import { pushToOrderBook } from "../utils/pushToOrderBook";
import { createFill } from "../utils/createFill";

export function matchLimitShort(order: OrderRecord): OrderRecord {
  const orderbook = ORDERBOOKS.get(order.symbol);

  if (!orderbook) {
    if (order.type === "limit") {
      pushToOrderBook(order, "asks");
      order.status = "open";
    } else {
      order.status = "cancelled";
    }
    return order;
  }

  while (order.filledQty < order.qty) {
    const sortedBids = getSortedBids(order.symbol);
    if (!sortedBids || sortedBids.size === 0) break;

    const bestBid = sortedBids.keys().next().value;
    const restingOrders = sortedBids.values().next().value;

    if (bestBid === undefined || !restingOrders?.length) break;

    // A sell/short cannot execute below its minimum price. Market orders
    // use a slippage-adjusted price calculated by createOrder.
    if (order.price !== null && bestBid < order.price) break;

    const consumedIds: string[] = [];

    for (const restingOrder of restingOrders) {
      if (order.filledQty >= order.qty) break;

      const remainingQty = order.qty - order.filledQty;
      const fillQty = Math.min(remainingQty, restingOrder.remainQty);

      createFill(order, restingOrder, fillQty, restingOrder.price);
      restingOrder.remainQty -= fillQty;

      if (restingOrder.remainQty <= 0) consumedIds.push(restingOrder.orderId);
    }

    const survivors = restingOrders.filter(
      (restingOrder) => !consumedIds.includes(restingOrder.orderId),
    );

    if (survivors.length === 0) orderbook.bids.delete(bestBid);
    else orderbook.bids.set(bestBid, survivors);
  }

  if (order.filledQty === order.qty) {
    order.status = "filled";
    return order;
  }

  if (order.type === "limit") {
    pushToOrderBook(order, "asks");
    order.status = order.filledQty > 0 ? "partially_filled" : "open";
  } else {
    order.status = order.filledQty > 0 ? "partially_filled" : "cancelled";
  }

  return order;
}
