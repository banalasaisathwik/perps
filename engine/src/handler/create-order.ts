import type { OrderRequest } from "..";
import { matchLimitLong } from "../matching/matchLimitLong";
import { matchLimitShort } from "../matching/matchLimitShort";
import { matchMarketLong } from "../matching/matchMarketLong";
import { matchMarketShort } from "../matching/matchMarketShort";
import { ORDERS, type OrderRecord } from "../store/memory";
import { createOrderPayload } from "../zodValidations/validations";

export const createOrder = (message: OrderRequest) => {
    const payload = message.payload

    const parsedPayload = createOrderPayload.safeParse(payload)
    if(!parsedPayload.success){
        throw new Error("Create Order Payload structure issue")
    }

    const {userId,side,type,symbol,price,qty,leverage} = parsedPayload.data

    const order : OrderRecord = {
          orderId: crypto.randomUUID(),
          userId: userId,
          side: side,
          type: type,
          symbol: symbol,
          price: price ?? null,
          qty: qty,
          leverage : leverage,
          filledQty: 0,
          status: "open",
          fills: [],
          createdAt: Date.now()
    }

    ORDERS.set(order.orderId,order)
    let processedOrder

    if(order.type === "limit" && order.side === "long"){
     processedOrder = matchLimitLong(order)
    }
    if(order.type === "limit" && order.side === "short"){
        processedOrder = matchLimitShort(order)
    }
    if(order.type === "market" && order.side === "long"){
        processedOrder = matchMarketLong(order)
    }
    if(order.type === "market" && order.side === "short"){
        processedOrder = matchMarketShort(order)
    }

    return processedOrder

}
