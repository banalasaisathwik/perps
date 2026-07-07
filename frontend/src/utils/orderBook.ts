import type { Level, LevelWithTotal } from "../types/dashboard";

export function addTotals(levels: Level[]): LevelWithTotal[] {
  // Cumulative total is the running depth at each price level.
  // Example: row 3 total = qty(row 1) + qty(row 2) + qty(row 3).
  return levels.map((level, index) => ({
    ...level,
    total: levels.slice(0, index + 1).reduce((sum, item) => sum + item.qty, 0),
  }));
}

export function getMidPrice(bids: Level[], asks: Level[]) {
  if (!bids[0] || !asks[0]) {
    return "-";
  }

  return ((bids[0].price + asks[0].price) / 2).toFixed(2);
}

export function getSpread(bids: Level[], asks: Level[]) {
  if (!bids[0] || !asks[0]) {
    return "-";
  }

  return (asks[0].price - bids[0].price).toFixed(2);
}
