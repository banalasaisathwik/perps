import type { OrderRequest } from "..";
import { MARK_PRICES } from "../store/memory";
import { getDepthPayload } from "../zodValidations/validations";

export function getMarkPrice(message: OrderRequest) {
  const parsedPayload = getDepthPayload.safeParse(message.payload);
  if (!parsedPayload.success) throw new Error("Get Mark Price Payload structure issue");
  const symbol = parsedPayload.data.symbol;
  return { symbol, markPrice: MARK_PRICES.get(symbol) ?? null };
}
