import { createClient } from "redis"
import { connectRedisClient, loadRedisConfig } from "../shared/redis-config"


const { clientOptions, startupTimeout, eventStreamAddOptions } = loadRedisConfig()

const binanceEventClient = createClient(clientOptions).on("error", (error) =>
  console.error("Binance mark-price Redis publisher error", error.message),
)

const markPriceStream = process.env.REDIS_STREAM_MARK_PRICE ?? "perps:market:mark-price"

await connectRedisClient(
  binanceEventClient,
  "Redis mark-price publisher",
  startupTimeout,
)

export async function pushToRedis(latestPrice: number, symbol: string) {
    const payload = {
        type: "mark_price",
        latestPrice,
        symbol,
    }
    await binanceEventClient.xAdd(
      markPriceStream,
      "*",
      { data: JSON.stringify(payload) },
      eventStreamAddOptions,
    )

}
