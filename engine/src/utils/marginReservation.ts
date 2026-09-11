import type { OrderRecord } from "../store/memory";
import { POSITIONS } from "../store/memory";
import { getBalance } from "./getBalance";
import { lockMargin } from "./lockMargin";
import { unlockMargin } from "./unlockMargin";

function openingQty(order: OrderRecord, qty: number): number {
  const oppositeSide = order.side === "long" ? "short" : "long";
  const position = (POSITIONS.get(order.userId) ?? []).find(
    (candidate) => candidate.symbol === order.symbol && candidate.side === oppositeSide,
  );
  return Math.max(0, qty - (position?.qty ?? 0));
}

export function reserveLimitOrderMargin(order: OrderRecord): void {
  if (order.type !== "limit" || order.price === null) return;

  const amount = (openingQty(order, order.qty) * order.price) / order.leverage;
  if (amount > 0) lockMargin(order.userId, amount);
  order.reservedMargin = amount;
}

export function releaseOrderReservation(order: OrderRecord): void {
  if (order.reservedMargin <= 0) return;
  unlockMargin(order.userId, order.reservedMargin);
  order.reservedMargin = 0;
}

export function reservationForOpeningFill(order: OrderRecord, openingQuantity: number): number {
  if (openingQuantity <= 0 || order.type !== "limit" || order.price === null) return 0;
  return Math.min(order.reservedMargin, (openingQuantity * order.price) / order.leverage);
}

export function canFundOpening(
  order: OrderRecord,
  openingQuantity: number,
  fillPrice: number,
  availableAfterClose: number,
): boolean {
  if (openingQuantity <= 0) return true;
  const actualMargin = (openingQuantity * fillPrice) / order.leverage;
  const reserved = reservationForOpeningFill(order, openingQuantity);
  return availableAfterClose >= Math.max(0, actualMargin - reserved);
}

export function settleReservedOpeningMargin(
  order: OrderRecord,
  openingQuantity: number,
  fillPrice: number,
): number {
  if (openingQuantity <= 0) return 0;
  const actualMargin = (openingQuantity * fillPrice) / order.leverage;
  const reserved = reservationForOpeningFill(order, openingQuantity);
  order.reservedMargin -= reserved;

  const adjustment = actualMargin - reserved;
  if (adjustment > 0) lockMargin(order.userId, adjustment);
  else if (adjustment < 0) unlockMargin(order.userId, -adjustment);

  return actualMargin;
}

export function availableBalance(userId: string): number {
  return getBalance(userId).available;
}
