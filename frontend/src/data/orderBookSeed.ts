import type { Level } from "../types/dashboard";

export const SYMBOL = "USD_BTC";
export const DISPLAY_SYMBOL = "BTCUSDT";

// Demo fallback book. The backend replaces this with live depth when available,
// but keeping seed levels avoids a blank dashboard during startup or outages.
export const seedBids: Level[] = [
  { price: 67245.5, qty: 0.423 },
  { price: 67245.0, qty: 0.512 },
  { price: 67244.5, qty: 0.268 },
  { price: 67244.0, qty: 0.712 },
  { price: 67243.5, qty: 0.321 },
  { price: 67243.0, qty: 0.15 },
  { price: 67242.5, qty: 0.644 },
  { price: 67242.0, qty: 0.198 },
  { price: 67241.5, qty: 0.64 },
  { price: 67241.0, qty: 0.173 },
  { price: 67240.5, qty: 0.402 },
];

export const seedAsks: Level[] = [
  { price: 67246.0, qty: 0.367 },
  { price: 67246.5, qty: 0.589 },
  { price: 67247.0, qty: 0.274 },
  { price: 67247.5, qty: 0.621 },
  { price: 67248.0, qty: 0.315 },
  { price: 67248.5, qty: 0.201 },
  { price: 67249.0, qty: 0.698 },
  { price: 67249.5, qty: 0.432 },
  { price: 67250.0, qty: 0.185 },
  { price: 67250.5, qty: 0.51 },
  { price: 67251.0, qty: 0.229 },
];
