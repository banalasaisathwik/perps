import { createClient } from "redis"


const binanceEventClient = createClient({url : process.env.REDIS_URL}).on("error",()=> console.log(""))

const engineQueue = "backend-engine-queue"

await binanceEventClient.connect()

export async function pushToRedis(latestPrice: number, symbol: string) {
    const payload = {
        type: "mark_price",
        latestPrice,
        symbol,
    }
    await binanceEventClient.lPush(engineQueue,JSON.stringify(payload))

}
