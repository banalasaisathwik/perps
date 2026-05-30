import type { OrderRequest } from "..";
import { matchLimitLong } from "../matching/matchLimitLong";
import { matchLimitShort } from "../matching/matchLimitShort";
import { ORDERS, type OrderRecord } from "../store/memory";
import { getMarketOrderPrice } from "../utils/getMarketOrderPrice";
import { createOrderPayload } from "../zodValidations/validations";

export const createOrder = (message: OrderRequest) => {
  const payload = message.payload;

  const parsedPayload = createOrderPayload.safeParse(payload);

  if (!parsedPayload.success) {
    throw new Error("Create Order Payload structure issue");
  }

  const { userId, side, type, symbol, price, qty, leverage } = parsedPayload.data;
  
  let finalPrice: number | null;

  if (type === "market") {
    finalPrice = getMarketOrderPrice(symbol, side);
  } else {
    if (price == null) {
      throw new Error("limit order requires price");
    }

    finalPrice = price;
  }
  const order: OrderRecord = {
    orderId: crypto.randomUUID(),
    userId,
    side,
    type,
    symbol,
    price: finalPrice,
    qty,
    leverage,
    filledQty: 0,
    status: "open",
    fills: [],
    createdAt: Date.now(),
  };

  ORDERS.set(order.orderId, order);
  if(type === "market" && finalPrice === null){
    order.status = "cancelled"
    return order
  }
  let processedOrder: OrderRecord;

  if (order.side === "long") {
    processedOrder = matchLimitLong(order);
  } else {
    processedOrder = matchLimitShort(order);
  }

  return processedOrder;
};
