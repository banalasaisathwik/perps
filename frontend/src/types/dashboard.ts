export type Level = {
  price: number;
  qty: number;
};

export type LevelWithTotal = Level & {
  total: number;
};

export type OrderType = "limit" | "market";

export type Side = "long" | "short";

export type Flow = "place-order" | "ws-update" | "mark-price" | "idle";

export type ConnectionStatus = "checking" | "connected" | "offline";

export type TimelineEvent = {
  id: number;
  time: string;
  source: string;
  event: string;
  details: string;
};

export type ServiceNode = {
  id: string;
  title: string;
  tech: string;
  lane: "main" | "support";
};
