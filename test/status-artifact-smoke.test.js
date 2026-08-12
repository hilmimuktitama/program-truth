import test from "node:test";
import assert from "node:assert/strict";

import { assertExampleReview } from "../scripts/status-artifact-smoke.js";

test("shipped example deterministically reviews pass + blocked", () => {
  assert.deepEqual(assertExampleReview(), {
    artifact_quality: "pass",
    program_health: "blocked",
    errors: []
  });
});
