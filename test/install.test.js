import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { installSkill, doctor, MANIFEST_FILE } from "../lib/install.js";

const ROOT = resolve(".");
const BIN = resolve("bin/program-truth.js");

function scratch(prefix) {
  return mkdtempSync(join(tmpdir(), `program-truth-install-${prefix}-`));
}

function cleanup(path) {
  rmSync(path, { recursive: true, force: true });
}

function runCli(args) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8" });
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

test("doctor with isolated targets verifies only those targets", () => {
  const root = scratch("targets");
  try {
    const empty = join(root, "empty");
    const installed = join(root, "installed");
    mkdirSync(empty, { recursive: true });
    installSkill({ packageRoot: ROOT, client: "codex", target: installed, packageVersion: "0.2.1" });

    const before = doctor({ packageRoot: ROOT, packageVersion: "0.2.1", targets: { codex: empty, claude: installed } });
    const emptyCheck = before.checks.find((check) => check.name === "codex installed skill");
    const installedCheck = before.checks.find((check) => check.name === "claude installed skill");
    assert.equal(emptyCheck.ok, false);
    assert.match(emptyCheck.message, /not installed/);
    assert.equal(installedCheck.ok, true);
    assert.match(installedCheck.message, /managed/);
    assert.equal(before.ok, false);
  } finally {
    cleanup(root);
  }
});

test("CLI doctor exit semantics with isolated targets", () => {
  const root = scratch("cli-doctor");
  try {
    const codex = join(root, "codex");
    const claude = join(root, "claude");
    const failing = runCli(["doctor", "--codex-target", codex, "--claude-target", claude]);
    assert.equal(failing.status, 1);
    assert.match(failing.stdout, /fail - codex installed skill/);
    assert.match(failing.stdout, /fail - claude installed skill/);

    const install = runCli(["install", "codex", "--target", codex]);
    assert.equal(install.status, 0);
    const install2 = runCli(["install", "claude", "--target", claude]);
    assert.equal(install2.status, 0);

    const passing = runCli(["doctor", "--codex-target", codex, "--claude-target", claude]);
    assert.equal(passing.status, 0);
    assert.match(passing.stdout, /ok - codex installed skill/);
    assert.match(passing.stdout, /ok - claude installed skill/);
  } finally {
    cleanup(root);
  }
});

test("CLI rejects --target with install all", () => {
  const root = scratch("cli-all");
  try {
    const target = join(root, "skill");
    const result = runCli(["install", "all", "--target", target]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--target cannot be used with install all/);
    assert.equal(existsSync(target), false);
  } finally {
    cleanup(root);
  }
});
