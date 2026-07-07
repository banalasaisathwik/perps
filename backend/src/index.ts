import 'dotenv/config'
import express, { type NextFunction,type Request,type Response} from 'express'
import cors from 'cors'
import { appRouter } from './routes'
import { connectRedis, listenForEngineResponse } from './redis/engine-client'
import { attachPriceWebSocket } from './ws/price-websocket'
import { startDummyOrderBot } from './dummy/order-bot'

await connectRedis()
// we have to catch for safety ,it attches to promises and call we something goes bad
void listenForEngineResponse().catch((error) => {
    console.error("engine response listener stopped", error)
})

const app = express()

app.use(cors())
app.use(express.json())

app.get("/health", (_req: Request, res: Response) => {
    res.send({
        ok: true,
        service: "backend",
        ws: "/ws",
        streams: {
            commands: process.env.REDIS_STREAM_ENGINE_COMMANDS ?? "perps:engine:commands",
            responses: process.env.REDIS_STREAM_ENGINE_RESPONSES ?? "perps:engine:responses",
            orderbook: process.env.REDIS_STREAM_ORDERBOOK ?? "perps:events:orderbook",
        },
    })
})

app.use(appRouter)

app.use(ErrorHandler)


function ErrorHandler(err :unknown,_req:Request,res:Response,_next : NextFunction){
    console.log(err)

    res.status(500).send({
        error : (err instanceof Error) ? err.message : "server error"
    })
}

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => {
    console.log(`backend server started ${port}`);
});

attachPriceWebSocket(server)

if (process.env.START_ORDER_BOT === 'true') {
    startDummyOrderBot()
}
