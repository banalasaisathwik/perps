import { expect, test } from "bun:test";
import {
  rejectEngineResponse,
  resolveEngineResponse,
  waitForEngineResponse,
} from "./pendingResolve";

test("a failed Redis publish rejects and clears the pending engine request", async () => {
  const response = waitForEngineResponse("publish-failed", 5_000);
  const error = new Error("Redis command publish failed");

  rejectEngineResponse("publish-failed", error);

  await expect(response).rejects.toBe(error);
});

test("only the owner resolves and acknowledges an engine response", async () => {
  const reply = waitForEngineResponse("owned-request", 5_000);
  const other = { correlationId: "another-request", ok: true };
  const own = { correlationId: "owned-request", ok: true };

  expect(resolveEngineResponse(other)).toBe(false);
  expect(resolveEngineResponse(own)).toBe(true);
  expect(await reply).toEqual(own);
  expect(resolveEngineResponse(own)).toBe(false);
});
