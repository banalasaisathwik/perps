import type { OrderRequest } from "..";
import type { DepthResponse } from "../store/memory";
import { getOrderBookSnapshot } from "../utils/getOrderBookSnapshot";
import { getDepthPayload } from "../zodValidations/validations";

export function getDepth(message : OrderRequest) : DepthResponse{
    const parsedPayload = getDepthPayload.safeParse(message.payload)
    if(!parsedPayload.success){
        throw new Error("Get Depth Payload structure issue")
    }

    const {symbol} = parsedPayload.data
    return getOrderBookSnapshot(symbol)
}
