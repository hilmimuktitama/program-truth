#!/usr/bin/env node
// Contract verification for the canonical status artifact: example validity,
// canonical shared shape, human-report shape, documented truth-tools review --input
// command, and sibling drift against the flagship truth-tools contracts.
// Runs without dependencies: node scripts/contracts-verify.js
//
// Supported JSON Schema keywords (draft-2020-12 subset, dependency-free):
//   type (incl. arrays), const, enum, pattern, minLength, maxLength, minItems,
//   minimum, required, properties, additionalProperties (false/true), items,
//   oneOf, default, $ref (local "#/..." and external
//   https://truth-tools.dev/schemas/*.schema.json resolved to the local
//   schemas/ copies this package ships)
//
// Formats:
//   date       YYYY-MM-DD on a real calendar date (month 01-12, day valid for
//              the month, leap years handled; e.g. 2028-02-29 is valid,
//              2026-02-30 is not)
//   date-time  ISO-8601 with Z or UTC offset, e.g. 2026-08-11T09:00:00Z
//              (calendar date plus hour 00-23, minute 00-59, second 00-59)
//
// additionalProperties: false is enforced at every object level, including
// nested objects, even when the schema node has no properties declared.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runDriftCheck } from "./check-syntax.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT_SCHEMA_PATH = "schemas/status-artifact.schema.json";
const EXAMPLE_ARTIFACT_PATH = "examples/status-artifact.json";
const EXAMPLE_REPORT_PATH = "examples/status-report.md";
const REVIEW_COMMAND = "truth-tools review --input";
const DOCS_CONTRACT = [
  { file: "README.md", label: "README documents the truth-tools review command" },
  { file: "SKILL.md", label: "SKILL.md documents the truth-tools review command" },
  { file: "INSTALL.md", label: "INSTALL.md documents the truth-tools review command" }
];

// The bespoke machine fields this package previously invented are unsupported
// by the canonical contract. They must live in the human report and
// methodology docs, never in the artifact.
const BESPOKE_ARTIFACT_FIELDS = [
  "data_source",
  "parent_status",
  "system_status",
  "functional_status",
  "component_truth",
  "write_confirmation",
  "validation_plan",
  "reporting_window",
  "artifact_type",
  "artifact_id",
  "generated_at",
  "generated_by"
];

const REPORT_SECTIONS = [
  "Data Source",
  "Summary",
  "Facts",
  "Inferences",
  "Unknowns",
  "Blockers",
  "Risks",
  "Dependencies",
  "Write Confirmation"
];

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2}))?$/;

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
}

export function isValidCalendarDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1 || month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

function isValidDateTimeParts(year, month, day, hour, minute, second, offsetHour, offsetMinute) {
  if (!isValidCalendarDate(year, month, day)) return false;
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59
    && (offsetHour === undefined || (offsetHour >= 0 && offsetHour <= 23 && offsetMinute >= 0 && offsetMinute <= 59));
}

function resolveRef(ref, root) {
  if (!ref.startsWith("#/")) return null;
  const parts = ref.slice(2).split("/");
  let node = root;
  for (const part of parts) {
    if (node === null || typeof node !== "object" || !(part in node)) return null;
    node = node[part];
  }
  return node;
}

// External refs (https://truth-tools.dev/schemas/<file>.schema.json) resolve to
// the local byte-exact copies this package ships, so contract verification is
// self-contained and dependency-free while staying identical to the flagship.
const EXTERNAL_REF_RE = /^https:\/\/truth-tools\.dev\/schemas\/([^/]+)$/;
const EXTERNAL_SCHEMA_CACHE = new Map();

function loadExternalSchema(filename) {
  if (!EXTERNAL_SCHEMA_CACHE.has(filename)) {
    EXTERNAL_SCHEMA_CACHE.set(filename, JSON.parse(readFileSync(join(ROOT, "schemas", filename), "utf8")));
  }
  return EXTERNAL_SCHEMA_CACHE.get(filename);
}

function typeMatches(value, type) {
  if (type === "string") return typeof value === "string";
  if (type === "number") return typeof value === "number";
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "array") return Array.isArray(value);
  if (type === "null") return value === null;
  return true;
}

export function validateAgainstSchema(value, schema, root = schema, path = "#") {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;

  if (typeof schema.$ref === "string") {
    if (schema.$ref.startsWith("#/")) {
      const target = resolveRef(schema.$ref, root);
      if (!target) {
        errors.push(`${path}: unresolvable $ref ${schema.$ref}`);
        return errors;
      }
      return validateAgainstSchema(value, target, root, path);
    }
    const match = EXTERNAL_REF_RE.exec(schema.$ref);
    if (!match) {
      errors.push(`${path}: unresolvable external $ref ${schema.$ref}`);
      return errors;
    }
    const external = loadExternalSchema(match[1]);
    return validateAgainstSchema(value, external, external, path);
  }
  if (schema === true) return errors;

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(value, type))) {
      errors.push(`${path}: expected type ${types.join("|")}`);
    }
  }
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} not in enum ${JSON.stringify(schema.enum)}`);
  }
  if (typeof schema.pattern === "string" && typeof value === "string" && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${path}: does not match pattern ${schema.pattern}`);
  }
  if (typeof schema.minLength === "number" && typeof value === "string" && value.length < schema.minLength) {
    errors.push(`${path}: shorter than minLength ${schema.minLength}`);
  }
  if (typeof schema.maxLength === "number" && typeof value === "string" && value.length > schema.maxLength) {
    errors.push(`${path}: longer than maxLength ${schema.maxLength}`);
  }
  if (typeof schema.minItems === "number" && Array.isArray(value) && value.length < schema.minItems) {
    errors.push(`${path}: fewer items than minItems ${schema.minItems}`);
  }
  if (typeof schema.minimum === "number" && typeof value === "number" && value < schema.minimum) {
    errors.push(`${path}: less than minimum ${schema.minimum}`);
  }
  if (schema.format === "date" && typeof value === "string") {
    const match = DATE_RE.exec(value);
    if (!match || !isValidCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))) {
      errors.push(`${path}: ${JSON.stringify(value)} is not a real YYYY-MM-DD date`);
    }
  }
  if (schema.format === "date-time" && typeof value === "string") {
    const match = DATE_TIME_RE.exec(value);
    if (!match || !isValidDateTimeParts(
      Number(match[1]), Number(match[2]), Number(match[3]),
       Number(match[4]), Number(match[5]), Number(match[6]),
       match[10] === undefined ? undefined : Number(match[10]),
       match[11] === undefined ? undefined : Number(match[11])
    )) {
       errors.push(`${path}: ${JSON.stringify(value)} is not a real ISO-8601 date-time`);
    }
  }
  if (Array.isArray(schema.oneOf)) {
    const attempts = schema.oneOf.map((alternative) => validateAgainstSchema(value, alternative, root, path));
    if (!attempts.some((attempt) => attempt.length === 0)) {
      const best = attempts.reduce((min, attempt) => (attempt.length < min.length ? attempt : min), attempts[0] || []);
      errors.push(`${path}: does not match any oneOf alternative (${best.slice(0, 2).join("; ")})`);
    }
  }

  if (value !== null && typeof value === "object") {
    if (!Array.isArray(value)) {
      if (schema.properties && typeof schema.properties === "object") {
        for (const key of Object.keys(schema.properties)) {
          if (key in value) {
            errors.push(...validateAgainstSchema(value[key], schema.properties[key], root, `${path}/${key}`));
          }
        }
      }
      if (Array.isArray(schema.required)) {
        for (const key of schema.required) {
          if (!(key in value)) errors.push(`${path}: missing required property ${key}`);
        }
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (key === "$schema") continue;
          if (!schema.properties || !(key in schema.properties)) {
            errors.push(`${path}: unexpected property ${key}`);
          }
        }
      }
    }
    if (schema.items) {
      for (let i = 0; i < value.length; i += 1) {
        errors.push(...validateAgainstSchema(value[i], schema.items, root, `${path}/${i}`));
      }
    }
  }
  return errors;
}

function readText(rel) {
  return readFileSync(resolve(ROOT, ...rel.split("/")), "utf8");
}

function readJson(rel) {
  return JSON.parse(readText(rel));
}

export function loadContractArtifacts() {
  return {
    schema: readJson(ARTIFACT_SCHEMA_PATH),
    example: readJson(EXAMPLE_ARTIFACT_PATH),
    report: readText(EXAMPLE_REPORT_PATH)
  };
}

export function verifyContracts() {
  const checks = [];
  const { schema, example, report } = loadContractArtifacts();

  // 1. The example conforms to the canonical StatusArtifact contract.
  const errors = validateAgainstSchema(example, schema);
  checks.push({
    name: "examples/status-artifact.json conforms to schemas/status-artifact.schema.json",
    ok: errors.length === 0,
    message: errors.length === 0 ? "valid" : errors.slice(0, 5).join("; ")
  });

  // 2. The example carries the canonical shared shape.
  const canonicalShape = [
    ["kind is status_artifact", () => example.kind === "status_artifact"],
    ["schema_version is 1.0.0", () => example.schema_version === "1.0.0"],
    ["as_of is a canonical timestamp", () => typeof example.as_of === "string" && ISO_RE.test(example.as_of)],
    ["initiative declares name", () => typeof example.initiative?.name === "string" && example.initiative.name.length >= 1],
    ["policy splits observation age from source-content age", () =>
      Number.isInteger(example.policy?.max_observation_age_days)
      && Number.isInteger(example.policy?.max_source_content_age_days)],
    ["every source has id, type, and observed_at", () =>
      Array.isArray(example.sources) && example.sources.length >= 1
      && example.sources.every((source) => source.id && source.type && source.observed_at)],
    ["every claim is a reviewed Claim with id, kind, and text", () =>
      Array.isArray(example.claims) && example.claims.length >= 1
      && example.claims.every((claim) => claim.id && claim.kind && claim.text)],
    ["every claim carries a state", () =>
      example.claims.every((claim) => ["active", "superseded", "historical"].includes(claim.state))],
    ["every claim cites source_refs with a locator", () =>
      example.claims.every((claim) =>
        Array.isArray(claim.source_refs) && claim.source_refs.length >= 1
        && claim.source_refs.every((ref) => ref.source_id && ref.locator))],
    ["artifact demonstrates a blocked program (active blocker)", () =>
      example.claims.some((claim) => claim.kind === "blocker" && claim.state === "active")]
  ];
  for (const [label, predicate] of canonicalShape) {
    checks.push({
      name: `example artifact carries ${label}`,
      ok: predicate(),
      message: predicate() ? "present" : "missing"
    });
  }

  // 3. The example carries none of the bespoke machine fields; the richer TPM
  //    methodology lives in the human report and methodology docs.
  const bespokePresent = BESPOKE_ARTIFACT_FIELDS.filter((field) => field in example);
  checks.push({
    name: "example artifact carries no bespoke machine fields",
    ok: bespokePresent.length === 0,
    message: bespokePresent.length === 0 ? "clean canonical artifact" : `unsupported fields present: ${bespokePresent.join(", ")}`
  });

  // 4. The human report keeps the richer methodology.
  for (const section of REPORT_SECTIONS) {
    checks.push({
      name: `examples/status-report.md includes ${section}`,
      ok: report.includes(`## ${section}`),
      message: report.includes(`## ${section}`) ? "present" : "missing"
    });
  }
  const methodologyInReport = [
    ["system status vs functional status", () => /system status/i.test(report) && /functional status/i.test(report)],
    ["facts separated from inferences and unknowns", () => report.includes("## Facts") && report.includes("## Inferences") && report.includes("## Unknowns")],
    ["source hierarchy and connector caveats", () => /caveats/i.test(report) && /query level|source hierarchy/i.test(report)],
    ["dependencies", () => report.includes("## Dependencies")],
    ["write confirmation", () => report.includes("## Write Confirmation")]
  ];
  for (const [label, predicate] of methodologyInReport) {
    checks.push({
      name: `examples/status-report.md keeps ${label}`,
      ok: predicate(),
      message: predicate() ? "present" : "missing"
    });
  }
  checks.push({
    name: "examples/status-report.md documents truth-tools review --input command",
    ok: report.includes(REVIEW_COMMAND),
    message: report.includes(REVIEW_COMMAND) ? "present" : "missing"
  });

  // 5. Documentation contract.
  for (const item of DOCS_CONTRACT) {
    const text = readText(item.file);
    checks.push({
      name: item.label,
      ok: text.includes(REVIEW_COMMAND),
      message: text.includes(REVIEW_COMMAND) ? "present" : "missing"
    });
  }

  // 6. Sibling drift: the four shipped schemas must stay byte-identical to the
  //    flagship truth-tools contracts. Skips cleanly when the sibling is absent.
  checks.push(...runDriftCheck());

  return checks;
}

function usage() {
  return `contracts-verify: validate program-truth contract examples and documentation.

Usage:
  node scripts/contracts-verify.js [--help|-h]

Checks performed:
  1. examples/status-artifact.json conforms to schemas/status-artifact.schema.json
     (canonical StatusArtifact; external $refs resolve to the local copies).
  2. The example artifact carries the canonical shared shape: kind/schema_version,
     as_of, initiative, split observation/source-content policy, sources with
     id/type/observed_at, and reviewed claims with states and locator-bearing
     source_refs, including an active blocker (blocked program health).
  3. The example artifact carries none of the bespoke machine fields; richer TPM
     methodology (system-vs-functional status, facts/inferences, source
     hierarchy, connector caveats, dependencies, write confirmation) lives in
     the human report and methodology docs.
  4. examples/status-report.md shape: Data Source, Summary, Facts, Inferences,
     Unknowns, Blockers, Risks, Dependencies, Write Confirmation sections and
      the 'truth-tools review --input' command.
   5. README.md, SKILL.md, and INSTALL.md document the 'truth-tools review --input' command.
  6. Sibling drift: schemas/ are byte-identical to the sibling truth-tools
     canonical contracts when the sibling is present (see check-syntax.js).

Supported JSON Schema keywords (dependency-free draft-2020-12 subset):
  type (incl. arrays), const, enum, pattern, minLength, maxLength, minItems,
  minimum, required, properties, additionalProperties (false, enforced at every
  object level), items, oneOf, $ref (local "#/..." and external
  https://truth-tools.dev/schemas/*.schema.json resolved to the local copies),
  format date / date-time.

Formats:
  date       YYYY-MM-DD on a real calendar date (leap years handled)
      date-time  ISO-8601 with Z or UTC offset, e.g. 2026-08-11T09:00:00Z

Exit code is 0 when every check passes, 1 otherwise.
`;
}

function main() {
  if (process.argv[2] === "--help" || process.argv[2] === "-h") {
    process.stdout.write(usage());
    return;
  }
  const checks = verifyContracts();
  const failed = checks.filter((check) => !check.ok);
  for (const check of checks) {
    console.log(`${check.ok ? "ok" : "fail"} - ${check.name}: ${check.message}`);
  }
  console.log(`\ncontracts:verify: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exitCode = 1;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
