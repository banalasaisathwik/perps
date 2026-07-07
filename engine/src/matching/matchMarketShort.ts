import { ORDERBOOKS, type OrderRecord } from "../store/memory";
import { closeLongPosition } from "../utils/closeLongPosition";
import { getBalance } from "../utils/getBalance";
import { getSortedBids } from "../utils/getSortedVal";
import { lockMargin } from "../utils/lockMargin";
import { openPosition } from "../utils/openPosition";

export function matchMarketShort(order : OrderRecord){
  let marginFlag = true
  if (order.type !== "market" || order.side !== "short") {
    throw new Error("error in if condn in matchmarketShort");
  }

  const orderbook = ORDERBOOKS.get(order.symbol);
  if (!orderbook) {
    order.status = order.filledQty > 0 ? "partially_filled" : "cancelled";
    return order;
  }

  const avlBalance = getBalance(order.userId, order.symbol);

  const closedLongQty = closeLongPosition(order);
  order.filledQty = closedLongQty;

  while (order.filledQty < order.qty) {
    const sortedBids = getSortedBids(order.symbol);

    if (!sortedBids || sortedBids.size === 0) {
      break; 
    }

    const firstRestingOrderPrice = sortedBids.keys().next().value;
    const firstRestingOrders = sortedBids.values().next().value;

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
      orderbook.bids.delete(firstRestingOrderPrice!);
    } else {
      orderbook.bids.set(firstRestingOrderPrice!, newRestingOrders);
    }

    if(!marginFlag){
      break
    }
  }

  if (order.qty === order.filledQty) {
    order.status = "filled";
  } else {
    order.status = order.filledQty > 0 ? "partially_filled" : "cancelled";
  }

  return order;

}


