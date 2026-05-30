import type { OrderRequest } from "..";
import { ORDERS } from "../store/memory";
import { getOrderPayload } from "../zodValidations/validations";

export function getOrder(message : OrderRequest){
    const parsedPayload = getOrderPayload.safeParse(message.payload)
    if(!parsedPayload.success){
        throw new Error("Get Order Payload structure issue")
    }

    const {userId,orderId} = parsedPayload.data
    const order = ORDERS.get(orderId)

    if(!order || order.userId !== userId){
        throw new Error("Order not found")
    }

    return order
}
