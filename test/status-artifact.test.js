import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadContractArtifacts, validateAgainstSchema, validateArtifactStructure, validateActiveClaimRequirements, verifyContracts, isValidCalendarDate } from "../scripts/contracts-verify.js";
import { runDriftCheck } from "../scripts/check-syntax.js";

const { schema, example } = loadContractArtifacts();
const releaseWorkflow = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".github", "workflows", "release.yml"),
  "utf8",
);

test("example status artifact conforms to the canonical StatusArtifact schema", () => {
  const errors = validateAgainstSchema(example, schema);
  assert.deepEqual(errors, []);
});

test("example artifact carries the canonical shared shape", () => {
  assert.equal(example.kind, "status_artifact");
  assert.equal(example.schema_version, "2.0.0");
  assert.match(example.as_of, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/);
  assert.equal(typeof example.initiative.name, "string");
  assert.equal(typeof example.policy.max_observation_age_days, "number");
  assert.equal(typeof example.policy.max_source_content_age_days, "number");
  assert.ok(example.sources.length >= 1);
  assert.equal(example.health_assessment.state, "blocked");
  assert.ok(example.health_assessment.owner);
  assert.ok(example.health_assessment.rationale);
  assert.ok(example.health_assessment.source_refs.length >= 1);
  for (const source of example.sources) {
    assert.ok(source.id && source.type && source.observed_at);
  }
  assert.ok(example.claims.length >= 1);
  for (const claim of example.claims) {
    assert.ok(claim.id && claim.kind && claim.text);
    assert.ok(["active", "superseded", "historical"].includes(claim.state));
    assert.ok(Array.isArray(claim.source_refs) && claim.source_refs.length >= 1);
    for (const ref of claim.source_refs) {
      assert.ok(ref.source_id && ref.locator);
    }
  }
  assert.ok(example.claims.some((claim) => claim.kind === "blocker" && claim.state === "active"));
});

test("example artifact carries none of the bespoke machine fields", () => {
  const bespoke = [
    "data_source", "parent_status", "system_status", "functional_status",
    "component_truth", "write_confirmation", "validation_plan",
    "reporting_window", "artifact_type", "artifact_id", "generated_at", "generated_by"
  ];
  for (const field of bespoke) {
    assert.equal(field in example, false, `example must not carry bespoke field ${field}`);
  }
});

test("acceptance rejects tampered artifacts", () => {
  const unknownField = structuredClone(example);
  unknownField.optimism = "high";
  const extraErrors = validateAgainstSchema(unknownField, schema);
  assert.ok(extraErrors.some((error) => error.includes("optimism")));

  const badKind = structuredClone(example);
  badKind.claims[0].kind = "hypothesis";
  const kindErrors = validateAgainstSchema(badKind, schema);
  assert.ok(kindErrors.some((error) => error.includes("claims/0") && error.includes("hypothesis")));

  const noLocator = structuredClone(example);
  delete noLocator.claims[0].source_refs[0].locator;
  const locatorErrors = validateAgainstSchema(noLocator, schema);
  assert.ok(locatorErrors.some((error) => error.includes("claims/0/source_refs/0") && error.includes("locator")));

  const noObservedAt = structuredClone(example);
  delete noObservedAt.sources[0].observed_at;
  const observedErrors = validateAgainstSchema(noObservedAt, schema);
  assert.ok(observedErrors.some((error) => error.includes("sources/0") && error.includes("observed_at")));

  const badAsOf = structuredClone(example);
  badAsOf.as_of = "next week";
  const asOfErrors = validateAgainstSchema(badAsOf, schema);
  assert.ok(asOfErrors.some((error) => error.includes("as_of")));
});

test("structural validation requires referentially intact health and claim locators", () => {
  const tampered = structuredClone(example);
  tampered.health_assessment.source_refs[0].source_id = "unknown";
  tampered.claims[0].source_refs[0].locator = "https://user:password@example.test/status?token=secret";
  const errors = validateArtifactStructure(tampered);
  assert.ok(errors.some((error) => error.includes("does not refer")));
  assert.ok(errors.some((error) => error.includes("credential")));
});

test("structural validation blocks duplicate source ids", () => {
  const duplicate = structuredClone(example);
  duplicate.sources.push(structuredClone(duplicate.sources[0]));
  const errors = validateArtifactStructure(duplicate);
  assert.ok(errors.some((error) => error.includes("duplicate source id")));
});

test("structural validation blocks duplicate claim ids", () => {
  const duplicate = structuredClone(example);
  duplicate.claims.push(structuredClone(duplicate.claims[0]));
  const errors = validateArtifactStructure(duplicate);
  assert.ok(errors.some((error) => error.includes("duplicate claim id")));
});

test("omitted claim state defaults to active for health consistency", () => {
  const omitted = structuredClone(example);
  omitted.claims[0].state = undefined;
  delete omitted.claims[0].state;
  omitted.claims[0].kind = "blocker";
  omitted.health_assessment.state = "on_track";
  const errors = validateArtifactStructure(omitted);
  assert.ok(errors.some((error) => error.includes("expected blocked")));
});

test("facts with an explicit unknown assessment remain valid unknown", () => {
  const unknown = structuredClone(example);
  unknown.claims = unknown.claims.filter((claim) => claim.kind === "fact");
  unknown.health_assessment.state = "unknown";
  const errors = validateArtifactStructure(unknown);
  assert.equal(errors.some((error) => error.includes("health_assessment/state")), false);
});

test("facts do not force on_track when health assessment is absent", () => {
  const missing = structuredClone(example);
  delete missing.health_assessment;
  const errors = validateArtifactStructure(missing);
  assert.ok(errors.some((error) => error.includes("explicit health owner")));
  assert.equal(errors.some((error) => error.includes("expected on_track")), false);
});

test("credential and raw-key parity rejects AWSAccessKeyId, client_assertion, rawcontent, and contents", () => {
  for (const queryKey of ["AWSAccessKeyId", "client_assertion", "x-api-key", "oauth_signature", "session_id"]) {
    const tampered = structuredClone(example);
    tampered.sources[0].url = `https://example.test/status?${queryKey}=secret`;
    const errors = validateArtifactStructure(tampered);
    assert.ok(errors.some((error) => error.includes("credential-like query parameters")), queryKey);
  }
  for (const rawKey of ["rawcontent", "contents"]) {
    const tampered = structuredClone(example);
    tampered.sources[0].metadata = { [rawKey]: "secret" };
    const errors = validateArtifactStructure(tampered);
    assert.ok(errors.some((error) => error.includes("raw-like source field")), rawKey);
  }
});

test("credential validation trims strings and scans embedded HTTP(S) URLs", () => {
  for (const caveat of [
    "  https://example.test/status?token=secret  ",
    "See https://example.test/status#access_token=secret for details"
  ]) {
    const tampered = structuredClone(example);
    tampered.sources[0].access_caveats = [caveat];
    const errors = validateArtifactStructure(tampered);
    assert.ok(errors.some((error) => error.includes("credential")), caveat);
  }
});

test("health assessment summary/rationale rejects whitespace-only values", () => {
  const tampered = structuredClone(example);
  tampered.health_assessment.rationale = "   ";
  const errors = validateArtifactStructure(tampered);
  assert.ok(errors.some((error) => error.includes("health_assessment/rationale")));
});

test("active claim requirements match Truth severity", () => {
  const artifact = structuredClone(example);
  artifact.claims = [
    { ...artifact.claims[0], id: "blocker", kind: "blocker", owner: "", due_at: "" },
    { ...artifact.claims[0], id: "risk", kind: "risk", owner: "", mitigation: "" },
    { ...artifact.claims[0], id: "unknown", kind: "unknown", owner: " " }
  ];
  const findings = validateActiveClaimRequirements(artifact.claims);
  assert.deepEqual(findings.map(({ type, severity }) => ({ type, severity })), [
    { type: "blocker_missing_owner", severity: "blocking" },
    { type: "blocker_missing_due", severity: "blocking" },
    { type: "risk_missing_owner", severity: "review" },
    { type: "risk_missing_mitigation", severity: "review" },
    { type: "unknown_missing_owner", severity: "review" }
  ]);
  assert.ok(validateArtifactStructure(artifact).some((error) => error.includes("blocker_missing") === false && error.includes("Active blocker 'blocker'")));
});

test("timeline and baseline timeline validate every nested SourceRef", () => {
  const artifact = structuredClone(example);
  artifact.timeline = [{
    id: "current",
    source_refs: [[{
      source_id: "missing-current",
      locator: "https://example.test/current?token=secret"
    }]]
  }];
  artifact.baseline_timeline = [{
    id: "baseline",
    source_refs: [{
      source_id: "missing-baseline",
      locator: "https://user:password@example.test/baseline"
    }]
  }];
  const errors = validateArtifactStructure(artifact);
  assert.ok(errors.some((error) => error.includes("#/timeline/0/source_refs/0/0") && error.includes("does not refer")));
  assert.ok(errors.some((error) => error.includes("#/timeline/0/source_refs/0/0/locator") && error.includes("credential")));
  assert.ok(errors.some((error) => error.includes("#/baseline_timeline/0/source_refs/0") && error.includes("does not refer")));
  assert.ok(errors.some((error) => error.includes("#/baseline_timeline/0/source_refs/0/locator") && error.includes("credential")));
});

test("acceptance requires full RFC3339 timestamps for source metadata", () => {
  const noTime = structuredClone(example);
  noTime.sources[0].observed_at = "2026-08-11";
  const observedErrors = validateAgainstSchema(noTime, schema);
  assert.ok(observedErrors.some((error) => error.includes("sources/0") && error.includes("observed_at")));

  const refNoTime = structuredClone(example);
  refNoTime.claims[0].source_refs[0].observed_at = "2026-08-11";
  const refErrors = validateAgainstSchema(refNoTime, schema);
  assert.ok(refErrors.some((error) => error.includes("source_refs/0") && error.includes("observed_at")));
});

test("acceptance validates date-time calendar parts", () => {
  const badDate = structuredClone(example);
  badDate.sources[0].observed_at = "2026-02-30T09:00:00Z";
  const badDateErrors = validateAgainstSchema(badDate, schema);
  assert.ok(badDateErrors.some((error) => error.includes("sources/0") && error.includes("observed_at")));

  const offset = structuredClone(example);
  offset.sources[0].observed_at = "2026-08-11T09:00:00+05:30";
  assert.deepEqual(validateAgainstSchema(offset, schema), []);
});

test("acceptance applies RFC3339 and calendar semantics to all contract dates", () => {
  const badAsOf = structuredClone(example);
  badAsOf.as_of = "2026-02-30T09:00:00Z";
  assert.ok(validateAgainstSchema(badAsOf, schema).some((error) => error.includes("as_of")));

  const dateOnlyAsOf = structuredClone(example);
  dateOnlyAsOf.as_of = "2026-08-11";
  assert.deepEqual(validateAgainstSchema(dateOnlyAsOf, schema), []);

  const badSourceUpdatedAt = structuredClone(example);
  badSourceUpdatedAt.sources[0].source_updated_at = "2026-02-29T09:00:00Z";
  assert.ok(validateAgainstSchema(badSourceUpdatedAt, schema).some((error) => error.includes("source_updated_at")));

  const badDueAt = structuredClone(example);
  badDueAt.claims.find((claim) => claim.kind === "blocker").due_at = "2026-02-30";
  assert.ok(validateAgainstSchema(badDueAt, schema).some((error) => error.includes("due_at")));

  const dueAtDateTime = structuredClone(example);
  dueAtDateTime.claims.find((claim) => claim.kind === "blocker").due_at = "2026-08-18T09:00:00Z";
  assert.deepEqual(validateAgainstSchema(dueAtDateTime, schema), []);

  const badTimeline = structuredClone(example);
  badTimeline.timeline = [{
    id: "timeline-date-check",
    title: "Date check",
    type: "task",
    start: "2026-02-30",
    end: "2026-04-31",
    status: "planned",
    dependencies: [],
    date_derivation: "explicit",
    evidence_grade: "exact",
    evidence_reason: "calendar validation test",
    exact_date_needed: false,
    missing_title: false,
    dangerous_fields: [],
    source_refs: []
  }];
  const timelineErrors = validateAgainstSchema(badTimeline, schema);
  assert.ok(timelineErrors.some((error) => error.includes("timeline/0/start")));
  assert.ok(timelineErrors.some((error) => error.includes("timeline/0/end")));
});

test("acceptance rejects non-scalar claim values", () => {
  const badValue = structuredClone(example);
  badValue.claims[0].value = { nested: true };
  const errors = validateAgainstSchema(badValue, schema);
  assert.ok(errors.some((error) => error.includes("claims/0") && error.includes("oneOf")));
});

test("acceptance validates real calendar dates, not just the shape", () => {
  assert.equal(isValidCalendarDate(2028, 2, 29), true);
  assert.equal(isValidCalendarDate(2026, 2, 29), false);
  assert.equal(isValidCalendarDate(2026, 4, 31), false);
  assert.equal(isValidCalendarDate(2026, 13, 1), false);
});

test("dependency-free schema validation enforces maxItems, maxProperties, propertyNames, and maxLength", () => {
  const tooManyClaims = structuredClone(example);
  tooManyClaims.claims = Array.from({ length: 5001 }, (_, index) => ({ ...example.claims[0], id: `claim-${index}` }));
  assert.ok(validateAgainstSchema(tooManyClaims, schema).some((error) => error.includes("claims") && error.includes("maxItems")));

  const tooManyMetadataProperties = structuredClone(example);
  tooManyMetadataProperties.sources[0].metadata = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`key${index}`, true]));
  assert.ok(validateAgainstSchema(tooManyMetadataProperties, schema).some((error) => error.includes("metadata") && error.includes("maxProperties")));

  const forbiddenMetadataName = structuredClone(example);
  forbiddenMetadataName.sources[0].metadata = { description: "raw content" };
  assert.ok(validateAgainstSchema(forbiddenMetadataName, schema).some((error) => error.includes("description") && error.includes("disallowed")));

  const tooLongClaim = structuredClone(example);
  tooLongClaim.claims[0].text = "x".repeat(4097);
  assert.ok(validateAgainstSchema(tooLongClaim, schema).some((error) => error.includes("claims/0/text") && error.includes("maxLength")));
});

test("schemas are byte-identical to sibling canonical contracts or skip cleanly", () => {
  const drift = runDriftCheck();
  assert.ok(drift.length >= 7);
  for (const check of drift) {
    assert.equal(check.ok, true, check.message);
  }
});

test("contract verification suite passes", () => {
  const checks = verifyContracts();
  for (const check of checks) {
    assert.equal(check.ok, true, `${check.name}: ${check.message}`);
  }
});

test("release workflow is hardened to the canonical tag commit", () => {
  assert.match(releaseWorkflow, /fetch-depth:\s*0/);
  assert.match(releaseWorkflow, /canonical v-prefixed semver tag/);
  assert.match(releaseWorkflow, /git rev-parse HEAD/);
  assert.match(releaseWorkflow, /git rev-parse \"\$\{RELEASE_REF\}\^\{commit\}\"/);
  assert.match(releaseWorkflow, /npm pkg get version/);
  assert.match(releaseWorkflow, /npm test/);
  assert.match(releaseWorkflow, /npm run check/);
  assert.match(releaseWorkflow, /npm run contracts:verify/);
  assert.match(releaseWorkflow, /npm run pack:dry-run/);
  assert.match(releaseWorkflow, /TRUTH_TOOLS_VERSION: "0\.4\.0"/);
  assert.match(releaseWorkflow, /status-artifact-on-track\.json/);
});
