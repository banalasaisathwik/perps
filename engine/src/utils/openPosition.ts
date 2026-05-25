import { POSITIONS, type OrderRecord,type Postion } from "../store/memory";
import { caluculateLiquidation } from "./caluculateLiquidation";
import { getAvgPrice } from "./getAvgPrice";

export function openPosition(order : OrderRecord,qtyToOpen : number,marginLocked:number,newEntryPrice:number){

    const userId = order.userId

    if(!POSITIONS.has(userId)){
        const position :Postion ={
          orderId: order.orderId,
          symbol:order.symbol ,
          side: order.side,
          qty: qtyToOpen,
          margin: marginLocked,
          liquidationPrice: order.side=== "long" ? newEntryPrice-marginLocked : marginLocked-newEntryPrice,
          pnL: null,
          averagePrice: newEntryPrice
        
    }
        POSITIONS.set(userId,[])
        POSITIONS.get(userId)?.push(position)
        return
    }

    const avgPrice = getAvgPrice(newEntryPrice,userId,order.symbol,qtyToOpen)
    const position = POSITIONS.get(userId)?.find(p => p.symbol === order.symbol)
    if (position) {
    position.averagePrice = avgPrice;
    position.margin+=marginLocked

    const newLiquidationPrice = caluculateLiquidation(position)
    position.liquidationPrice = newLiquidationPrice
    
    }

    return

}
