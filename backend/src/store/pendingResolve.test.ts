import { expect, test } from "bun:test";
import {
  rejectEngineResponse,
  waitForEngineResponse,
} from "./pendingResolve";

test("a failed Redis publish rejects and clears the pending engine request", async () => {
  const response = waitForEngineResponse("publish-failed", 5_000);
  const error = new Error("Redis command publish failed");

  rejectEngineResponse("publish-failed", error);

  await expect(response).rejects.toBe(error);
});
