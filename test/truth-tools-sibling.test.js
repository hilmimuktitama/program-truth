import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findSiblingContractsDir } from "../scripts/check-syntax.js";

// Optional real sibling integration test. When the truth-tools repository is
// present next to this package (or pointed at with
// PROGRAM_TRUTH_SIBLING_TRUTH_TOOLS), this test runs the actual sibling
// `truth-tools review` engine against the shipped example artifact and asserts
// artifact_quality "pass" with program_health "blocked". When the sibling is
// absent, the test passes with an explicit skip — the package never depends on
// truth-tools at runtime or install time.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function findSiblingReviewCli() {
  const contractsDir = findSiblingContractsDir();
  if (!contractsDir) return null;
  const candidate = resolve(contractsDir, "..", "..", "..", "bin", "truth-tools.js");
  try {
    const probe = spawnSync(process.execPath, [candidate, "--version"], { encoding: "utf8" });
    if (probe.status === 0) return candidate;
  } catch {
    // fall through
  }
  return null;
}

const siblingCli = findSiblingReviewCli();

test("example artifact reviews pass + blocked in sibling Truth Tools", { skip: !siblingCli && "sibling truth-tools not found; skipped" }, () => {
  assert.ok(siblingCli, "sibling truth-tools CLI must exist to run this test");
  const result = spawnSync(
    process.execPath,
    [siblingCli, "review", "--input", join(ROOT, "examples", "status-artifact.json"), "--format", "json"],
    { encoding: "utf8" }
  );
  assert.equal(result.status, 0, `review failed: ${result.stderr || result.stdout}`);
  const review = JSON.parse(result.stdout);
  assert.equal(review.kind, "truth_review");
  assert.equal(review.artifact_quality, "pass", "artifact must review clean");
  assert.equal(review.program_health, "blocked", "program health must be blocked (active blocker)");
  assert.equal(review.summary.issues, 0);
  assert.equal(review.summary.deprecations, 0);
  assert.equal(review.summary.conflicts, 0);
});
