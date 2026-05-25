import { Router } from "express";
import { authRouter } from "./auth_routes";
import { engineRouter } from "./engine_routes";


export const appRouter = Router()

appRouter.use(authRouter)
appRouter.use(engineRouter)
