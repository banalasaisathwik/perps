import {
  FILLS,
  ORDERS,
  type Fill,
  type OrderRecord,
  type RestingOrder,
} from "../store/memory";

import { processUserTrade } from "./processUserTrade";

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
  const sellOrder = incomingOrder.side === "short" ? restingOrderRecord : incomingOrder

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
