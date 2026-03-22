# Program Truth Installation

This is the detailed setup reference for `program-truth`.

For the fastest onboarding path, start with the `First Useful Run in 10 Minutes` section in [README.md](README.md), then use this guide for exact copy commands, verification, runtime notes, and adapters.

The skill can work with local docs only, but prompt-only chats with no source pack are not a reliable starting point. Live adapters or other current execution sources make archaeology and status work materially stronger.

This repository is published for use and reference. Copy it locally and adapt it for your environment.

## 1. Choose the Target Folder

- Codex: `~/.codex/skills/program-truth`
- Claude Code: `~/.claude/skills/program-truth`

## 2. Copy the Package

Choose the install path that matches how you have the files locally.

### Option A: Clone this repository

#### macOS/Linux

```bash
git clone https://github.com/hilmimuktitama/program-truth.git
mkdir -p ~/.codex/skills
cp -R program-truth ~/.codex/skills/
```

For Claude Code, replace `~/.codex/skills/` with `~/.claude/skills/`.

#### PowerShell

```powershell
git clone https://github.com/hilmimuktitama/program-truth.git
New-Item -ItemType Directory -Force "$HOME\.codex\skills" | Out-Null
Copy-Item -Recurse -Force .\program-truth "$HOME\.codex\skills"
```

For Claude Code, replace `"$HOME\.codex\skills"` with `"$HOME\.claude\skills"`.

### Option B: Copy from a larger local `skills/` directory

#### macOS/Linux

```bash
mkdir -p ~/.codex/skills
cp -R skills/program-truth ~/.codex/skills/
```

For Claude Code, replace `~/.codex/skills/` with `~/.claude/skills/`.

#### PowerShell

```powershell
New-Item -ItemType Directory -Force "$HOME\.codex\skills" | Out-Null
Copy-Item -Recurse -Force .\skills\program-truth "$HOME\.codex\skills"
```

For Claude Code, replace `"$HOME\.codex\skills"` with `"$HOME\.claude\skills"`.

## 3. Verify the Install

### macOS/Linux

```bash
find ~/.codex/skills/program-truth -maxdepth 3 -type f | sort
```

### PowerShell

```powershell
Get-ChildItem "$HOME\.codex\skills\program-truth" -Recurse -File |
  Select-Object -ExpandProperty FullName |
  Sort-Object
```

Use the Claude path if you installed the package there.

Expected files include:

- `SKILL.md`
- `README.md`
- `INSTALL.md`
- `examples/example-INITIAL-CONTEXT.md`
- `references/framework.md`
- `references/archaeology-workflow.md`
- `references/source-ranking-and-reconciliation.md`
- `references/notion-adapter.md`

## 4. Runtime Notes

Supported usage assumes a client that can:

- load local skill packages
- read local workspace context files
- follow file references into the workspace

### Codex

- Install to `~/.codex/skills/program-truth`
- Keep the package intact; do not copy only `SKILL.md`
- Use your normal Codex skill invocation flow

### Claude Code

- Install to `~/.claude/skills/program-truth`
- Use your normal Claude Code skill invocation flow
- If your client expects a workspace context file, start from `examples/example-WORKSPACE.md`

## 5. Optional Adapters

### Atlassian

Use when Jira or Confluence is part of the source-of-truth set.

Recommended capabilities:

- Jira issue search and read
- Confluence search and page read
- account and permission visibility checks

Example MCP configuration:

This is one example using `@anthropic-ai/atlassian-mcp`. Your connector, client wiring, and auth flow may differ.

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["@anthropic-ai/atlassian-mcp"]
    }
  }
}
```

This example assumes `npx` and Node.js are already available in your environment.

Smoke test:

```text
Call: mcp__atlassian__getAccessibleAtlassianResources()
Expected: visible Jira or Confluence resources
```

### Notion

Use when program home pages, decision logs, or work databases live in Notion.

The connector must expose:

- page and database search
- page reads
- owner, status, and date properties
- last-edited timestamps

If those fields are unavailable, treat Notion as a low-confidence source.

Read `references/notion-adapter.md` before relying on Notion in status-critical work.

## 6. Workspace Setup

Use `examples/example-WORKSPACE.md` as the baseline workspace template.
Use `examples/example-INITIAL-CONTEXT.md` as the minimum source pack before asking for `daily`, `status`, or `archaeology`.

At minimum, maintain:

- a workspace context file such as `CLAUDE.md` if your client uses one
- an initial context pack with the current initiative, sources, and known gaps
- `TODO.md`
- squad `specs/` and `status/`
- `cross-squad/specs/` and `cross-squad/status/`

## 7. Smoke Test the Method

Run a context-readiness prompt first:

```text
Use program-truth to inventory available sources, identify the lowest execution-level artifacts, and tell me what is missing before making a priority call.
```

Expected behavior:

- reads local context first
- inventories the systems in play
- identifies the current execution source
- flags stale docs, missing access, or missing owners/dates
- returns a missing-context checklist instead of pretending the evidence is complete

Then run a source-aware `daily`, `status`, or `archaeology` request.

Expected behavior:

- drills to the lowest execution-level artifact available
- separates facts, inferences, unknowns, and conflicts
- includes a `Data Source` section

## 8. Troubleshooting

### The skill is not discovered

- confirm `SKILL.md` exists in the installed skill folder
- restart the client if it caches skill discovery

### Atlassian auth fails

- rerun a read-only call to trigger auth again
- confirm the correct site and scopes

### Notion search works but key properties are missing

- confirm the connector exposes database properties and timestamps
- do not treat Notion as high confidence until owner, status, and date fields are visible

### Output looks clean but shallow

- confirm the prompt actually asked for status, archaeology, deps, risks, or review work
- confirm the client has access to the relevant live systems
- confirm the skill is drilling to the lowest execution-level artifact instead of stopping at parent pages or epics

### Output is empty or generic

- confirm the client can actually load local skills and workspace context files
- fill `examples/example-INITIAL-CONTEXT.md` or an equivalent local context pack
- include at least one current execution source before asking for `daily`, `status`, or `archaeology`
