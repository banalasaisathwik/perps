import { ORDERBOOKS } from "../store/memory";

export function getSortedAsks(symbol : string){
    const orderbook = ORDERBOOKS.get(symbol)
    const asks = orderbook?.asks
    const sortedAsks = asks ? new Map([...asks.entries()].sort((a,b)=>a[0]-b[0])) : undefined
    return sortedAsks
}

export function getSortedBids(symbol:string){
    const orderbook = ORDERBOOKS.get(symbol)
    const bids = orderbook?.bids
    const sortedBids = bids
    ? new Map([...bids.entries()].sort((a, b) => b[0] - a[0]))
    : undefined;
    return sortedBids
}