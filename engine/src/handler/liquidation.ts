import type { MarkPriceEvent } from "..";
import { ORDERS, POSITIONS, type OrderRecord } from "../store/memory";
import { closeLongPosition } from "../utils/closeLongPosition";
import { closeShortPosition } from "../utils/closeShortPostion";
import { liquidationPayload } from "../zodValidations/validations";

export function liquidation(message: MarkPriceEvent) {
  const validatedPayload = liquidationPayload.safeParse(message);
  if (!validatedPayload.success) throw new Error("bad structure in liquidation");

  const { latestPrice, symbol } = validatedPayload.data;
  for (const [userId, positions] of POSITIONS.entries()) {
    for (const position of [...positions]) {
      if (position.symbol !== symbol) continue;
      const shouldLiquidate = position.side === "long"
        ? latestPrice <= position.liquidationPrice
        : latestPrice >= position.liquidationPrice;
      if (!shouldLiquidate) continue;

      // A liquidation is a forced mark-price close, deliberately separate
      // from normal market matching so a thin demo book cannot leave a
      // breached position alive or mutate it without a counterparty.
      const liquidationOrder: OrderRecord = {
        orderId: crypto.randomUUID(),
        userId,
        side: position.side === "long" ? "short" : "long",
        type: "market",
        symbol,
        price: latestPrice,
        qty: position.qty,
        leverage: position.leverage,
        filledQty: position.qty,
        status: "filled",
        fills: [],
        reservedMargin: 0,
        createdAt: Date.now(),
      };

      if (position.side === "long") closeLongPosition(liquidationOrder, latestPrice, position.qty);
      else closeShortPosition(liquidationOrder, latestPrice, position.qty);
      ORDERS.set(liquidationOrder.orderId, liquidationOrder);
    }
  }
}
