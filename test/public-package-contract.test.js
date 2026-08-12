import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RETIRED_FLAG = `--${"artifact"}`;
const DOCUMENTATION_CONTRACT = ["README.md", "SKILL.md", "INSTALL.md"];

function publishedPackageFiles() {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: ROOT, encoding: "utf8" });
  return JSON.parse(output)[0].files.map(({ path }) => path);
}

function packageAllowlist() {
  return JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).files;
}

function isAllowlisted(path) {
  return packageAllowlist().some((entry) => entry.endsWith("/") ? path.startsWith(entry) : path === entry);
}

test("documentation contract files are included by the package allowlist", () => {
  for (const path of DOCUMENTATION_CONTRACT) {
    assert.equal(isAllowlisted(path), true, `${path} must remain in package.json files`);
  }
});

test(`published package files contain no retired truth-tools ${RETIRED_FLAG} flag`, () => {
  const publishedFiles = publishedPackageFiles();
  for (const path of DOCUMENTATION_CONTRACT) {
    assert.ok(publishedFiles.includes(path), `${path} must be present in the published package`);
  }
  const violations = publishedFiles
    .map((path) => ({ path, text: readFileSync(resolve(ROOT, path), "utf8") }))
    .filter(({ text }) => text.includes(RETIRED_FLAG))
    .map(({ path }) => path);
  assert.deepEqual(violations, [], `retired ${RETIRED_FLAG} flag found in published files: ${violations.join(", ")}`);
});
