import {
  FILLS,
  ORDERS,
  type Fill,
  type OrderRecord,
  type RestingOrder,
} from "../store/memory";

import { canProcessUserTrade, processUserTrade } from "./processUserTrade";

export function createFill(
  incomingOrder: OrderRecord,
  restingOrder: RestingOrder,
  qty: number,
  price: number,
){
    const restingOrderRecord = ORDERS.get(restingOrder.orderId);

  if (!restingOrderRecord) {
    throw new Error("resting order not found");
  }

  const buyOrder = incomingOrder.side === "long" ? incomingOrder : restingOrderRecord
  const sellOrder = incomingOrder.side === "short" ? incomingOrder : restingOrderRecord

  if (buyOrder.userId === sellOrder.userId) {
    throw new Error("self-trade is not supported");
  }

  // Check both accounts before changing either account's position or margin.
  if (!canProcessUserTrade(buyOrder, qty, price) || !canProcessUserTrade(sellOrder, qty, price)) {
    throw new Error("balance not sufficient");
  }

  processUserTrade(buyOrder,qty,price)
  processUserTrade(sellOrder,qty,price)

    const fill: Fill = {
    fillId: crypto.randomUUID(),
    symbol: incomingOrder.symbol,
    price,
    qty,
    buyOrderId: buyOrder.orderId,
    sellOrderId: sellOrder.orderId,
    createdAt: Date.now(),
  };

  FILLS.push(fill)
  buyOrder.fills.push(fill)
  sellOrder.fills.push(fill)

  buyOrder.filledQty += qty
  sellOrder.filledQty += qty

  buyOrder.status = buyOrder.filledQty === buyOrder.qty ? "filled" : "partially_filled"
  sellOrder.status = sellOrder.filledQty === sellOrder.qty ? "filled" : "partially_filled"
  
  restingOrder.status = restingOrderRecord.status;

}
