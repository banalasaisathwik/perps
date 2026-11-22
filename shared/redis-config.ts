type Environment = Record<string, string | undefined>;

interface ConnectableRedisClient {
  connect(): Promise<unknown>;
  destroy(): void;
}

function positiveInteger(
  env: Environment,
  name: string,
  fallback: number,
): number {
  const value = Number.parseInt(env[name] ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function loadRedisConfig(env: Environment = process.env) {
  const url = env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is required");
  }

  const connectTimeout = positiveInteger(env, "REDIS_CONNECT_TIMEOUT_MS", 5_000);
  const startupTimeout = positiveInteger(
    env,
    "REDIS_STARTUP_TIMEOUT_MS",
    15_000,
  );
  const streamMaxLength = positiveInteger(
    env,
    "REDIS_STREAM_MAX_LENGTH",
    1_000,
  );

  return {
    clientOptions: {
      url,
      socket: {
        connectTimeout,
        reconnectStrategy(retries: number) {
          return Math.min(250 * 2 ** retries, 3_000);
        },
      },
    },
    startupTimeout,
    eventStreamAddOptions: {
      TRIM: {
        strategy: "MAXLEN" as const,
        strategyModifier: "=" as const,
        threshold: streamMaxLength,
      },
    },
  };
}

export async function connectRedisClient(
  client: ConnectableRedisClient,
  name: string,
  timeoutMs: number,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${name} did not connect within ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  try {
    await Promise.race([client.connect(), timeoutPromise]);
  } catch (error) {
    client.destroy();
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
