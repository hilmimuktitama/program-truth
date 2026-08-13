import test from "node:test";
import assert from "node:assert/strict";

import { assertExampleReview, reviewArtifact } from "../scripts/status-artifact-smoke.js";
import { readFileSync } from "node:fs";

const onTrack = JSON.parse(readFileSync(new URL("../examples/status-artifact-on-track.json", import.meta.url), "utf8"));

test("shipped example deterministically reviews pass + blocked", () => {
  assert.deepEqual(assertExampleReview(), {
    artifact_quality: "pass",
    reported_program_health: "blocked",
    claim_health_floor: "blocked",
    program_health: "blocked",
    health_consistency: "consistent",
    findings: { issues: [] },
    errors: []
  });
});

test("on-track example deterministically reviews pass + on_track", () => {
  assert.deepEqual(reviewArtifact(onTrack), {
    artifact_quality: "pass",
    reported_program_health: "on_track",
    claim_health_floor: "none",
    program_health: "on_track",
    health_consistency: "consistent",
    findings: { issues: [] },
    errors: []
  });
});

test("local smoke resolves active risk and unknown claims conservatively", () => {
  for (const kind of ["risk", "unknown"]) {
    const artifact = structuredClone(onTrack);
    artifact.claims[0].kind = kind;
    artifact.health_assessment.state = "at_risk";
    if (kind === "risk") {
      artifact.claims[0].owner = "Program Operator";
      artifact.claims[0].mitigation = "Track the remaining release evidence.";
    } else {
      artifact.claims[0].owner = "Program Operator";
    }
    const review = reviewArtifact(artifact);
    assert.equal(review.artifact_quality, "pass");
    assert.equal(review.claim_health_floor, "at_risk");
    assert.equal(review.program_health, "at_risk");
    assert.equal(review.health_consistency, "consistent");
  }
});

test("local smoke reports understated risk and unknown health", () => {
  for (const kind of ["risk", "unknown"]) {
    const artifact = structuredClone(onTrack);
    artifact.claims[0].kind = kind;
    artifact.claims[0].owner = "Program Operator";
    if (kind === "risk") artifact.claims[0].mitigation = "Track the remaining release evidence.";
    const review = reviewArtifact(artifact);
    assert.equal(review.artifact_quality, "needs_review");
    assert.equal(review.program_health, "at_risk");
    assert.equal(review.health_consistency, "understated");
    assert.equal(review.findings.issues.find((finding) => finding.type === "health_assessment_understates_active_signals")?.type, "health_assessment_understates_active_signals");
  }
});

test("local smoke matches Truth for explicit unknown health with active risk", () => {
  const artifact = structuredClone(onTrack);
  artifact.claims[0].kind = "risk";
  artifact.claims[0].owner = "Program Operator";
  artifact.claims[0].mitigation = "Track the remaining release evidence.";
  artifact.health_assessment.state = "unknown";
  const review = reviewArtifact(artifact);
  assert.equal(review.artifact_quality, "needs_review");
  assert.equal(review.claim_health_floor, "at_risk");
  assert.equal(review.program_health, "at_risk");
  assert.equal(review.health_consistency, "understated");
  assert.equal(review.findings.issues[0].type, "health_assessment_understates_active_signals");
  assert.deepEqual(review.errors, []);
});

test("local smoke reports unsupported blocked and at-risk assessments", () => {
  for (const state of ["blocked", "at_risk"]) {
    const artifact = structuredClone(onTrack);
    artifact.health_assessment.state = state;
    const review = reviewArtifact(artifact);
    assert.equal(review.artifact_quality, "needs_review");
    assert.equal(review.program_health, state === "blocked" ? "blocked" : "unknown");
    assert.equal(review.health_consistency, "unsupported");
    assert.equal(review.findings.issues[0].type, state === "blocked"
      ? "blocked_health_without_blocker_claim"
      : "at_risk_health_without_supporting_claim");
  }
});

test("local smoke treats missing health as review-level and conservative unknown", () => {
  const artifact = structuredClone(onTrack);
  delete artifact.health_assessment;
  const review = reviewArtifact(artifact);
  assert.equal(review.artifact_quality, "needs_review");
  assert.equal(review.reported_program_health, null);
  assert.equal(review.program_health, "unknown");
  assert.equal(review.health_consistency, "missing");
  assert.equal(review.findings.issues[0].type, "missing_health_assessment");
});

test("local smoke rejects recursive raw-like metadata and credential URLs", () => {
  const raw = structuredClone(onTrack);
  raw.sources[0].metadata = { nested: [{ rawContent: "secret" }] };
  assert.equal(reviewArtifact(raw).artifact_quality, "fail");
  assert.match(reviewArtifact(raw).errors.join("\n"), /raw-like source field/);

  const credential = structuredClone(onTrack);
  credential.sources[0].url = "https://user:password@example.test/status?api_key=secret";
  assert.equal(reviewArtifact(credential).artifact_quality, "fail");
  assert.match(reviewArtifact(credential).errors.join("\n"), /credential/);
});

test("local smoke matches sibling raw-key and credential-query coverage", () => {
  for (const rawKey of ["rawcontent", "contents"]) {
    const raw = structuredClone(onTrack);
    raw.sources[0].metadata = { [rawKey]: "secret" };
    assert.match(reviewArtifact(raw).errors.join("\n"), /raw-like source field/);
  }
  for (const queryKey of ["AWSAccessKeyId", "client_assertion"]) {
    const credential = structuredClone(onTrack);
    credential.sources[0].url = `https://example.test/status?${queryKey}=secret`;
    assert.match(reviewArtifact(credential).errors.join("\n"), /credential/);
  }
});

test("local smoke blocks duplicate source ids", () => {
  const duplicate = structuredClone(onTrack);
  duplicate.sources.push(structuredClone(duplicate.sources[0]));
  const review = reviewArtifact(duplicate);
  assert.equal(review.artifact_quality, "fail");
  assert.match(review.errors.join("\n"), /duplicate source id/);
});

test("local smoke blocks duplicate claim ids", () => {
  const duplicate = structuredClone(onTrack);
  duplicate.claims.push(structuredClone(duplicate.claims[0]));
  const review = reviewArtifact(duplicate);
  assert.equal(review.artifact_quality, "fail");
  assert.match(review.errors.join("\n"), /duplicate claim id/);
});

test("local smoke treats omitted claim state as active", () => {
  const omitted = structuredClone(onTrack);
  delete omitted.claims[0].state;
  const review = reviewArtifact(omitted);
  assert.equal(review.artifact_quality, "pass");
  assert.equal(review.program_health, "on_track");
});

test("local smoke applies conditional claim quality without over-failing review findings", () => {
  const risk = structuredClone(onTrack);
  risk.claims[0].kind = "risk";
  delete risk.claims[0].owner;
  delete risk.claims[0].mitigation;
  risk.health_assessment.state = "at_risk";
  assert.equal(reviewArtifact(risk).artifact_quality, "needs_review");

  const blocker = structuredClone(onTrack);
  blocker.claims[0].kind = "blocker";
  delete blocker.claims[0].owner;
  delete blocker.claims[0].due_at;
  blocker.health_assessment.state = "blocked";
  const blockerReview = reviewArtifact(blocker);
  assert.equal(blockerReview.artifact_quality, "fail");
  assert.match(blockerReview.errors.join("\n"), /Active blocker/);
});

test("local smoke checks nested timeline and baseline SourceRefs", () => {
  const artifact = structuredClone(onTrack);
  artifact.timeline = [{ source_refs: [[{
    source_id: "missing-timeline",
    locator: "https://example.test/timeline?api_key=secret"
  }]] }];
  artifact.baseline_timeline = [{ source_refs: [{
    source_id: "missing-baseline",
    locator: "https://example.test/baseline#access_token=secret"
  }] }];
  const review = reviewArtifact(artifact);
  assert.equal(review.artifact_quality, "fail");
  assert.match(review.errors.join("\n"), /timeline.*does not refer/);
  assert.match(review.errors.join("\n"), /baseline_timeline.*credential/);
});

test("local smoke scans credential URLs embedded in access caveats", () => {
  const credential = structuredClone(onTrack);
  credential.sources[0].access_caveats = ["See  https://example.test/status?token=secret  "];
  const review = reviewArtifact(credential);
  assert.equal(review.artifact_quality, "fail");
  assert.match(review.errors.join("\n"), /credential/);
});

test("local smoke rejects inconsistent health and dangling source references", () => {
  const inconsistent = structuredClone(onTrack);
  inconsistent.health_assessment.state = "blocked";
  inconsistent.claims[0].source_refs[0].source_id = "missing-source";
  const review = reviewArtifact(inconsistent);
  assert.equal(review.artifact_quality, "fail");
  assert.equal(review.health_consistency, "unsupported");
  assert.match(review.errors.join("\n"), /does not refer/);
});
