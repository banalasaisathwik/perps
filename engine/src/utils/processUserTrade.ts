import type { OrderRecord } from "../store/memory";
import { openPosition } from "./openPosition";
import { getBalance } from "./getBalance";
import { closeShortPosition } from "./closeShortPostion";
import { closeLongPosition } from "./closeLongPosition";
import { POSITIONS } from "../store/memory";
import { canFundOpening, settleReservedOpeningMargin } from "./marginReservation";

function tradePreview(order: OrderRecord, qty: number, fillPrice: number) {
  const oppositeSide = order.side === "long" ? "short" : "long";
  const position = (POSITIONS.get(order.userId) ?? []).find(
    (candidate) => candidate.symbol === order.symbol && candidate.side === oppositeSide,
  );
  const closedQty = Math.min(qty, position?.qty ?? 0);
  const openingQty = qty - closedQty;
  const releasedMargin = position && position.qty > 0
    ? (position.margin * closedQty) / position.qty
    : 0;
  const realizedPnl = position
    ? (position.side === "long" ? fillPrice - position.averagePrice : position.averagePrice - fillPrice) * closedQty
    : 0;
  return { openingQty, availableAfterClose: getBalance(order.userId).available + releasedMargin + realizedPnl };
}

export function canProcessUserTrade(order: OrderRecord, qty: number, fillPrice: number): boolean {
  const preview = tradePreview(order, qty, fillPrice);
  return canFundOpening(order, preview.openingQty, fillPrice, preview.availableAfterClose);
}

export function processUserTrade(
  order: OrderRecord,
  qty: number,
  fillPrice: number,
) {
  if (!canProcessUserTrade(order, qty, fillPrice)) {
    throw new Error("balance not sufficient")
  }

  let closedQty = 0
  if(order.side === "long"){
    closedQty = closeShortPosition(order,fillPrice,qty)
  }
  else{
    closedQty = closeLongPosition(order,fillPrice,qty)
  }

  const toOpenQty = qty - closedQty

  const settledMargin = settleReservedOpeningMargin(order, toOpenQty, fillPrice)
  openPosition(order,toOpenQty,settledMargin,fillPrice)
  
}
