import { ORDERBOOKS, type OrderRecord } from "../store/memory";
import { closeShortPosition } from "../utils/closeShortPostion";
import { getBalance } from "../utils/getBalance";
import { getSortedAsks } from "../utils/getSortedVal";
import { lockMargin } from "../utils/lockMargin";
import { openPosition } from "../utils/openPosition";

export function matchMarketLong(order : OrderRecord) {
  let marginFlag = true
  if (order.type !== "market" || order.side !== "long") {
    throw new Error("error in if condn in matchmarketlong");
  }

  const orderbook = ORDERBOOKS.get(order.symbol);
  if (!orderbook) {
    order.status = order.filledQty > 0 ? "partially_filled" : "cancelled";
    return order;
  }

  const avlBalance = getBalance(order.userId, order.symbol);
  const closedShortQty = closeShortPosition(order, order.price ?? 0, order.qty);
  order.filledQty = closedShortQty;

  while (order.filledQty < order.qty) {
    const sortedAsks = getSortedAsks(order.symbol);

    if (!sortedAsks || sortedAsks.size === 0) {
      break; 
    }

    const firstRestingOrderPrice = sortedAsks.keys().next().value;
    const firstRestingOrders = sortedAsks.values().next().value;

    if (
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
        // main diif from limt thing
        order.status = order.filledQty > 0 ? "partially_filled" : "cancelled";
        // //bugg
        // break
        marginFlag = false
        break
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
    order.status = order.filledQty > 0 ? "partially_filled" : "cancelled";
  }

  return order;

}