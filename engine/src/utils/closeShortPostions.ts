import { POSITIONS, type OrderRecord } from "../store/memory";

export function closeShortPostions(order : OrderRecord) : number{
    const userId = order.userId
    const symbol = order.symbol

    const positions = POSITIONS.get(userId)

    if(!positions || positions.length === 0){
        return 0
    }

    const shortPosition = positions.find((p)=> p.symbol === symbol &&  p.side === "short")
    if(!shortPosition){
        return 0
    }
    const qtyToBeclosed = Math.min(order.qty,shortPosition.qty)

    shortPosition.qty -= qtyToBeclosed
    return qtyToBeclosed
}