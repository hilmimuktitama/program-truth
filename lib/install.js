import { accessSync, constants, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

const MANIFEST = ".program-truth-install.json";
const REQUIRED_SKILL_FILES = [
  "SKILL.md",
  "README.md",
  "INSTALL.md",
  "LICENSE",
  "references/framework.md",
  "references/init-bootstrap.md",
  "references/archaeology-workflow.md",
  "references/source-ranking-and-reconciliation.md",
  "references/notion-adapter.md",
  "examples/example-INITIAL-CONTEXT.md",
  "examples/example-WORKSPACE.md"
];
const COPY_ROOTS = ["SKILL.md", "README.md", "INSTALL.md", "LICENSE", "examples", "references"];

function toPosix(path) {
  return path.split(sep).join("/");
}

function walkFiles(root) {
  const files = [];
  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  walk(root);
  return files;
}

function copyRecursive(source, target) {
  const stat = statSync(source);
  if (stat.isDirectory()) {
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      copyRecursive(join(source, entry.name), join(target, entry.name));
    }
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

function packageFiles(packageRoot) {
  const files = [];
  for (const root of COPY_ROOTS) {
    const source = join(packageRoot, root);
    if (!existsSync(source)) continue;
    if (statSync(source).isDirectory()) {
      for (const file of walkFiles(source)) files.push(toPosix(relative(packageRoot, file)));
    } else {
      files.push(root);
    }
  }
  return files.sort();
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function packageFileHashes(packageRoot, files) {
  const hashes = {};
  for (const file of files) {
    hashes[file] = sha256(join(packageRoot, ...file.split("/")));
  }
  return hashes;
}

function readManifest(target) {
  const path = join(target, MANIFEST);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function isManagedClean(target, packageRoot) {
  const manifest = readManifest(target);
  if (!manifest || manifest.packageName !== "program-truth" || !Array.isArray(manifest.files)) return false;
  if (!manifest.fileHashes || typeof manifest.fileHashes !== "object") return false;
  for (const file of manifest.files) {
    const targetFile = join(target, ...file.split("/"));
    if (!existsSync(targetFile)) return false;
    if (manifest.fileHashes[file] !== sha256(targetFile)) return false;
  }
  return true;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
}

export function defaultTargetForClient(client) {
  if (client === "codex") return join(homedir(), ".codex", "skills", "program-truth");
  if (client === "claude") return join(homedir(), ".claude", "skills", "program-truth");
  throw new Error(`Unsupported client: ${client}`);
}

export function installSkill({ packageRoot, client, target, backup = false, force = false, dryRun = false, packageName = "program-truth", packageVersion = "0.0.0" }) {
  const resolvedTarget = resolve(target);
  const exists = existsSync(resolvedTarget);
  const files = packageFiles(packageRoot);
  const fileHashes = packageFileHashes(packageRoot, files);
  let status = "created";
  let backupPath = "";

  if (exists) {
    const clean = isManagedClean(resolvedTarget, packageRoot);
    if (!clean && !backup && !force) {
      throw new Error(`Refusing to replace unmanaged or modified install at ${resolvedTarget}. Use --backup or --force.`);
    }
    status = "replaced";
    if (backup) {
      backupPath = `${resolvedTarget}.backup-${timestamp()}`;
      if (!dryRun) renameSync(resolvedTarget, backupPath);
    } else if (!dryRun) {
      rmSync(resolvedTarget, { recursive: true, force: true });
    }
  }

  if (!dryRun) {
    mkdirSync(resolvedTarget, { recursive: true });
    for (const root of COPY_ROOTS) {
      const source = join(packageRoot, root);
      if (!existsSync(source)) continue;
      copyRecursive(source, join(resolvedTarget, root));
    }
    const manifest = {
      packageName,
      packageVersion,
      client,
      installedAt: new Date().toISOString(),
      files,
      fileHashes
    };
    writeFileSync(join(resolvedTarget, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  return { client, target: resolvedTarget, status, backupPath, dryRun, files };
}

function checkWritable(path) {
  let current = path;
  try {
    while (!existsSync(current)) {
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
    accessSync(current, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function doctor({ packageRoot, packageVersion }) {
  const checks = [];
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
  checks.push({
    name: "Node version",
    ok: nodeMajor >= 20,
    message: `${process.versions.node} ${nodeMajor >= 20 ? "meets" : "does not meet"} >=20`
  });
  checks.push({
    name: "Package version",
    ok: Boolean(packageVersion),
    message: packageVersion || "unknown"
  });
  for (const file of REQUIRED_SKILL_FILES) {
    const ok = existsSync(join(packageRoot, ...file.split("/")));
    checks.push({ name: `Package file ${file}`, ok, message: ok ? "present" : "missing" });
  }
  for (const client of ["codex", "claude"]) {
    const target = defaultTargetForClient(client);
    const parent = dirname(target);
    checks.push({ name: `${client} skill parent`, ok: checkWritable(parent), message: parent });
    const installed = existsSync(join(target, "SKILL.md"));
    const manifest = readManifest(target);
    checks.push({
      name: `${client} installed skill`,
      ok: installed,
      message: installed ? `${target}${manifest ? " managed" : " unmanaged"}` : `${target} not installed`
    });
  }
  return { ok: checks.every((check) => check.ok), checks };
}

export const REQUIRED_FILES = REQUIRED_SKILL_FILES;
export const MANIFEST_FILE = MANIFEST;
