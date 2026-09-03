import type { ServiceNode } from "../types/dashboard";

export const services: ServiceNode[] = [
  { id: "frontend-a", title: "Your trade", tech: "Order details", lane: "main" },
  { id: "rest", title: "Trading service", tech: "Checks your order", lane: "main" },
  {
    id: "commands",
    title: "Order queue",
    tech: "Sends it safely",
    lane: "main",
  },
  { id: "engine", title: "Trade engine", tech: "Matches the order", lane: "main" },
  {
    id: "events",
    title: "Price updates",
    tech: "Keeps prices current",
    lane: "main",
  },
  { id: "ws", title: "Live connection", tech: "Sends results back", lane: "main" },
  {
    id: "frontend-b",
    title: "Your screen",
    tech: "Shows the latest price",
    lane: "main",
  },
  {
    id: "database",
    title: "User database",
    tech: "Postgres: stores accounts for /signup and /signin",
    lane: "support",
  },
  {
    id: "binance",
    title: "Binance",
    tech: "Source of live market prices",
    lane: "support",
  },
  {
    id: "mark-poller",
    title: "Mark Price Poller",
    tech: "Polls Binance, publishes to Redis",
    lane: "support",
  },
];
