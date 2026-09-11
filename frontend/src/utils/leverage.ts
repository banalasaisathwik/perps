import type { Position } from "../types/dashboard";

// Stored `leverage` reflects only the first fill; merges into an existing
// position never update it. Derive the true value from margin instead.
export function effectiveLeverage(position: Pick<Position, "qty" | "averagePrice" | "margin">): number | null {
  if (position.margin <= 0) return null;
  return (position.qty * position.averagePrice) / position.margin;
}

export function formatLeverage(leverage: number | null): string {
  return leverage === null ? "" : `${leverage.toFixed(1).replace(/\.0$/, "")}×`;
}
