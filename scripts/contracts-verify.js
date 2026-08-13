#!/usr/bin/env node
// Contract verification for the canonical status artifact: example validity,
// canonical shared shape, human-report shape, documented truth-tools review --input
// command, and sibling drift against the flagship truth-tools contracts.
// Runs without dependencies: node scripts/contracts-verify.js
//
// Supported JSON Schema keywords (draft-2020-12 subset, dependency-free):
//   type (incl. arrays), const, enum, pattern, minLength, maxLength, minItems,
//   maxItems, maxProperties, propertyNames, minimum, required, properties,
//   additionalProperties (false/true), items, anyOf, not, oneOf, default,
//   $ref (local "#/..." and external
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

const REQUIRED_EXAMPLE_FILES = [
  "examples/status-artifact.json",
  "examples/status-artifact-on-track.json"
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
  "Reported Health",
  "Active Health Signals",
  "Current Facts",
  "Unknowns",
  "Blockers",
  "Risks",
  "Evidence Caveats",
  "Decisions Required"
];

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/;
const ISO_RE = DATE_TIME_RE;

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

// The copied canonical schemas intentionally describe the portable wire shape
// without local format keywords. Keep calendar semantics here, but preserve the
// canonical date-or-RFC3339 forms for fields whose schema accepts either form.
function semanticFormatFor(root, path) {
  const id = root?.$id;
  const field = path.slice(path.lastIndexOf("/") + 1);
  if ((id === "https://truth-tools.dev/schemas/status-artifact.schema.json"
    || id === "https://truth-tools.dev/schemas/truth-review.schema.json") && field === "as_of") {
    return "date-or-date-time";
  }
  if (id === "https://truth-tools.dev/schemas/claim.schema.json" && field === "due_at") return "date-or-date-time";
  if (id === "https://truth-tools.dev/schemas/timeline-item.schema.json" && ["start", "end"].includes(field)) return "date";
  return null;
}

function semanticDateError(value, format, path) {
  if (typeof value !== "string") return null;
  if (format === "date-or-date-time") {
    const dateMatch = DATE_RE.exec(value);
    if (dateMatch && isValidCalendarDate(Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3]))) return null;
    const dateTimeMatch = DATE_TIME_RE.exec(value);
    if (dateTimeMatch && isValidDateTimeParts(
      Number(dateTimeMatch[1]), Number(dateTimeMatch[2]), Number(dateTimeMatch[3]),
      Number(dateTimeMatch[4]), Number(dateTimeMatch[5]), Number(dateTimeMatch[6]),
      dateTimeMatch[10] === undefined ? undefined : Number(dateTimeMatch[10]),
      dateTimeMatch[11] === undefined ? undefined : Number(dateTimeMatch[11])
    )) return null;
    return `${path}: ${JSON.stringify(value)} is not a real YYYY-MM-DD date or RFC3339 date-time`;
  }
  if (format === "date") {
    const match = DATE_RE.exec(value);
    return match && isValidCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
      ? null
      : `${path}: ${JSON.stringify(value)} is not a real YYYY-MM-DD date`;
  }
  const match = DATE_TIME_RE.exec(value);
  return match && isValidDateTimeParts(
    Number(match[1]), Number(match[2]), Number(match[3]),
    Number(match[4]), Number(match[5]), Number(match[6]),
    match[10] === undefined ? undefined : Number(match[10]),
    match[11] === undefined ? undefined : Number(match[11])
  )
    ? null
    : `${path}: ${JSON.stringify(value)} is not a real RFC3339 date-time`;
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
  if (schema === false) {
     errors.push(`${path}: value is not allowed`);
     return errors;
  }

  const semanticFormat = semanticFormatFor(root, path);
  const semanticError = semanticFormat && semanticDateError(value, semanticFormat, path);
  if (semanticError) errors.push(semanticError);

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
  const stringLength = typeof value === "string" ? Array.from(value).length : undefined;
  if (typeof schema.minLength === "number" && stringLength !== undefined && stringLength < schema.minLength) {
    errors.push(`${path}: shorter than minLength ${schema.minLength}`);
  }
  if (typeof schema.maxLength === "number" && stringLength !== undefined && stringLength > schema.maxLength) {
    errors.push(`${path}: longer than maxLength ${schema.maxLength}`);
  }
  if (typeof schema.minItems === "number" && Array.isArray(value) && value.length < schema.minItems) {
    errors.push(`${path}: fewer items than minItems ${schema.minItems}`);
  }
  if (typeof schema.maxItems === "number" && Array.isArray(value) && value.length > schema.maxItems) {
    errors.push(`${path}: more items than maxItems ${schema.maxItems}`);
  }
  if (typeof schema.maxProperties === "number" && value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > schema.maxProperties) {
    errors.push(`${path}: more properties than maxProperties ${schema.maxProperties}`);
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
      errors.push(`${path}: ${JSON.stringify(value)} is not a real RFC3339 date-time`);
    }
  }
  if (Array.isArray(schema.oneOf)) {
    const attempts = schema.oneOf.map((alternative) => validateAgainstSchema(value, alternative, root, path));
    if (!attempts.some((attempt) => attempt.length === 0)) {
      const best = attempts.reduce((min, attempt) => (attempt.length < min.length ? attempt : min), attempts[0] || []);
      errors.push(`${path}: does not match any oneOf alternative (${best.slice(0, 2).join("; ")})`);
    }
  }
  if (Array.isArray(schema.anyOf)) {
    const attempts = schema.anyOf.map((alternative) => validateAgainstSchema(value, alternative, root, path));
    if (!attempts.some((attempt) => attempt.length === 0)) {
      const best = attempts.reduce((min, attempt) => (attempt.length < min.length ? attempt : min), attempts[0] || []);
      errors.push(`${path}: does not match any anyOf alternative (${best.slice(0, 2).join("; ")})`);
    }
  }
  if (schema.not && validateAgainstSchema(value, schema.not, root, path).length === 0) {
    errors.push(`${path}: value matches a disallowed schema`);
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
      if (schema.propertyNames && typeof schema.propertyNames === "object") {
        for (const key of Object.keys(value)) {
          errors.push(...validateAgainstSchema(key, schema.propertyNames, root, `${path}/${key}`));
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

const RAW_LIKE_KEY_RE = /(^|_)(content|contents|body|raw|payload|document|description|message|html|markdown|prose|blob|text|data)($|_)/i;
const RAW_LIKE_COMPACT_KEYS = new Set(["rawcontent", "contents"]);
const ALLOWED_SOURCE_RAW_METADATA_KEYS = new Set(["content_hash", "raw_included"]);

function normalizedKey(key) {
  return key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function normalizedCredentialKey(key) {
  return String(key ?? "")
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function isCredentialQueryKey(key) {
  const normalized = normalizedCredentialKey(key);
  const compact = normalized.replaceAll("_", "");
  if (["awsaccesskeyid", "clientassertion", "jwt", "apikey", "xapikey"].includes(compact)) return true;
  if (compact.endsWith("apikey")) return true;
  const segments = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  return segments.some((segment) =>
    ["token", "secret", "auth", "authorization", "password", "signature", "signatures", "sig"].includes(segment)
  ) || (segments.includes("session") && segments.includes("id"));
}

function credentialUrlError(value, path) {
  const text = String(value ?? "").trim();
  const candidates = /^https?:\/\//i.test(text)
    ? [text]
    : text.match(/https?:\/\/[^\s<>()]+/gi) ?? [];
  for (const candidate of candidates) {
    const normalized = candidate.replace(/[.,;:!?]+$/, "");
    let url;
    try {
      url = new URL(normalized);
    } catch {
      continue;
    }
    if (url.username || url.password) return `${path}: URL contains credential userinfo`;
    if ([...url.searchParams.keys()].some((key) => isCredentialQueryKey(key))) {
      return `${path}: URL contains credential-like query parameters`;
    }
    const fragment = url.hash.slice(1);
    const fragmentKeys = String(fragment).split(/[&#;,\s]+/).map((part) => part.split("=", 1)[0]);
    if (fragmentKeys.some((key) => isCredentialQueryKey(key))) {
      return `${path}: URL contains credential-like fragment parameters`;
    }
  }
  return null;
}

function claimState(claim) {
  return claim?.state === undefined ? "active" : claim.state;
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Keep the local review gate aligned with Truth's conditional Claim rules.
// Schema validation cannot express the state/kind-dependent requirements, so
// these findings are deliberately kept separate from the generic schema check.
export function validateActiveClaimRequirements(claims) {
  const findings = [];
  if (!Array.isArray(claims)) return findings;

  claims.forEach((claim, index) => {
    if (claimState(claim) !== "active") return;
    const location = `#/claims/${index}`;
    const id = claim?.id ?? index + 1;
    if (claim?.kind === "blocker") {
      if (!hasText(claim.owner)) {
        findings.push({
          type: "blocker_missing_owner",
          severity: "blocking",
          location,
          message: `Active blocker '${id}' has no accountable owner; add owner and due_at.`
        });
      }
      if (!hasText(claim.due_at)) {
        findings.push({
          type: "blocker_missing_due",
          severity: "blocking",
          location,
          message: `Active blocker '${id}' has no resolution date; add owner and due_at.`
        });
      }
    } else if (claim?.kind === "risk") {
      if (!hasText(claim.owner)) {
        findings.push({
          type: "risk_missing_owner",
          severity: "review",
          location,
          message: `Active risk '${id}' has no accountable owner; add owner and mitigation.`
        });
      }
      if (!hasText(claim.mitigation)) {
        findings.push({
          type: "risk_missing_mitigation",
          severity: "review",
          location,
          message: `Active risk '${id}' has no mitigation; add owner and mitigation.`
        });
      }
    } else if (claim?.kind === "unknown" && !hasText(claim.owner)) {
      findings.push({
        type: "unknown_missing_owner",
        severity: "review",
        location,
        message: `Active unknown '${id}' is actionable but has no owner; assign an owner or explicitly accept it.`
      });
    }
  });
  return findings;
}

function collectSourceRefEntries(value, path, refs, visited) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectSourceRefEntries(entry, `${path}/${index}`, refs, visited));
    return;
  }
  refs.push({ ref: value, path });
}

// Walk the complete timeline collections rather than only their first level.
// This intentionally also visits malformed nested arrays so privacy and
// referential checks are not bypassed before schema validation reports them.
function collectNestedSourceRefs(value, path, refs, visited = new Set()) {
  if (!value || typeof value !== "object") return;
  if (visited.has(value)) return;
  visited.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectNestedSourceRefs(entry, `${path}/${index}`, refs, visited));
    return;
  }
  if (Object.hasOwn(value, "source_refs")) {
    collectSourceRefEntries(value.source_refs, `${path}/source_refs`, refs, visited);
  }
  for (const [key, child] of Object.entries(value)) {
    if (key !== "source_refs") collectNestedSourceRefs(child, `${path}/${key}`, refs, visited);
  }
}

function inspectSourceMetadata(value, path, errors) {
  if (typeof value === "string") {
    const urlError = credentialUrlError(value, path);
    if (urlError) errors.push(urlError);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectSourceMetadata(item, `${path}/${index}`, errors));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    const compact = normalized.replace(/[^a-z0-9]/g, "");
    if ((RAW_LIKE_KEY_RE.test(normalized) || RAW_LIKE_COMPACT_KEYS.has(compact)) && !ALLOWED_SOURCE_RAW_METADATA_KEYS.has(normalized)) {
      errors.push(`${path}/${key}: raw-like source field or metadata is not allowed`);
    }
    inspectSourceMetadata(child, `${path}/${key}`, errors);
  }
}

export function validateArtifactStructure(artifact, options = {}) {
  const { validateHealthConsistency = true, requireHealthAssessment = true } = options;
  const errors = [];
  const sources = Array.isArray(artifact?.sources) ? artifact.sources : [];
  const sourceIds = new Set();
  const duplicateSourceIds = new Set();
  sources.forEach((source, index) => {
    const sourceId = source?.id;
    if (!sourceId) return;
    if (sourceIds.has(sourceId) && !duplicateSourceIds.has(sourceId)) {
      errors.push(`#/sources/${index}/id: duplicate source id '${sourceId}'`);
      duplicateSourceIds.add(sourceId);
    }
    sourceIds.add(sourceId);
  });
  sources.forEach((source, index) => inspectSourceMetadata(source, `#/sources/${index}`, errors));
  const claimIds = new Set();
  const duplicateClaimIds = new Set();
  const claims = Array.isArray(artifact?.claims) ? artifact.claims : [];
  claims.forEach((claim, index) => {
    const claimId = claim?.id;
    if (!claimId) return;
    if (claimIds.has(claimId) && !duplicateClaimIds.has(claimId)) {
      errors.push(`#/claims/${index}/id: duplicate claim id '${claimId}'`);
      duplicateClaimIds.add(claimId);
    }
    claimIds.add(claimId);
  });
  const refs = [];
  collectNestedSourceRefs(artifact?.claims, "#/claims", refs);
  collectNestedSourceRefs(artifact?.health_assessment, "#/health_assessment", refs);
  collectNestedSourceRefs(artifact?.timeline, "#/timeline", refs);
  collectNestedSourceRefs(artifact?.baseline_timeline, "#/baseline_timeline", refs);
  for (const { ref, path } of refs) {
    if (!sourceIds.has(ref?.source_id)) errors.push(`${path}: source_id does not refer to a source`);
    if (typeof ref?.locator !== "string" || ref.locator.trim().length === 0) errors.push(`${path}: locator is required`);
    for (const key of ["locator", "url"]) {
      if (typeof ref?.[key] === "string") {
        const urlError = credentialUrlError(ref[key], `${path}/${key}`);
        if (urlError) errors.push(urlError);
      }
    }
  }
  for (const finding of validateActiveClaimRequirements(claims)) {
    if (finding.severity === "blocking") errors.push(`${finding.location}: ${finding.message}`);
  }
  const health = artifact?.health_assessment;
  if (requireHealthAssessment) {
    if (!health || typeof health.owner !== "string" || health.owner.trim().length === 0) errors.push("#/health_assessment/owner: explicit health owner is required");
    if (!health || typeof health.rationale !== "string" || health.rationale.trim().length === 0) errors.push("#/health_assessment/rationale: explicit health rationale is required");
    if (!health || !Array.isArray(health.source_refs) || health.source_refs.length === 0) errors.push("#/health_assessment/source_refs: explicit health locator reference is required");
  }
  const activeKinds = new Set(claims.filter((claim) => claimState(claim) === "active").map((claim) => claim.kind));
  const claimHealthFloor = activeKinds.has("blocker") ? "blocked"
    : activeKinds.has("risk") || activeKinds.has("unknown") ? "at_risk" : "none";
  if (validateHealthConsistency && health && claimHealthFloor === "blocked" && health.state !== "blocked") {
    errors.push(`#/health_assessment/state: explicit assessment ${health.state || "missing"} is inconsistent with active claims; expected blocked`);
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

  for (const rel of REQUIRED_EXAMPLE_FILES) {
    const artifact = readJson(rel);
    const artifactErrors = [...validateAgainstSchema(artifact, schema), ...validateArtifactStructure(artifact)];
    checks.push({
      name: `${rel} conforms to StatusArtifact v2`,
      ok: artifactErrors.length === 0,
      message: artifactErrors.length === 0 ? "valid" : artifactErrors.slice(0, 5).join("; ")
    });
  }

  // 1. The example conforms to the canonical StatusArtifact contract.
   const errors = [...validateAgainstSchema(example, schema), ...validateArtifactStructure(example)];
  checks.push({
    name: "examples/status-artifact.json conforms to schemas/status-artifact.schema.json",
    ok: errors.length === 0,
    message: errors.length === 0 ? "valid" : errors.slice(0, 5).join("; ")
  });

  // 2. The example carries the canonical shared shape.
  const canonicalShape = [
    ["kind is status_artifact", () => example.kind === "status_artifact"],
    ["schema_version is 2.0.0", () => example.schema_version === "2.0.0"],
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
       example.claims.every((claim) => claim.state === undefined || ["active", "superseded", "historical"].includes(claim.state))],
    ["every claim cites source_refs with a locator", () =>
      example.claims.every((claim) =>
        Array.isArray(claim.source_refs) && claim.source_refs.length >= 1
        && claim.source_refs.every((ref) => ref.source_id && ref.locator))],
    ["health assessment is explicit and source-backed", () =>
      ["blocked", "on_track", "at_risk", "unknown"].includes(example.health_assessment?.state)
      && example.health_assessment.owner
      && example.health_assessment.rationale
      && Array.isArray(example.health_assessment.source_refs)
      && example.health_assessment.source_refs.length > 0],
    ["artifact demonstrates a blocked program (active blocker)", () =>
       example.claims.some((claim) => claim.kind === "blocker" && claimState(claim) === "active")],
    ["blocked example includes blocker owner, due date, rationale, and ref", () => {
       const blocker = example.claims.find((claim) => claim.kind === "blocker" && claimState(claim) === "active");
      return Boolean(blocker?.owner && blocker?.due_at && blocker?.text && blocker.source_refs?.length);
    }]
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
    ["explicit health reasoning", () => /health/i.test(report) && /owner/i.test(report) && /rationale/i.test(report)],
    ["health signals compare blockers, risks, and unknowns", () => /blocker/i.test(report) && /risk/i.test(report) && /unknown/i.test(report)],
    ["facts separated from inferences and unknowns", () => report.includes("## Current Facts") && report.includes("## Unknowns")],
    ["evidence caveats", () => report.includes("## Evidence Caveats") && /source|evidence/i.test(report)],
    ["decisions required", () => report.includes("## Decisions Required")]
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

  // 6. Sibling drift: the shipped shared schemas must stay byte-identical to the
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
      id/type/observed_at, explicit health_assessment, and reviewed claims with
      states and locator-bearing source_refs, including an active blocker.
  3. The example artifact carries none of the bespoke machine fields; richer TPM
     methodology (system-vs-functional status, facts/inferences, source
     hierarchy, connector caveats, dependencies, write confirmation) lives in
     the human report and methodology docs.
   4. examples/status-report.md shape: Reported Health, Active Health Signals,
      Current Facts, Blockers, Risks, Unknowns, Evidence Caveats, Decisions
      Required sections and the 'truth-tools review --input' command.
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
