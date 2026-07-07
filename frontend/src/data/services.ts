import type { ServiceNode } from "../types/dashboard";

export const services: ServiceNode[] = [
  { id: "frontend-a", title: "Frontend", tech: "React", lane: "main" },
  { id: "rest", title: "Backend REST API", tech: "Express", lane: "main" },
  {
    id: "commands",
    title: "Redis Commands",
    tech: "perps:engine:commands",
    lane: "main",
  },
  { id: "engine", title: "Engine", tech: "Matching + Risk", lane: "main" },
  {
    id: "events",
    title: "Redis Events",
    tech: "perps:events:orderbook",
    lane: "main",
  },
  { id: "ws", title: "Backend WebSocket", tech: "/ws", lane: "main" },
  {
    id: "frontend-b",
    title: "Frontend",
    tech: "Order book update",
    lane: "main",
  },
  {
    id: "binance",
    title: "Binance Events",
    tech: "mark price stream",
    lane: "support",
  },
];
