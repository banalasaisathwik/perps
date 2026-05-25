import type { Postion } from "../store/memory";

export function caluculateLiquidation(position : Postion) : number{

    const margin = position.margin
    const avgPrice = position.averagePrice

    const liquidation = position.side === "long" ? avgPrice-margin : margin-avgPrice
    
    return liquidation
}