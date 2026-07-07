import { Router } from "express";
import { authRouter } from "./auth_routes";
import { engineRouter } from "./engine_routes";
import { botRouter } from "./bot_routes";


export const appRouter = Router()

appRouter.use(authRouter)
appRouter.use(engineRouter)
appRouter.use(botRouter)
