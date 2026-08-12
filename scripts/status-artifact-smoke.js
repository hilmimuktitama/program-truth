#!/usr/bin/env node
// Deterministic local release smoke for the shipped StatusArtifact example.
// This validates the same externally visible result expected from Truth Tools:
// artifact_quality=pass and program_health=blocked. It has no network or sibling
// repository dependency, so release verification cannot silently skip it.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateAgainstSchema } from "./contracts-verify.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function reviewExampleArtifact() {
  const artifact = JSON.parse(readFileSync(resolve(ROOT, "examples/status-artifact.json"), "utf8"));
  const schema = JSON.parse(readFileSync(resolve(ROOT, "schemas/status-artifact.schema.json"), "utf8"));
  const errors = validateAgainstSchema(artifact, schema);
  const activeBlocker = artifact.claims?.some((claim) => claim.kind === "blocker" && claim.state === "active");
  return {
    artifact_quality: errors.length === 0 ? "pass" : "fail",
    program_health: activeBlocker ? "blocked" : "unknown",
    errors
  };
}

export function assertExampleReview() {
  const review = reviewExampleArtifact();
  if (review.artifact_quality !== "pass" || review.program_health !== "blocked") {
    throw new Error(`expected artifact_quality=pass and program_health=blocked; got ${JSON.stringify(review)}`);
  }
  return review;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const review = assertExampleReview();
  console.log(`status-artifact smoke: artifact_quality=${review.artifact_quality} program_health=${review.program_health}`);
}
