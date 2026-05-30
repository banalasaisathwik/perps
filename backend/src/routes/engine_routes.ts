import { Router } from "express";
import { asyncHandler } from "../utlis/asyncHandler";
import { cancelOrder, createOrder, getDepth, getOrder, getUserBalances } from "../controllers/engine-controller";
import { requireAuth } from "../middleware/auth";

export const engineRouter = Router()

engineRouter.post("/create-order",requireAuth,asyncHandler(createOrder))
engineRouter.get("/order/:orderId",requireAuth,asyncHandler(getOrder))
engineRouter.delete("/order/:orderId",requireAuth,asyncHandler(cancelOrder))
engineRouter.get("/depth/:symbol",asyncHandler(getDepth))
engineRouter.get("/balances",requireAuth,asyncHandler(getUserBalances))
