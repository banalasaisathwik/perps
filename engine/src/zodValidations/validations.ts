import { z} from'zod'

export const createOrderPayload = z.object({
    userId : z.string(),
    type : z.enum(["limit","market"]),
    side : z.enum(["long","short"]),
    price : z.number().nullable(),
    symbol : z.string(),
    qty : z.number().positive(),
    leverage : z.number().positive()
})
export type TypeCraeteOrder = z.infer<typeof createOrderPayload>

export const liquidationPayload = z.object({
    type : z.literal("mark_price"),
    latestPrice :z.number(),
    symbol : z.string()
})

export const getDepthPayload = z.object({
    symbol : z.string().trim().min(1)
})

export const getOrderPayload = z.object({
    userId : z.string(),
    orderId : z.string()
})

export const getUserBalancesPayload = z.object({
    userId : z.string()
})

export const cancelOrderPayload = z.object({
    userId : z.string(),
    orderId : z.string()
})
