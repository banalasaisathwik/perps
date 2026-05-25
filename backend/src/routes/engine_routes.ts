import { Router } from "express";
import { asyncHandler } from "../utlis/asyncHandler";
import { createOrder, getOrder } from "../controllers/engine-controller";
import { requireAuth } from "../middleware/auth";

export const engineRouter = Router()

engineRouter.post("/create-order",requireAuth,asyncHandler(createOrder))
engineRouter.get("/order/:orderId",requireAuth,asyncHandler(getOrder))