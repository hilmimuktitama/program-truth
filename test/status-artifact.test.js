import test from "node:test";
import assert from "node:assert/strict";

import { loadContractArtifacts, validateAgainstSchema, verifyContracts, isValidCalendarDate } from "../scripts/contracts-verify.js";
import { runDriftCheck } from "../scripts/check-syntax.js";

const { schema, example } = loadContractArtifacts();

test("example status artifact conforms to the canonical StatusArtifact schema", () => {
  const errors = validateAgainstSchema(example, schema);
  assert.deepEqual(errors, []);
});

test("example artifact carries the canonical shared shape", () => {
  assert.equal(example.kind, "status_artifact");
  assert.equal(example.schema_version, "1.0.0");
  assert.match(example.as_of, /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2}))?$/);
  assert.equal(typeof example.initiative.name, "string");
  assert.equal(typeof example.policy.max_observation_age_days, "number");
  assert.equal(typeof example.policy.max_source_content_age_days, "number");
  assert.ok(example.sources.length >= 1);
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

test("schemas are byte-identical to sibling canonical contracts or skip cleanly", () => {
  const drift = runDriftCheck();
  assert.ok(drift.length >= 4);
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
