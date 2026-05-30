import {
  POSITIONS,
  type OrderRecord
} from "../store/memory";

import { unlockMargin } from "./unlockMargin";
import { getBalance } from "./getBalance";

export function closeLongPosition(
  order: OrderRecord,
  fillPrice: number,
  qty: number
): number {

  const positions =
    POSITIONS.get(order.userId);

  if (!positions) {
    return 0;
  }

  const longPosition =
    positions.find(
      p =>
        p.symbol === order.symbol &&
        p.side === "long"
    );

  if (!longPosition) {
    return 0;
  }

  const qtyToClose =
    Math.min(
      qty,
      longPosition.qty
    );

  const ratio =
    qtyToClose /
    longPosition.qty;

  const marginToUnlock =
    longPosition.margin *
    ratio;

  const pnl =
    (
      fillPrice -
      longPosition.averagePrice
    ) *
    qtyToClose;

  unlockMargin(
    order.userId,
    marginToUnlock
  );

  getBalance(
    order.userId
  ).available += pnl;

  longPosition.qty -= qtyToClose;

  longPosition.margin -=
    marginToUnlock;

  if (
    longPosition.qty === 0
  ) {

    positions.splice(
      positions.indexOf(
        longPosition
      ),
      1
    );
  }

  return qtyToClose;
}