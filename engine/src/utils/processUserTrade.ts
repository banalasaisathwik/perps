import type { OrderRecord } from "../store/memory";
import { openPosition } from "./openPosition";
import { getBalance } from "./getBalance";
import { lockMargin } from "./lockMargin";
import { closeShortPosition } from "./closeShortPostion";
import { closeLongPosition } from "./closeLongPosition";

export function processUserTrade(
  order: OrderRecord,
  qty: number,
  fillPrice: number,
) {

  let closedQty = 0
  if(order.side === "long"){
    closedQty = closeShortPosition(order,fillPrice,qty)
  }
  else{
    closedQty = closeLongPosition(order,fillPrice,qty)
  }

  const toOpenQty = qty - closedQty

  const avaBalance = getBalance(order.userId).available

  const marginNeeded = (toOpenQty * fillPrice)/order.leverage

  if(avaBalance < marginNeeded){
    throw new Error("balance not sufficient")
  }

  lockMargin(order.userId,marginNeeded)
  openPosition(order,toOpenQty,marginNeeded,fillPrice)
  
}
