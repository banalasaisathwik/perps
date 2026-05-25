import { POSITIONS, type OrderRecord } from "../store/memory"

export function closeLongPositions(order : OrderRecord) : number{
    const userId = order.userId
    const symbol = order.symbol

    const positions = POSITIONS.get(userId)

    if(!positions || positions.length === 0){
        return 0
    }

    const longPosition = positions.find((p)=> p.symbol === symbol &&  p.side === "long")
    if(!longPosition){
        return 0
    }
    const qtyToBeclosed = Math.min(order.qty,longPosition.qty)

    longPosition.qty -= qtyToBeclosed
    return qtyToBeclosed
}