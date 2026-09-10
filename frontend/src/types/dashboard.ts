export type Level = {
  price: number;
  qty: number;
};

export type LevelWithTotal = Level & {
  total: number;
};

export type OrderType = "limit" | "market";

export type Side = "long" | "short";

export type OrderStatus = "open" | "partially_filled" | "filled" | "cancelled";

export type RecentOrder = {
  side: Side;
  type: OrderType;
  status: OrderStatus;
  requestedPrice: number | null;
  qty: number;
  filledQty: number;
  fillPrices: number[];
};

export type Position = {
  orderId: string;
  symbol: string;
  side: Side;
  qty: number;
  margin: number;
  leverage: number;
  liquidationPrice: number;
  averagePrice: number;
};

export type OpenOrder = {
  orderId: string;
  symbol: string;
  side: Side;
  type: OrderType;
  price: number | null;
  qty: number;
  filledQty: number;
  status: "open" | "partially_filled";
  createdAt: number;
};

export type ArchitectureNode =
  | "client"
  | "backend"
  | "redis"
  | "engine";

export type ArchitectureActivity = {
  kind: "idle" | "manual-request" | "manual-response" | "book-update";
  node: ArchitectureNode | null;
};
export type ConnectionStatus = "checking" | "connected" | "offline";
