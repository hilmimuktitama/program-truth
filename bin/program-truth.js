#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeCommand, parseOptions } from "../lib/args.js";
import { runBootstrap, humanSummary, loadJsonInput } from "../lib/bootstrap.js";
import { installSkill, doctor, defaultTargetForClient } from "../lib/install.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));

function usage() {
  return `program-truth ${PACKAGE.version}

Usage:
  program-truth install <codex|claude|all> [--target <path>] [--backup] [--force] [--dry-run]
  program-truth doctor|--doctor|-doctor [--codex-target <path>] [--claude-target <path>]
  program-truth bootstrap [--workspace <path>] [--client auto|codex|claude|none] [--anchor <value>] [--system jira|confluence|notion|local] [--scaffold minimal|full] [--dry-run] [--json] [--json-in <path|->]
  program-truth version

Notes:
  --target requires a single client (codex or claude); it is rejected with 'install all'.
  --codex-target and --claude-target verify doctor against isolated skill directories (used by CI).
`;
}

function printInstallResult(result) {
  const label = result.dryRun ? "Would install" : "Installed";
  console.log(`${label} ${result.client} skill to ${result.target}`);
  console.log(`Status: ${result.status}`);
  if (result.backupPath) {
    console.log(`Backup: ${result.backupPath}`);
  }
  console.log(`Files: ${result.files.length}`);
}

async function main(argv) {
  const [rawCommand, ...rest] = argv;
  const command = normalizeCommand(rawCommand);
  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return 0;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    console.log(PACKAGE.version);
    return 0;
  }

  if (command === "bootstrap") {
    const options = parseOptions(rest);
    const inputData = await loadJsonInput(options["json-in"]);
    if (options.anchor) inputData.anchor = options.anchor;
    if (options.system) inputData.anchor_system = options.system;
    const result = runBootstrap({
      workspace: options.workspace || ".",
      clientMode: options.client || "auto",
      inputData,
      dryRun: Boolean(options["dry-run"]),
      scaffoldMode: options.scaffold || "minimal"
    });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(humanSummary(result));
    }
    return 0;
  }

  if (command === "install") {
    const options = parseOptions(rest);
    const client = options._[0];
    if (!["codex", "claude", "all"].includes(client)) {
      throw new Error("Install target must be codex, claude, or all.");
    }
    if (client === "all" && options.target) {
      throw new Error("--target cannot be used with install all; install codex or claude individually with --target.");
    }
    const clients = client === "all" ? ["codex", "claude"] : [client];
    for (const item of clients) {
      const target = clients.length === 1 && options.target
        ? options.target
        : defaultTargetForClient(item);
      const result = installSkill({
        packageRoot: ROOT,
        client: item,
        target,
        backup: Boolean(options.backup),
        force: Boolean(options.force),
        dryRun: Boolean(options["dry-run"]),
        packageName: PACKAGE.name,
        packageVersion: PACKAGE.version
      });
      printInstallResult(result);
    }
    return 0;
  }

  if (command === "doctor") {
    const options = parseOptions(rest);
    const targets = {};
    if (options["codex-target"]) targets.codex = options["codex-target"];
    if (options["claude-target"]) targets.claude = options["claude-target"];
    const result = doctor({ packageRoot: ROOT, packageVersion: PACKAGE.version, targets });
    for (const check of result.checks) {
      console.log(`${check.ok ? "ok" : "fail"} - ${check.name}: ${check.message}`);
    }
    return result.ok ? 0 : 1;
  }

  throw new Error(`Unknown command: ${command}`);
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(`program-truth: ${error.message}`);
    process.exitCode = 1;
  }
);
