# Program Truth Installation

This is the detailed setup reference for `program-truth`.

For the fastest onboarding path, start with the `First Useful Run in 10 Minutes` section in [README.md](README.md), then use this guide for exact copy commands, verification, runtime notes, and adapters.

The skill can work with local docs only, but prompt-only chats with no source pack are not a reliable starting point. Live adapters or other current execution sources make archaeology and status work materially stronger.

This repository is published for use and reference. Copy it locally and adapt it for your environment.

## 1. Install the Skill

### Codex

Preferred path:

- Ask Codex to install the skill from `https://github.com/hilmimuktitama/program-truth`.
- Restart Codex to pick up the new skill.

Notes:

- Codex installs personal skills under `~/.codex/skills/program-truth`.
- If that destination already exists, the GitHub install flow may refuse to overwrite it. Use the manual fallback below for updates or when you already have a local copy.

Manual fallback:

#### macOS/Linux

```bash
git clone https://github.com/hilmimuktitama/program-truth.git
mkdir -p ~/.codex/skills
cp -R program-truth ~/.codex/skills/
```

#### PowerShell

```powershell
git clone https://github.com/hilmimuktitama/program-truth.git
New-Item -ItemType Directory -Force "$HOME\.codex\skills" | Out-Null
Copy-Item -Recurse -Force .\program-truth "$HOME\.codex\skills"
```

### Claude Code

Claude Code skills are file-based.

Personal skill:

- Copy this repo to `~/.claude/skills/program-truth`.

Project skill:

- Add it under `.claude/skills/program-truth` in the workspace repo when you want the skill versioned with the project.

Manual install:

#### macOS/Linux

```bash
git clone https://github.com/hilmimuktitama/program-truth.git
mkdir -p ~/.claude/skills
cp -R program-truth ~/.claude/skills/
```

Project-scoped variant:

```bash
mkdir -p .claude/skills
cp -R program-truth .claude/skills/
```

#### PowerShell

```powershell
git clone https://github.com/hilmimuktitama/program-truth.git
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse -Force .\program-truth "$HOME\.claude\skills"
```

Project-scoped variant:

```powershell
New-Item -ItemType Directory -Force ".\.claude\skills" | Out-Null
Copy-Item -Recurse -Force .\program-truth ".\.claude\skills"
```

## 2. Verify the Install

### Codex or Claude personal skill on macOS/Linux

```bash
find ~/.codex/skills/program-truth -maxdepth 3 -type f | sort
```

For Claude Code personal installs, replace `~/.codex/skills/program-truth` with `~/.claude/skills/program-truth`.

### Codex or Claude personal skill in PowerShell

```powershell
Get-ChildItem "$HOME\.codex\skills\program-truth" -Recurse -File |
  Select-Object -ExpandProperty FullName |
  Sort-Object
```

For Claude Code personal installs, replace `"$HOME\.codex\skills\program-truth"` with `"$HOME\.claude\skills\program-truth"`.

### Claude project skill

Verify that `.claude/skills/program-truth/SKILL.md` exists in the workspace.

Expected files include:

- `SKILL.md`
- `README.md`
- `INSTALL.md`
- `examples/example-INITIAL-CONTEXT.md`
- `references/framework.md`
- `references/init-bootstrap.md`
- `references/archaeology-workflow.md`
- `references/source-ranking-and-reconciliation.md`
- `references/notion-adapter.md`

## 3. Runtime Notes

Supported usage assumes a client that can:

- load local skill packages
- read local workspace context files
- follow file references into the workspace

### Codex

- Preferred install path is Codex's GitHub repo install flow
- Installed personal skills live under `~/.codex/skills/program-truth`
- Keep the package intact; do not copy only `SKILL.md`

### Claude Code

- Personal skills live under `~/.claude/skills/program-truth`
- Project skills can live under `.claude/skills/program-truth`
- If your client expects a workspace context file, start from `examples/example-WORKSPACE.md`

## 4. Optional Adapters

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

## 5. Workspace Setup

Use `examples/example-WORKSPACE.md` as the baseline workspace template.
Use `examples/example-INITIAL-CONTEXT.md` as the minimum source pack before asking for `daily`, `status`, or `archaeology`.
Use `program-truth init` when you want the AI to bootstrap this in one pass instead of creating the files manually.

At minimum, maintain:

- a workspace context file such as `CLAUDE.md` if your client uses one
- an initial context pack with the current initiative, sources, and known gaps
- `TODO.md`
- squad `specs/` and `status/`
- `cross-squad/specs/` and `cross-squad/status/`

## 6. Smoke Test the Method

Run `init` first when the workspace is still thin:

```text
Use program-truth init to inspect this workspace, guide me through connecting Jira/Confluence/Notion if needed, and scaffold the minimum local context files in one pass.
```

Expected behavior:

- inspects what context files already exist
- proposes or creates the minimum local scaffold in one batch
- tells you whether Jira/Confluence and Notion connectors are worth setting up
- gives connector smoke tests instead of assuming the integrations already work
- leaves you with a concrete next prompt for readiness or archaeology

Then run a context-readiness prompt:

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

## 7. Troubleshooting

### The skill is not discovered

- confirm `SKILL.md` exists in the installed skill folder
- restart the client if it caches skill discovery
- for Claude project skills, confirm the skill is actually under `.claude/skills/program-truth/`

### Codex GitHub install does not update the skill

- confirm whether `~/.codex/skills/program-truth` already exists
- use the manual copy path when you need to replace an existing local install

### Atlassian auth fails

- rerun a read-only call to trigger auth again
- confirm the correct site and scopes
- rerun `init` and ask it to guide the Jira/Confluence connector setup step-by-step if the workspace is still not wired

### Notion search works but key properties are missing

- confirm the connector exposes database properties and timestamps
- do not treat Notion as high confidence until owner, status, and date fields are visible
- rerun `init` and ask it to guide the Notion connector setup and smoke test if the workspace is still not wired

### Output looks clean but shallow

- confirm the prompt actually asked for status, archaeology, deps, risks, or review work
- confirm the client has access to the relevant live systems
- confirm the skill is drilling to the lowest execution-level artifact instead of stopping at parent pages or epics

### Output is empty or generic

- confirm the client can actually load local skills and workspace context files
- start with `program-truth init` instead of a direct `daily` or `status` request
- fill `examples/example-INITIAL-CONTEXT.md` or an equivalent local context pack
- include at least one current execution source before asking for `daily`, `status`, or `archaeology`
