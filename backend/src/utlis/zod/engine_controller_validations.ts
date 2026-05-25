import z from 'zod'

export const createOrderSchema = z.discriminatedUnion("type",[
     z.object({
    type: z.literal("limit"),
    side: z.enum(["long", "short"]),
    symbol: z.string().trim().min(1, "symbol is required"),
    price: z.number().positive("limit orders require a positive price"),
    qty: z.number().positive("qty must be a positive number"),
    leverage: z.number().positive("leverage must be a positive number"),
  }),
  z.object({
    type: z.literal("market"),
    side: z.enum(["long", "short"]),
    symbol: z.string().trim().min(1, "symbol is required"),
    price: z.null().optional(),
    qty: z.number().positive("qty must be a positive number"),
    leverage: z.number().positive("leverage must be a positive number"),
  }),

])
