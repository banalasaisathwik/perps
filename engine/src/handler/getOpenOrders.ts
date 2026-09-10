import type { OrderRequest } from "..";
import { ORDERS } from "../store/memory";
import { getOpenOrdersPayload } from "../zodValidations/validations";

export function getOpenOrders(message: OrderRequest) {
  const parsedPayload = getOpenOrdersPayload.safeParse(message.payload);
  if (!parsedPayload.success) throw new Error("Get Open Orders Payload structure issue");

  const { userId, symbol } = parsedPayload.data;
  return [...ORDERS.values()]
    .filter((order) => order.userId === userId)
    .filter((order) => !symbol || order.symbol === symbol)
    .filter((order) => order.status === "open" || order.status === "partially_filled")
    .sort((left, right) => right.createdAt - left.createdAt);
}
