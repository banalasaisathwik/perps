import type { OrderRequest } from "..";
import { ORDERBOOKS, ORDERS } from "../store/memory";
import { unlockMargin } from "../utils/unlockMargin";
import { cancelOrderPayload } from "../zodValidations/validations";

export function cancelOrder(message : OrderRequest){
    const parsedPayload = cancelOrderPayload.safeParse(message.payload)
    if(!parsedPayload.success){
        throw new Error("Cancel Order Payload structure issue")
    }

    const {userId,orderId} = parsedPayload.data
    const order = ORDERS.get(orderId)

    if(!order || order.userId !== userId){
        throw new Error("Order not found")
    }

    if(order.type !== "limit" || order.status === "filled" || order.status === "cancelled"){
        return order
    }

    const orderbook = ORDERBOOKS.get(order.symbol)
    const bookSide = order.side === "long" ? orderbook?.bids : orderbook?.asks
    const ordersAtPrice = bookSide?.get(order.price!)
    const restingOrder = ordersAtPrice?.find((o)=>o.orderId === order.orderId)

    if(!restingOrder){
        return order
    }

    const remainingMargin = (restingOrder.remainQty * restingOrder.price) / order.leverage
    unlockMargin(userId,remainingMargin)
    order.status = "cancelled"

    const newOrdersAtPrice = ordersAtPrice?.filter((o)=>o.orderId !== order.orderId) ?? []
    if(newOrdersAtPrice.length === 0){
        bookSide?.delete(order.price!)
    }else{
        bookSide?.set(order.price!,newOrdersAtPrice)
    }

    return order
}
