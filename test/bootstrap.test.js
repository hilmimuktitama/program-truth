import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
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

test("findCandidateSources sanitizes discovered Atlassian and Notion URLs", () => {
  const workspace = scratch("sanitized-links");
  try {
    writeFileSync(join(workspace, "notes.md"), [
      "Atlassian https://user:password@example.atlassian.net/browse/ABC-123?jql=project%3DENG&api_key=remove-me&AWSAccessKeyId=remove-me&access_key=remove-me&access-key=remove-me&safe_key=keep&view=detail#secret-fragment",
      "Notion https://token-user:token-pass@www.notion.so/workspace/example-page?filter=open&access_token=remove-me&signatureVersion=remove-me#fragment"
    ].join("\n"));
    const candidates = findCandidateSources(workspace);
    assert.deepEqual(candidates.filter((item) => item.kind === "jira_url").map((item) => item.value), [
      "https://example.atlassian.net/browse/ABC-123?jql=project%3DENG&safe_key=keep&view=detail"
    ]);
    assert.deepEqual(candidates.filter((item) => item.kind === "notion_url").map((item) => item.value), [
      "https://www.notion.so/workspace/example-page?filter=open"
    ]);
    runBootstrap({ workspace, dryRun: false, clientMode: "none" });
    const initialContext = readFileSync(join(workspace, "INITIAL-CONTEXT.md"), "utf8");
    assert.match(initialContext, /https:\/\/www\.notion\.so\/workspace\/example-page\?filter=open/);
    assert.doesNotMatch(initialContext, /password|api_key|access_token|signatureVersion|secret-fragment/i);
  } finally {
    cleanup(workspace);
  }
});

test("bootstrap sanitizes explicit URL anchors and known sources", () => {
  const workspace = scratch("explicit-links");
  try {
    const result = runBootstrap({
      workspace,
      dryRun: true,
      clientMode: "none",
      inputData: {
        anchor: "https://user:pass@example.atlassian.net/browse/ABC-123?safe=1&AWSAccessKeyId=one&access_key=two&access-key=three&safe_key=keep#fragment",
        known_sources: [
          "https://example.notion.site/page?filter=open&client_assertion=three&safe=2",
          "https://[malformed"
        ]
      }
    });
    assert.equal(result.captured_context.anchor, "https://example.atlassian.net/browse/ABC-123?safe=1&safe_key=keep");
    assert.match(result.next_prompt, /https:\/\/example\.atlassian\.net\/browse\/ABC-123\?safe=1/);
    assert.doesNotMatch(result.next_prompt, /pass|JWT|session_id|fragment/i);
    assert.doesNotMatch(JSON.stringify(result), /client_assertion|malformed|three/i);
  } finally {
    cleanup(workspace);
  }
});

test("Jira key extraction ignores URL userinfo and query values", () => {
  const workspace = scratch("url-keys");
  try {
    writeFileSync(join(workspace, "notes.md"), [
      "https://user:LEAK-100@example.atlassian.net/browse/ABC-123?token=QUERY-200&safe=1",
      "Real key REAL-300"
    ].join("\n"));
    const keys = findCandidateSources(workspace).filter((item) => item.kind === "jira_key").map((item) => item.value);
    assert.deepEqual(keys, ["REAL-300"]);
  } finally {
    cleanup(workspace);
  }
});

test("cache artifacts do not become sources", () => {
  const workspace = scratch("ignored");
  try {
    mkdirSync(join(workspace, "scripts", "__pycache__"), { recursive: true });
    mkdirSync(join(workspace, ".pytest_cache"), { recursive: true });
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
    mkdirSync(join(nested, "lib"), { recursive: true });
    mkdirSync(join(nested, "examples"), { recursive: true });
    writeFileSync(join(nested, "SKILL.md"), "skill");
    writeFileSync(join(nested, "references", "init-bootstrap.md"), "Use program-truth init.");
    writeFileSync(join(nested, "references", "framework.md"), "framework");
    writeFileSync(join(nested, "references", "source-ranking-and-reconciliation.md"), "ranking");
    writeFileSync(join(nested, "lib", "bootstrap.js"), "// helper");
    writeFileSync(join(nested, "README.md"), "Jira key ABC-123");
    writeFileSync(join(nested, "examples", "example-INITIAL-CONTEXT.md"), "Confluence https://example.atlassian.net/wiki/spaces/ENG/pages/123");
    const result = runBootstrap({ workspace, dryRun: true, clientMode: "none" });
    assert.deepEqual(result.candidate_sources, []);
    assert.ok(result.bootstrap_context_paths.includes(".codex-tmp-program-truth/SKILL.md"));
    assert.ok(result.bootstrap_context_paths.includes(".codex-tmp-program-truth/lib/bootstrap.js"));
  } finally {
    cleanup(workspace);
  }
});
