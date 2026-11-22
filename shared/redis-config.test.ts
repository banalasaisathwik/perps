import { describe, expect, test } from "bun:test";
import { connectRedisClient, loadRedisConfig } from "./redis-config";

describe("loadRedisConfig", () => {
  test("requires REDIS_URL", () => {
    expect(() => loadRedisConfig({})).toThrow("REDIS_URL is required");
  });

  test("uses bounded streams and capped reconnect delays by default", () => {
    const config = loadRedisConfig({ REDIS_URL: "redis://localhost:6379" });

    expect(config.streamAddOptions.TRIM).toEqual({
      strategy: "MAXLEN",
      strategyModifier: "=",
      threshold: 1_000,
    });
    expect(config.clientOptions.socket.connectTimeout).toBe(5_000);
    expect(config.clientOptions.socket.reconnectStrategy(0)).toBe(250);
    expect(config.clientOptions.socket.reconnectStrategy(8)).toBe(3_000);
    expect(config.startupTimeout).toBe(15_000);
  });

  test("accepts positive deployment overrides and rejects invalid ones", () => {
    const config = loadRedisConfig({
      REDIS_URL: "redis://localhost:6379",
      REDIS_STREAM_MAX_LENGTH: "25",
      REDIS_CONNECT_TIMEOUT_MS: "1200",
      REDIS_STARTUP_TIMEOUT_MS: "3",
    });

    expect(config.streamAddOptions.TRIM.threshold).toBe(25);
    expect(config.clientOptions.socket.connectTimeout).toBe(1_200);
    expect(config.startupTimeout).toBe(3);

    const fallback = loadRedisConfig({
      REDIS_URL: "redis://localhost:6379",
      REDIS_STREAM_MAX_LENGTH: "0",
      REDIS_CONNECT_TIMEOUT_MS: "invalid",
    });
    expect(fallback.streamAddOptions.TRIM.threshold).toBe(1_000);
    expect(fallback.clientOptions.socket.connectTimeout).toBe(5_000);
  });

  test("destroys a client that misses the startup deadline", async () => {
    let destroyed = false;
    const client = {
      connect: () => new Promise(() => undefined),
      destroy: () => {
        destroyed = true;
      },
    };

    await expect(connectRedisClient(client, "test Redis", 5)).rejects.toThrow(
      "test Redis did not connect within 5ms",
    );
    expect(destroyed).toBe(true);
  });
});
