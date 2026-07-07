import { ORDERBOOKS, type OrderRecord } from "../store/memory";
import { getSortedBids } from "../utils/getSortedVal";
import { pushToOrderBook } from "../utils/pushToOrderBook";
import { createFill } from "../utils/createFill";

export function matchLimitShort(order: OrderRecord): OrderRecord {

  const orderbook = ORDERBOOKS.get(order.symbol)

  if(!orderbook){
    if(order.type === "limit"){
      order.status = "open"
      pushToOrderBook(order,"asks")
    }
    else{
      order.status = "cancelled"
    }
    return order
  }

  while(order.filledQty < order.qty){
    const sortedBids  = getSortedBids(order.symbol)

    if(!sortedBids || sortedBids.size === 0){
      break
    }

    const firstPrice = sortedBids.keys().next().value
    const firstOrders = sortedBids.values().next().value

    if(firstPrice === undefined || !firstOrders || firstOrders.length === 0){
      break
    }

    const fulfilledRestingOrderId : string[] = []

    for(const restingOrder of firstOrders){
      if(order.filledQty >= order.qty){
        break
      }

      const remainingQty = order.qty - order.filledQty

      const fillQty = Math.min(remainingQty,restingOrder.remainQty)

      createFill(order,restingOrder,fillQty,restingOrder.price)

      restingOrder.remainQty -= fillQty
      if (restingOrder.remainQty === 0) {
      fulfilledRestingOrderId.push(restingOrder.orderId)
      }
    }

    const remainingOrder = firstOrders.filter((o)=>
        !fulfilledRestingOrderId.includes(o.orderId)
    )

    if(remainingOrder.length === 0){
      orderbook.bids.delete(firstPrice)
    }
    else{
      orderbook.bids.set(firstPrice,remainingOrder)
    }
  }

  if(order.type === "market"){
    order.status = order.filledQty > 0 ? "partially_filled" : "cancelled"
  }
  else{
    order.status = order.filledQty > 0 ? "partially_filled" : "open"
  }

  return order

}
