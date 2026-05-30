import type { OrderRequest } from "..";
import { ORDERBOOKS, type DepthLevel, type DepthResponse } from "../store/memory";
import { getDepthPayload } from "../zodValidations/validations";

function buildDepthLevel(orders : {price:number,remainQty:number}[]) : DepthLevel{
    return orders.reduce((level,order) => {
        level.qty += order.remainQty
        return level
    },{price:orders[0]?.price ?? 0,qty:0})
}

export function getDepth(message : OrderRequest) : DepthResponse{
    const parsedPayload = getDepthPayload.safeParse(message.payload)
    if(!parsedPayload.success){
        throw new Error("Get Depth Payload structure issue")
    }

    const {symbol} = parsedPayload.data
    const orderbook = ORDERBOOKS.get(symbol)

    if(!orderbook){
        return {symbol,bids:[],asks:[]}
    }

    const bids = [...orderbook.bids.entries()]
        .sort((a,b)=>b[0]-a[0])
        .map(([,orders])=>buildDepthLevel(orders))
        .filter((level)=>level.qty > 0)

    const asks = [...orderbook.asks.entries()]
        .sort((a,b)=>a[0]-b[0])
        .map(([,orders])=>buildDepthLevel(orders))
        .filter((level)=>level.qty > 0)

    return {symbol,bids,asks}
}
