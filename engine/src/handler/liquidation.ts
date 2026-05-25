import type { MarkPriceEvent } from "..";
import { matchMarketLong } from "../matching/matchMarketLong";
import { matchMarketShort } from "../matching/matchMarketShort";
import { ORDERS, POSITIONS, type OrderRecord, type Side } from "../store/memory";
import { liquidationPayload } from "../zodValidations/validations";

export function liquidation(message: MarkPriceEvent) {

    const validatedPayload = liquidationPayload.safeParse(message)
    if(!validatedPayload.success){
        throw new Error("bad structure in liquidation")
    }
    const {latestPrice } = validatedPayload.data

    POSITIONS.forEach((position, userId) => {
        position.forEach((p) => {
            const originalOrder = ORDERS.get(p.orderId)
            if (!originalOrder) {
                return
            }

            const liquidationSide: Side = p.side === "long" ? "short" : "long"
            const liquidationOrder: OrderRecord = {
                ...originalOrder,
                orderId: crypto.randomUUID(),
                userId,
                side: liquidationSide,
                type: "market",
                price: null,
                qty: p.qty,
                filledQty: 0,
                status: "open",
                fills: [],
                createdAt: Date.now()
            }

            if(p.liquidationPrice <= latestPrice && p.side === "short"){
                matchMarketLong(liquidationOrder)
            } 
            else if(p.liquidationPrice >= latestPrice && p.side === "long"){
                matchMarketShort(liquidationOrder)
            }
        })
    }
    )
}
