#!/usr/bin/env node
// Deterministic local release smoke for the shipped StatusArtifact example.
// This validates the same externally visible result expected from Truth Tools:
// artifact_quality=pass and program_health=blocked. It has no network or sibling
// repository dependency, so release verification cannot silently skip it.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateAgainstSchema, validateArtifactStructure, validateActiveClaimRequirements } from "./contracts-verify.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function reviewArtifact(artifact) {
  const schema = JSON.parse(readFileSync(resolve(ROOT, "schemas/status-artifact.schema.json"), "utf8"));
  const schemaErrors = validateAgainstSchema(artifact, schema).filter((error) =>
    !(artifact.health_assessment === undefined && error === "#: missing required property health_assessment")
  );
  const structureErrors = validateArtifactStructure(artifact, {
    validateHealthConsistency: false,
    requireHealthAssessment: artifact.health_assessment !== undefined
  });
  const errors = [...schemaErrors, ...structureErrors];
  const claimFindings = validateActiveClaimRequirements(artifact.claims);
  const activeClaims = Array.isArray(artifact.claims)
    ? artifact.claims.filter((claim) => (claim.state ?? "active") === "active")
    : [];
  const hasBlocker = activeClaims.some((claim) => claim.kind === "blocker");
  const hasRiskSignal = activeClaims.some((claim) => claim.kind === "risk" || claim.kind === "unknown");
  const hasFact = activeClaims.some((claim) => claim.kind === "fact");
  const claimHealthFloor = hasBlocker ? "blocked" : hasRiskSignal ? "at_risk" : "none";
  const allowedHealth = new Set(["on_track", "at_risk", "blocked", "unknown"]);
  const reportedProgramHealth = allowedHealth.has(artifact.health_assessment?.state)
    ? artifact.health_assessment.state
    : null;
  const healthFindings = [];
  let healthConsistency = reportedProgramHealth ? "consistent" : "missing";
  if (artifact.health_assessment === undefined) {
    healthFindings.push({
      type: "missing_health_assessment",
      severity: "review",
      location: "health_assessment",
      message: "Add an explicit health assessment; facts alone do not establish on_track health."
    });
  }
  if (hasBlocker && reportedProgramHealth && reportedProgramHealth !== "blocked") {
    healthConsistency = "conflicting";
    healthFindings.push({
      type: "health_assessment_conflicts_with_blocker",
      severity: "blocking",
      location: "health_assessment.state",
      message: `Reported health '${reportedProgramHealth}' conflicts with an active blocker; final health is blocked.`
    });
  } else if (!hasBlocker && hasRiskSignal && ["on_track", "unknown"].includes(reportedProgramHealth)) {
    healthConsistency = "understated";
    healthFindings.push({
      type: "health_assessment_understates_active_signals",
      severity: "review",
      location: "health_assessment.state",
      message: `Reported health '${reportedProgramHealth}' understates active blocker, risk, or unknown claims.`
    });
  } else if (reportedProgramHealth === "blocked" && !hasBlocker) {
    healthConsistency = "unsupported";
    healthFindings.push({
      type: "blocked_health_without_blocker_claim",
      severity: "review",
      location: "health_assessment.state",
      message: "Reported blocked health has no active blocker claim; final health remains blocked."
    });
  } else if (reportedProgramHealth === "at_risk" && !hasBlocker && !hasRiskSignal) {
    healthConsistency = "unsupported";
    healthFindings.push({
      type: "at_risk_health_without_supporting_claim",
      severity: "review",
      location: "health_assessment.state",
      message: "Reported at-risk health has no active blocker, risk, or unknown claim; final health remains at_risk."
    });
  }
  // Reported blocked is an explicit stronger assessment. Otherwise the claim
  // floor wins: blockers force blocked, and risks/unknowns force at_risk.
  const programHealth = reportedProgramHealth === "blocked" || claimHealthFloor === "blocked"
    ? "blocked"
    : claimHealthFloor === "at_risk"
      ? "at_risk"
      : hasFact && reportedProgramHealth === "on_track" ? "on_track" : "unknown";
  if (healthFindings.some((finding) => finding.severity === "blocking")) errors.push(...healthFindings.map((finding) => `${finding.location}: ${finding.message}`));
  const reviewFindings = [...claimFindings, ...healthFindings];
  const artifactQuality = errors.length > 0
    ? "fail"
    : reviewFindings.length > 0 ? "needs_review" : "pass";
  return {
    artifact_quality: artifactQuality,
    reported_program_health: reportedProgramHealth,
    claim_health_floor: claimHealthFloor,
    program_health: programHealth,
    health_consistency: healthConsistency,
    findings: { issues: reviewFindings },
    errors
  };
}

export function reviewExampleArtifact() {
  return reviewArtifact(JSON.parse(readFileSync(resolve(ROOT, "examples/status-artifact.json"), "utf8")));
}

export function assertExampleReview() {
  const review = reviewExampleArtifact();
  if (review.artifact_quality !== "pass" || review.program_health !== "blocked" || review.health_consistency !== "consistent") {
    throw new Error(`expected artifact_quality=pass and program_health=blocked; got ${JSON.stringify(review)}`);
  }
  return review;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const review = assertExampleReview();
  console.log(`status-artifact smoke: artifact_quality=${review.artifact_quality} program_health=${review.program_health}`);
}
