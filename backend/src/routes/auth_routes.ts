import { Router } from "express";
import { asyncHandler } from "../utlis/asyncHandler";
import { signin, signup } from "../controllers/auth_controller";

export const authRouter = Router()

authRouter.post('/signin',asyncHandler(signin))
authRouter.post('/signup',asyncHandler(signup))