import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { installSkill, doctor, MANIFEST_FILE } from "../lib/install.js";

const ROOT = resolve(".");

function scratch(prefix) {
  return mkdtempSync(join(tmpdir(), `program-truth-install-${prefix}-`));
}

function cleanup(path) {
  rmSync(path, { recursive: true, force: true });
}

test("installSkill creates a managed install with manifest", () => {
  const root = scratch("create");
  const target = join(root, "skill");
  try {
    const result = installSkill({ packageRoot: ROOT, client: "codex", target, packageVersion: "0.1.0" });
    assert.equal(result.status, "created");
    assert.ok(existsSync(join(target, "SKILL.md")));
    const manifest = JSON.parse(readFileSync(join(target, MANIFEST_FILE), "utf8"));
    assert.equal(manifest.packageName, "program-truth");
    assert.equal(manifest.client, "codex");
    assert.ok(manifest.files.includes("SKILL.md"));
    assert.ok(manifest.fileHashes["SKILL.md"]);
  } finally {
    cleanup(root);
  }
});

test("installSkill refuses modified managed target by default", () => {
  const root = scratch("modified");
  const target = join(root, "skill");
  try {
    installSkill({ packageRoot: ROOT, client: "codex", target, packageVersion: "0.1.0" });
    writeFileSync(join(target, "SKILL.md"), "local edit");
    assert.throws(
      () => installSkill({ packageRoot: ROOT, client: "codex", target, packageVersion: "0.1.0" }),
      /Refusing to replace unmanaged/
    );
  } finally {
    cleanup(root);
  }
});

test("installSkill refuses unmanaged target by default", () => {
  const root = scratch("refuse");
  const target = join(root, "skill");
  try {
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "SKILL.md"), "local edit");
    assert.throws(
      () => installSkill({ packageRoot: ROOT, client: "claude", target, packageVersion: "0.1.0" }),
      /Refusing to replace unmanaged/
    );
  } finally {
    cleanup(root);
  }
});

test("installSkill backs up unmanaged target when requested", () => {
  const root = scratch("backup");
  const target = join(root, "skill");
  try {
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "local.md"), "local edit");
    const result = installSkill({ packageRoot: ROOT, client: "codex", target, backup: true, packageVersion: "0.1.0" });
    assert.equal(result.status, "replaced");
    assert.ok(result.backupPath);
    assert.ok(existsSync(result.backupPath));
    assert.ok(existsSync(join(target, "SKILL.md")));
  } finally {
    cleanup(root);
  }
});

test("doctor reports package checks", () => {
  const result = doctor({ packageRoot: ROOT, packageVersion: "0.1.0" });
  assert.ok(result.checks.some((check) => check.name === "Node version"));
  assert.ok(result.checks.some((check) => check.name === "Package file SKILL.md" && check.ok));
});
