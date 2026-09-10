import { createClient } from "redis";
import type {
  EngineCommandType,
  EngineRequest,
  EngineResponse,
} from "../types/engine";
import {
  resolveEngineResponse,
  waitForEngineResponse,
} from "../store/pendingResolve";

const publisher = createClient({ url: process.env.REDIS_URL }).on("error", (error) =>
  console.error("publisher redis error", error.message),
);
const subscriber = createClient({ url: process.env.REDIS_URL }).on(
  "error",
  (error) => console.error("subscriber redis error", error.message),
);
export type RedisClient = typeof subscriber;

const engineCommandStream =
  process.env.REDIS_STREAM_ENGINE_COMMANDS ?? "perps:engine:commands";
const engineResponseStream =
  process.env.REDIS_STREAM_ENGINE_RESPONSES ?? "perps:engine:responses";

export async function connectRedis() {
  await Promise.all([publisher.connect(), subscriber.connect()]);
}

export async function sendToEngine(
  type: EngineCommandType,
  payload: Record<string, unknown>,
): Promise<EngineResponse> {
  const correlationId = crypto.randomUUID();
  const timeoutMs = Number(process.env.ENGINE_TIMEOUT_MS ?? 30000);
  const responsePromise = waitForEngineResponse(correlationId, timeoutMs);

  const message: EngineRequest = {
    correlationId,
    responseQueue: engineResponseStream,
    type,
    payload,
  };

  console.log(`[engine-rpc] publish ${type} correlationId=${correlationId}`);
  await publisher.xAdd(engineCommandStream, "*", { data: JSON.stringify(message) });
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
  // Replay retained responses once on startup. Unknown correlation IDs are
  // ignored, while this avoids the "$" startup race where an engine could
  // answer a just-published command before the listener issued its first read.
  let lastId = "0-0";

  for (;;) {
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
          resolveEngineResponse(parsedResponse);
        }
      } catch (error) {
        console.error("Invalid engine response or processing error", error);
      }
    }
  }
}
