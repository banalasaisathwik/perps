import { ORDERBOOKS, type OrderRecord, type RestingOrder } from "../store/memory";

type pushTo = "bids" | "asks"

export function pushToOrderBook(order: OrderRecord,pushTo : pushTo){
    
    const price = order.price
    const symbol = order.symbol

    const orderbook = ORDERBOOKS.get(symbol)
    if(!orderbook){
        ORDERBOOKS.set(symbol,{asks:new Map(),bids:new Map()})
    }
    const symOrderbook = ORDERBOOKS.get(symbol)
    const fulfilled = Math.min(order.qty,order.filledQty)
    const remainingQty = order.qty - fulfilled
    if(remainingQty === 0){
        order.status = "filled"
        return
    }
    const newRestingOrder : RestingOrder = {
          orderId: order.orderId,
          userId: order.userId,
          side: order.side,
          type: "limit",
          symbol: order.symbol,
          price: order.price!,
          remainQty: remainingQty,
          status: order.filledQty > 0 ? "partially_filled" : "open",
          createdAt: Date.now()
    }

    const bids = symOrderbook?.bids
    if(!bids?.has(price!)){
        bids?.set(price!,[])
    }

    bids?.get(price!)?.push(newRestingOrder)
    return
}