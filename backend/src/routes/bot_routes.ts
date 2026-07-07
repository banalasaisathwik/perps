import { Router } from "express";
import { startDummyOrderBot, stopDummyOrderBot, botStatus } from "../dummy/order-bot";

export const botRouter = Router();

botRouter.post("/bot/start", (_req, res) => {
  const r = startDummyOrderBot();
  res.json(r);
});

botRouter.post("/bot/stop", (_req, res) => {
  const r = stopDummyOrderBot();
  res.json(r);
});

botRouter.get("/bot/status", (_req, res) => {
  res.json(botStatus());
});
