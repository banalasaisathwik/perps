import { createClient } from "redis"


const binanceEventClient = createClient({url : process.env.REDIS_URL}).on("error",()=> console.log(""))

const markPriceStream = process.env.REDIS_STREAM_MARK_PRICE ?? "perps:market:mark-price"

await binanceEventClient.connect()

export async function pushToRedis(latestPrice: number, symbol: string) {
    const payload = {
        type: "mark_price",
        latestPrice,
        symbol,
    }
    await binanceEventClient.xAdd(markPriceStream, "*", { data: JSON.stringify(payload) })

}
