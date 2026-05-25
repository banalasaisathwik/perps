import type { Request, Response } from "express";
import { createOrderSchema } from "../utlis/zod/engine_controller_validations";
import { sendToEngine } from "../redis/engine-client";

export async function createOrder(req: Request, res: Response) {
  const vaidatePayload = createOrderSchema.safeParse(req.body);

  if (!vaidatePayload.success) {
    throw new Error("failed at structure parsing");
  }

  const { type, side, symbol, qty, leverage } = vaidatePayload.data;
  const price = type === "market" ? null : vaidatePayload.data.price;

  const userId = req.userId;
  if (!userId) {
    throw new Error("Missing authenticated user");
  }

  const message = {
    userId,
    type,
    side,
    symbol,
    price: type === "market" ? null : price,
    qty,
    leverage,
  };

  const engineResponse = await sendToEngine("create_order", message);

  if (engineResponse.ok) {
    res.send(engineResponse.data);
  } else {
    throw new Error(engineResponse.error);
  }
}

export async function getOrder(req: Request, res: Response) {}
