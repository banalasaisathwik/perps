import type { Request, Response } from "express";
import { cancelOrderSchema, createOrderSchema, getDepthSchema, getOrderSchema } from "../utlis/zod/engine_controller_validations";
import { sendToEngine } from "../redis/engine-client";

export async function createOrder(req: Request, res: Response) {
  const vaidatePayload = createOrderSchema.safeParse(req.body);

  if (!vaidatePayload.success) {
    throw new Error("failed at structure parsing");
  }

  const { type, side, symbol, qty, leverage } = vaidatePayload.data;
  const price = type === "market" ? null : vaidatePayload.data.price;

  const userId = req.userId || "guest";

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

export async function getOrder(req: Request, res: Response) {
  const validatePayload = getOrderSchema.safeParse(req.params);

  if (!validatePayload.success) {
    throw new Error("failed at structure parsing");
  }

  const userId = req.userId;
  if (!userId) {
    throw new Error("Missing authenticated user");
  }

  const engineResponse = await sendToEngine("get_order", {
    userId,
    orderId: validatePayload.data.orderId,
  });

  if (engineResponse.ok) {
    res.send(engineResponse.data);
  } else {
    throw new Error(engineResponse.error);
  }
}

export async function getDepth(req: Request, res: Response) {
  const validatePayload = getDepthSchema.safeParse(req.params);

  if (!validatePayload.success) {
    throw new Error("failed at structure parsing");
  }

  const engineResponse = await sendToEngine("get_depth", {
    symbol: validatePayload.data.symbol,
  });

  if (engineResponse.ok) {
    res.send(engineResponse.data);
  } else {
    throw new Error(engineResponse.error);
  }
}

export async function getUserBalances(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) {
    throw new Error("Missing authenticated user");
  }

  const engineResponse = await sendToEngine("get_user_balance", {
    userId,
  });

  if (engineResponse.ok) {
    res.send(engineResponse.data);
  } else {
    throw new Error(engineResponse.error);
  }
}

export async function cancelOrder(req: Request, res: Response) {
  const validatePayload = cancelOrderSchema.safeParse(req.params);

  if (!validatePayload.success) {
    throw new Error("failed at structure parsing");
  }

  const userId = req.userId;
  if (!userId) {
    throw new Error("Missing authenticated user");
  }

  const engineResponse = await sendToEngine("cancel_order", {
    userId,
    orderId: validatePayload.data.orderId,
  });

  if (engineResponse.ok) {
    res.send(engineResponse.data);
  } else {
    throw new Error(engineResponse.error);
  }
}
