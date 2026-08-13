#!/usr/bin/env node
// Syntax, JSON, and schema-drift checks for the program-truth package.
// Runs without dependencies: node scripts/check-syntax.js
//
// The shipped shared schemas in schemas/ are byte-exact copies of the flagship
// canonical files in the sibling truth-tools repository
// (packages/contracts/schemas/). When the sibling repository is present
// next to this package (or pointed at by PROGRAM_TRUTH_SIBLING_TRUTH_TOOLS),
// this script compares every parsed copy against the canonical file and fails
// on any drift. Without the sibling, the copies are checked for parseability
// and sanity only.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IGNORED_DIRS = new Set(["node_modules", ".git", ".DS_Store"]);
const JS_DIRS = ["bin", "lib", "scripts", "test"];
const SCHEMA_DIR = "schemas";

// The canonical contract files this package ships, and the matching sibling
// filenames they must be byte-identical to.
const EXACT_SCHEMAS = [
  "schemas/source.schema.json",
  "schemas/source-ref.schema.json",
  "schemas/claim.schema.json",
  "schemas/status-artifact.schema.json",
  "schemas/health-assessment.schema.json",
  "schemas/timeline-item.schema.json",
  "schemas/truth-review.schema.json"
];

function toPosix(path) {
  return path.split(sep).join("/");
}

function walkFiles(root) {
  const files = [];
  function walk(current) {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  walk(root);
  return files;
}

function jsonParseOrNull(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function syntaxCheck(files) {
  const checks = [];
  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    checks.push({
      name: `syntax ${toPosix(relative(ROOT, file))}`,
      ok: result.status === 0,
      message: result.status === 0 ? "ok" : (result.stderr || result.stdout || "parse failed").trim().split("\n").slice(-2).join(" ")
    });
  }
  return checks;
}

function jsonChecks(files) {
  const checks = [];
  for (const file of files) {
    const parsed = jsonParseOrNull(file);
    checks.push({
      name: `json ${toPosix(relative(ROOT, file))}`,
      ok: parsed !== null,
      message: parsed !== null ? "parses" : "invalid JSON"
    });
  }
  return checks;
}

function schemaSanityChecks(schemaFiles) {
  const checks = [];
  for (const file of schemaFiles) {
    const parsed = jsonParseOrNull(file);
    if (!parsed) continue;
    const ok = typeof parsed === "object"
      && typeof parsed.$schema === "string"
      && parsed.type === "object"
      && parsed.properties && typeof parsed.properties === "object";
    checks.push({
      name: `schema ${toPosix(relative(ROOT, file))}`,
      ok,
      message: ok ? "valid schema document" : "missing $schema, root type, or properties"
    });
    if (ok && (file.endsWith("source.schema.json") || file.endsWith("source-ref.schema.json"))) {
      for (const field of ["observed_at", "source_updated_at"]) {
        const property = parsed.properties[field];
        const formatOk = property?.format === "date-time";
        checks.push({
          name: `schema ${toPosix(relative(ROOT, file))} ${field} format`,
          ok: formatOk,
          message: formatOk ? "date-time" : "missing date-time format"
        });
      }
    }
  }
  return checks;
}

// The sibling truth-tools repository, when present. Resolution order:
//   1. PROGRAM_TRUTH_SIBLING_TRUTH_TOOLS env var (path to the truth-tools repo root)
//   2. <workspace>/truth-tools next to this package
export function findSiblingContractsDir() {
  const candidates = [];
  if (process.env.PROGRAM_TRUTH_SIBLING_TRUTH_TOOLS) {
    candidates.push(resolve(process.env.PROGRAM_TRUTH_SIBLING_TRUTH_TOOLS, "packages", "contracts", "schemas"));
  }
  candidates.push(resolve(ROOT, "..", "truth-tools", "packages", "contracts", "schemas"));
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "status-artifact.schema.json"))) return candidate;
  }
  return null;
}

export function runDriftCheck() {
  const checks = [];
  const siblingDir = findSiblingContractsDir();
  if (!siblingDir) {
    for (const file of EXACT_SCHEMAS) {
      checks.push({
        name: `drift ${file}`,
        ok: true,
        message: "skipped (sibling truth-tools not found; copies still parse and pass sanity checks)"
      });
    }
    return checks;
  }
  for (const file of EXACT_SCHEMAS) {
    const siblingPath = join(siblingDir, file.split("/").pop());
    const localBytes = readFileSync(join(ROOT, file));
    const siblingBytes = existsSync(siblingPath) ? readFileSync(siblingPath) : null;
    const exact = siblingBytes !== null && localBytes.equals(siblingBytes);
    checks.push({
      name: `drift ${file}`,
      ok: exact,
      message: exact
        ? "matches sibling canonical schema byte-for-byte"
        : `drifted from sibling canonical schema byte-for-byte (${siblingPath}; local=${localBytes.length} sibling=${siblingBytes?.length ?? 0})`
    });
  }
  return checks;
}

function main() {
  const checks = [];
  const jsFiles = [];
  const jsonFiles = [];
  for (const file of walkFiles(ROOT)) {
    if (file.endsWith(".js") && JS_DIRS.some((dir) => toPosix(relative(ROOT, file)).startsWith(`${dir}/`))) {
      jsFiles.push(file);
    }
    if (file.endsWith(".json") && !toPosix(relative(ROOT, file)).includes("package-lock.json")) {
      jsonFiles.push(file);
    }
  }
  checks.push(...syntaxCheck(jsFiles));
  checks.push(...jsonChecks(jsonFiles));
  checks.push(...schemaSanityChecks(jsonFiles.filter((file) => toPosix(relative(ROOT, file)).startsWith(`${SCHEMA_DIR}/`))));
  checks.push(...runDriftCheck());
  const failed = checks.filter((check) => !check.ok);
  for (const check of checks) {
    console.log(`${check.ok ? "ok" : "fail"} - ${check.name}: ${check.message}`);
  }
  console.log(`\ncheck: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exitCode = 1;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
