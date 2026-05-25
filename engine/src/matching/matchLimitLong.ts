import { ORDERBOOKS, type OrderRecord, type RestingOrder } from "../store/memory";
import { closeShortPostions } from "../utils/closeShortPostions";
import { getBalance } from "../utils/getBalance";
import { getSortedAsks } from "../utils/getSortedVal";
import { lockMargin } from "../utils/lockMargin";
import { openPosition } from "../utils/openPosition";
import { pushToOrderBook } from "../utils/pushToOrderBook";

export function matchLimitLong(order: OrderRecord): OrderRecord {
  if (order.type !== "limit" || order.side !== "long") {
    throw new Error("error in if condn in matchlimitlong");
  }

  const orderbook = ORDERBOOKS.get(order.symbol);
  if (!orderbook) {
    pushToOrderBook(order, "bids");
    order.status = order.filledQty > 0 ? "partially_filled" : "open";
    return order;
  }

  const avlBalance = getBalance(order.userId, order.symbol);
  const initialMarginNeeded = (order.price! * order.qty) / order.leverage;

  if (avlBalance.available < initialMarginNeeded) {
    order.status = "cancelled";
    throw new Error("Not enough margin for pos limit long");
  }

  const closedShortQty = closeShortPostions(order); 
  order.filledQty = closedShortQty;

  while (order.filledQty < order.qty) {
    const sortedAsks = getSortedAsks(order.symbol);

    if (!sortedAsks || sortedAsks.size === 0) {
      break; 
    }

    const firstRestingOrderPrice = sortedAsks.keys().next().value;
    const firstRestingOrders = sortedAsks.values().next().value;

    if (
      firstRestingOrderPrice! > order.price! ||
      !firstRestingOrders ||
      firstRestingOrders.length === 0
    ) {
      break; 
    }

    const removeRestingOrders: string[] = [];

    for (const restingOrder of firstRestingOrders) {

      if (order.filledQty === order.qty) break;

      const remainingQty = order.qty - order.filledQty;
      const qtyCanBeFilledInThisLoop =
        remainingQty > restingOrder.remainQty
          ? restingOrder.remainQty
          : remainingQty;

      const marginNeededForTrade =
        (qtyCanBeFilledInThisLoop * restingOrder.price) / order.leverage;

      if (avlBalance.available < marginNeededForTrade) {
        order.status = "cancelled";
        throw new Error("Not enough margin for pos limit long");
      }

      lockMargin(order.userId, marginNeededForTrade);
      openPosition(
        order,
        qtyCanBeFilledInThisLoop,
        marginNeededForTrade,
        restingOrder.price
      );

      order.filledQty += qtyCanBeFilledInThisLoop;
      
      restingOrder.remainQty -= qtyCanBeFilledInThisLoop;

      if (restingOrder.remainQty === 0) {
        removeRestingOrders.push(restingOrder.orderId);
      }
    }

    const newRestingOrders = firstRestingOrders.filter(
      (o) => !removeRestingOrders.includes(o.orderId)
    );

    if (newRestingOrders.length === 0) {
      orderbook.asks.delete(firstRestingOrderPrice!);
    } else {
      orderbook.asks.set(firstRestingOrderPrice!, newRestingOrders);
    }
  }

  if (order.qty === order.filledQty) {
    order.status = "filled";
  } else {
    order.status = order.filledQty > 0 ? "partially_filled" : "open";
    pushToOrderBook(order, "bids");
  }

  return order;
}