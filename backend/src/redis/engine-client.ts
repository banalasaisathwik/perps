import { createClient } from "redis";
import type { EngineCommandType, EngineRequest, EngineResponse } from "../types/engine";
import { resolveEngineResponse, waitForEngineResponse } from "../store/pendingResolve";

const publisher = createClient({ url: process.env.REDIS_URL }).on("error", () => console.log("publisher redis error"))
const subscriber = createClient({ url: process.env.REDIS_URL }).on("error", () => console.log("subscriber redis error"))

const enginequeue = process.env.ENGINE_QUEUE ?? "backend-engine-queue"
const backendQueue = process.env.BACKEND_QUEUE_ID ?? "backend1"

export async function connectRedis() {
  await Promise.all([publisher.connect(), subscriber.connect()])
}

export async function sendToEngine(type: EngineCommandType, payload: Record<string, unknown>,
): Promise<EngineResponse> {

  const correlationId = crypto.randomUUID()
  const responsePromise = waitForEngineResponse(correlationId, 300000);

  const message: EngineRequest = {
    correlationId,
    responseQueue: backendQueue,
    type,
    payload,
  }

  await publisher.lPush(enginequeue, JSON.stringify(message))
  return responsePromise
}


export async function listenForEngineResponse() {
  for (;;) {
    const payload = await subscriber.brPop(backendQueue, 0)
    if (!payload) continue;

    try {
      const parsedResponse = JSON.parse(payload.element) as EngineResponse;
      resolveEngineResponse(parsedResponse);
    } catch (error) {
      console.error("Invalid engine response", error);
    }
  }
}