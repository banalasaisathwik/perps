import { BALANCES, POSITIONS, type OrderRecord } from "../store/memory";

import { unlockMargin } from "./unlockMargin";
import { getBalance } from "./getBalance";

export function closeShortPosition(
  order: OrderRecord,
  fillPrice: number,
  qty: number,
): number {
  const positions = POSITIONS.get(order.userId);

  if (!positions) {
    return 0;
  }

  const shortPosition = positions.find((p)=>{
    p.side === "short"  && p.symbol === order.symbol
  })

  if(!shortPosition){
    return 0
  }

  const shortPosQty = shortPosition.qty

  const qtyToClose = Math.min(shortPosQty,qty)

  const marginPerQty =  shortPosition.margin / shortPosition.qty

  const marginToRelease = marginPerQty * qtyToClose

  const pnl = (shortPosition.averagePrice - fillPrice) * qtyToClose

  unlockMargin(order.userId,marginToRelease)

  getBalance(order.userId).available += pnl
  
  if(shortPosition.qty === 0){
    positions.splice(positions.indexOf(shortPosition),1)
  }
  
  return qtyToClose

}
