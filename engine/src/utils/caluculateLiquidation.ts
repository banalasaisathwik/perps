import type { Postion } from "../store/memory";

export function caluculateLiquidation(position: Postion): number {
  const marginPerQty = position.margin / position.qty;

  return position.side === "long"
    ? position.averagePrice - marginPerQty
    : position.averagePrice + marginPerQty;
}
