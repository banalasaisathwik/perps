import { createClient } from "redis";
import type {
  EngineCommandType,
  EngineRequest,
  EngineResponse,
} from "../types/engine";
import {
  rejectEngineResponse,
  resolveEngineResponse,
  waitForEngineResponse,
} from "../store/pendingResolve";
import {
  connectRedisClient,
  loadRedisConfig,
} from "../../../shared/redis-config";

const { clientOptions, startupTimeout } = loadRedisConfig();

const publisher = createClient(clientOptions).on("error", (error) =>
  console.error("publisher redis error", error.message),
);
const subscriber = createClient(clientOptions).on(
  "error",
  (error) => console.error("subscriber redis error", error.message),
);
export type RedisClient = typeof subscriber;

const engineCommandStream =
  process.env.REDIS_STREAM_ENGINE_COMMANDS ?? "perps:engine:commands";
const engineResponseStream =
  process.env.REDIS_STREAM_ENGINE_RESPONSES ?? "perps:engine:responses";

export async function connectRedis() {
  await Promise.all([
    connectRedisClient(publisher, "Redis command publisher", startupTimeout),
    connectRedisClient(subscriber, "Redis response subscriber", startupTimeout),
  ]);
}

export async function sendToEngine(
  type: EngineCommandType,
  payload: Record<string, unknown>,
): Promise<EngineResponse> {
  const correlationId = crypto.randomUUID();
  const timeoutMs = Number(process.env.ENGINE_TIMEOUT_MS ?? 30000);
  const responsePromise = waitForEngineResponse(correlationId, timeoutMs);
  // Register a rejection handler immediately: Redis XADD might block longer
  // than the response timeout, or fail after we create this promise.
  void responsePromise.catch(() => undefined);

  const message: EngineRequest = {
    correlationId,
    responseQueue: engineResponseStream,
    type,
    payload,
  };

  console.log(`[engine-rpc] publish ${type} correlationId=${correlationId}`);
  try {
    await publisher.xAdd(
      engineCommandStream,
      "*",
      { data: JSON.stringify(message) },
    );
  } catch (error) {
    const publishError =
      error instanceof Error ? error : new Error("Redis command publish failed");
    rejectEngineResponse(correlationId, publishError);
    throw publishError;
  }
  return responsePromise;
}

type RedisStreamReadResponse = Array<{
  name: string;
  messages: Array<{
    id: string;
    message: Record<string, string>;
  }>;
}>;

export async function listenForEngineResponse() {
  const streamName = engineResponseStream;
  // Start from "$" (only responses published from here on). This loop is
  // already running before index.ts calls app.listen(), so no request can
  // reach sendToEngine() before this first xRead is issued - there is no
  // startup race to guard against. Replaying from "0-0" instead would re-read
  // every response ever published on every restart; with no stream trimming
  // in place that backlog only grows, and once replaying it takes longer than
  // ENGINE_TIMEOUT_MS, every request times out even though the engine
  // answered almost instantly (the real response is just stuck behind
  // thousands of old ones the listener insists on re-reading first).
  let lastId = "$";

  for (;;) {
    try {
      const response = (await subscriber.xRead(
        [{ key: streamName, id: lastId }],
        { COUNT: 10, BLOCK: 2000 },
      )) as unknown as RedisStreamReadResponse;

      if (!response || response.length === 0) {
        continue;
      }

      const firstStream = response[0];

      if (!firstStream || !firstStream.messages) {
        continue;
      }

      const messages = firstStream.messages;

      for (const entry of messages) {
        const messageId = entry.id;
        const payload = entry.message;
        lastId = messageId;

        try {
          if (payload.data) {
            const parsedResponse = JSON.parse(payload.data) as EngineResponse;
            console.log(
              `[engine-rpc] response correlationId=${parsedResponse.correlationId} ok=${parsedResponse.ok}`,
            );
            const ownedResponse = resolveEngineResponse(parsedResponse);
            // Only the backend instance that owns the request removes its
            // response. Other replicas may be reading this same stream.
            if (ownedResponse) {
              try {
                await subscriber.xDel(streamName, messageId);
              } catch (error) {
                console.error("Failed to remove handled engine response", error);
              }
            }
          }
        } catch (error) {
          console.error("Invalid engine response or processing error", error);
        }
      }
    } catch (error) {
      console.error("Engine response stream read failed", error);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
}
