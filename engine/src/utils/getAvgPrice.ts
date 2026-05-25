import { POSITIONS } from "../store/memory";

export function getAvgPrice(newEntryPrice:number,userId:string,symbol:string,qty:number){
    const positions = POSITIONS.get(userId)

    if(!positions){
        throw new Error("error at getAvgPrice postion is undefined")
    }

    const symbolPosition = positions.find(p => p.symbol === symbol)

    if(!symbolPosition){
        throw new Error("error at getAvgPrice symbol-postion is undefined")
    }

    const avgPrice = symbolPosition.averagePrice
    const totalQty = symbolPosition.qty

    const newAvgPrice = (avgPrice*totalQty + newEntryPrice*qty)/(totalQty+qty)

    return newAvgPrice
   
}