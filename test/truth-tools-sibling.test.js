import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findSiblingContractsDir } from "../scripts/check-syntax.js";

// Optional real sibling integration test. When the truth-tools repository is
// present next to this package (or pointed at with
// PROGRAM_TRUTH_SIBLING_TRUTH_TOOLS), this test runs the actual sibling
// `truth-tools review` engine against the shipped blocked and on-track examples
// and asserts artifact_quality "pass" with consistent health. When the sibling is
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

function reviewSiblingArtifact(artifact, name) {
  const directory = mkdtempSync(join(tmpdir(), "program-truth-parity-"));
  const input = join(directory, `${name}.json`);
  writeFileSync(input, JSON.stringify(artifact));
  try {
    const result = spawnSync(process.execPath, [siblingCli, "review", "--input", input, "--format", "json"], { encoding: "utf8" });
    assert.equal(result.status, 0, `review failed: ${result.stderr || result.stdout}`);
    return JSON.parse(result.stdout);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("blocked example reviews pass + blocked + consistent in sibling Truth Tools", { skip: !siblingCli && "sibling truth-tools not found; skipped" }, () => {
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
  assert.equal(review.health_consistency, "consistent");
});

test("on-track example reviews pass + on_track + consistent in sibling Truth Tools", { skip: !siblingCli && "sibling truth-tools not found; skipped" }, () => {
  assert.ok(siblingCli);
  const result = spawnSync(process.execPath, [siblingCli, "review", "--input", join(ROOT, "examples", "status-artifact-on-track.json"), "--format", "json"], { encoding: "utf8" });
  assert.equal(result.status, 0, `review failed: ${result.stderr || result.stdout}`);
  const review = JSON.parse(result.stdout);
  assert.equal(review.artifact_quality, "pass");
  assert.equal(review.program_health, "on_track");
  assert.equal(review.health_consistency, "consistent");
});

test("risk and unknown examples match conservative sibling health resolution", { skip: !siblingCli && "sibling truth-tools not found; skipped" }, () => {
  assert.ok(siblingCli);
  const onTrack = JSON.parse(readFileSync(join(ROOT, "examples", "status-artifact-on-track.json"), "utf8"));
  for (const kind of ["risk", "unknown"]) {
    const artifact = structuredClone(onTrack);
    artifact.claims[0].kind = kind;
    artifact.health_assessment.state = "at_risk";
    if (kind === "risk") {
      artifact.claims[0].owner = "Program Operator";
      artifact.claims[0].mitigation = "Track the remaining release evidence.";
    }
    const review = reviewSiblingArtifact(artifact, kind);
    assert.equal(review.artifact_quality, kind === "risk" ? "pass" : "needs_review");
    assert.equal(review.claim_health_floor, "at_risk");
    assert.equal(review.program_health, kind === "unknown" ? "at_risk" : "at_risk");
    assert.equal(review.health_consistency, "consistent");
  }
});

test("explicit unknown health with active risk matches sibling understated-health review", { skip: !siblingCli && "sibling truth-tools not found; skipped" }, () => {
  assert.ok(siblingCli);
  const artifact = JSON.parse(readFileSync(join(ROOT, "examples", "status-artifact-on-track.json"), "utf8"));
  artifact.claims[0].kind = "risk";
  artifact.claims[0].owner = "Program Operator";
  artifact.claims[0].mitigation = "Track the remaining release evidence.";
  artifact.health_assessment.state = "unknown";

  const review = reviewSiblingArtifact(artifact, "unknown-health-active-risk");
  assert.equal(review.artifact_quality, "needs_review");
  assert.equal(review.claim_health_floor, "at_risk");
  assert.equal(review.program_health, "at_risk");
  assert.equal(review.health_consistency, "understated");
  assert.equal(review.findings.issues.some((item) => item.type === "health_assessment_understates_active_signals"), true);
});

test("unsupported blocked and at-risk assessments match sibling review findings", { skip: !siblingCli && "sibling truth-tools not found; skipped" }, () => {
  assert.ok(siblingCli);
  const onTrack = JSON.parse(readFileSync(join(ROOT, "examples", "status-artifact-on-track.json"), "utf8"));
  for (const state of ["blocked", "at_risk"]) {
    const artifact = structuredClone(onTrack);
    artifact.health_assessment.state = state;
    const review = reviewSiblingArtifact(artifact, `unsupported-${state}`);
    assert.equal(review.artifact_quality, "needs_review");
    assert.equal(review.program_health, state === "blocked" ? "blocked" : "unknown");
    assert.equal(review.health_consistency, "unsupported");
    assert.equal(review.findings.issues.some((item) => item.type === (state === "blocked"
      ? "blocked_health_without_blocker_claim"
      : "at_risk_health_without_supporting_claim")), true);
  }
});
