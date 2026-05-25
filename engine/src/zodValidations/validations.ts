import {string, z} from'zod'

export const createOrderPayload = z.object({
    userId : z.string(),
    type : z.enum(["limit","market"]),
    side : z.enum(["long","short"]),
    price : z.number().nullable(),
    symbol : z.string(),
    qty : z.number().positive(),
    leverage : z.number().positive()
})

export const liquidationPayload = z.object({
    type : z.literal("mark_price"),
    latestPrice :z.number(),
    symbol : z.string()
})
