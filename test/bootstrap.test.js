import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { findCandidateSources, runBootstrap } from "../lib/bootstrap.js";

function scratch(prefix) {
  return mkdtempSync(join(tmpdir(), `program-truth-${prefix}-`));
}

function cleanup(path) {
  rmSync(path, { recursive: true, force: true });
}

test("findCandidateSources detects links and keys", () => {
  const workspace = scratch("sources");
  try {
    writeFileSync(join(workspace, "notes.md"), [
      "Jira key ABC-123",
      "Jira URL https://example.atlassian.net/browse/ABC-123",
      "Confluence https://example.atlassian.net/wiki/spaces/ENG/pages/123",
      "Notion https://www.notion.so/workspace/example-page"
    ].join("\n"));
    const kinds = new Set(findCandidateSources(workspace).map((item) => item.kind));
    assert.ok(kinds.has("jira_key"));
    assert.ok(kinds.has("jira_url"));
    assert.ok(kinds.has("confluence_url"));
    assert.ok(kinds.has("notion_url"));
  } finally {
    cleanup(workspace);
  }
});

test("generated and cache artifacts do not become sources", () => {
  const workspace = scratch("ignored");
  try {
    mkdirSync(join(workspace, "scripts", "__pycache__"), { recursive: true });
    mkdirSync(join(workspace, ".pytest_cache"), { recursive: true });
    writeFileSync(join(workspace, "scripts", "eval_report.md"), "Jira key BIF-7719");
    writeFileSync(join(workspace, "scripts", "__pycache__", "notes.md"), "Jira key CACHE-123");
    writeFileSync(join(workspace, ".pytest_cache", "notes.md"), "Jira key CACHE-456");
    assert.deepEqual(findCandidateSources(workspace), []);
    const result = runBootstrap({ workspace, dryRun: true, clientMode: "none" });
    assert.equal(result.captured_context.anchor, null);
    assert.deepEqual(result.remaining_gaps, ["one anchor artifact such as a Jira key/filter/board, Confluence page, Notion page/database, or local file"]);
  } finally {
    cleanup(workspace);
  }
});

test("empty workspace requests anchor before readiness", () => {
  const workspace = scratch("empty");
  try {
    const result = runBootstrap({ workspace, dryRun: true, clientMode: "none" });
    assert.equal(result.action_plan.primary_action, "provide_anchor");
    assert.match(result.next_prompt, /Reply with one anchor/);
    assert.ok(result.bootstrap_questions[0].toLowerCase().includes("anchor artifact"));
  } finally {
    cleanup(workspace);
  }
});

test("known Jira anchor removes bootstrap blocker", () => {
  const workspace = scratch("known");
  try {
    const result = runBootstrap({
      workspace,
      dryRun: true,
      clientMode: "none",
      inputData: { anchor: "ABC-123", anchor_system: "jira" }
    });
    assert.deepEqual(result.remaining_gaps, []);
    assert.equal(result.action_plan.primary_action, "run_source_discovery");
    assert.match(result.next_prompt, /Jira ABC-123/);
    assert.match(result.action_plan.if_blocked[0], /getAccessibleAtlassianResources/);
  } finally {
    cleanup(workspace);
  }
});

test("local anchor writes minimal scaffold only", () => {
  const workspace = scratch("local");
  try {
    writeFileSync(join(workspace, "status-note.md"), "Current status");
    const result = runBootstrap({
      workspace,
      dryRun: false,
      clientMode: "none",
      inputData: { anchor: "status-note.md", anchor_system: "local" }
    });
    assert.ok(existsSync(join(workspace, "INITIAL-CONTEXT.md")));
    assert.equal(existsSync(join(workspace, "TODO.md")), false);
    assert.equal(existsSync(join(workspace, "CLAUDE.md")), false);
    assert.deepEqual(result.files_written, [{ path: "INITIAL-CONTEXT.md", status: "created" }]);
  } finally {
    cleanup(workspace);
  }
});

test("nested program-truth clone is bootstrap context only", () => {
  const workspace = scratch("nested");
  try {
    const nested = join(workspace, ".codex-tmp-program-truth");
    mkdirSync(join(nested, "references"), { recursive: true });
    mkdirSync(join(nested, "scripts"), { recursive: true });
    mkdirSync(join(nested, "examples"), { recursive: true });
    writeFileSync(join(nested, "SKILL.md"), "skill");
    writeFileSync(join(nested, "references", "init-bootstrap.md"), "Use program-truth init.");
    writeFileSync(join(nested, "references", "framework.md"), "framework");
    writeFileSync(join(nested, "references", "source-ranking-and-reconciliation.md"), "ranking");
    writeFileSync(join(nested, "scripts", "bootstrap_program_truth.py"), "# helper");
    writeFileSync(join(nested, "README.md"), "Jira key ABC-123");
    writeFileSync(join(nested, "examples", "example-INITIAL-CONTEXT.md"), "Confluence https://example.atlassian.net/wiki/spaces/ENG/pages/123");
    const result = runBootstrap({ workspace, dryRun: true, clientMode: "none" });
    assert.deepEqual(result.candidate_sources, []);
    assert.ok(result.bootstrap_context_paths.includes(".codex-tmp-program-truth/SKILL.md"));
  } finally {
    cleanup(workspace);
  }
});
