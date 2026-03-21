# Staff TPM Installation

This is the detailed setup reference for `staff-tpm`.

For the fastest onboarding path, start with the `First Useful Run in 10 Minutes` section in `README.md`, then use this guide for full setup, runtime notes, and adapters.

The skill works with local docs only. Live adapters make archaeology and status work materially stronger.

## 1. Copy the Package

Copy `skills/staff-tpm/` into your local skills directory.

Common locations:
- Codex: `~/.codex/skills/staff-tpm`
- Claude Code: `~/.claude/skills/staff-tpm`

Example:

```bash
cp -r skills/staff-tpm ~/.codex/skills/staff-tpm
```

Verify the install:

```bash
find ~/.codex/skills/staff-tpm -maxdepth 3 -type f | sort
```

Expected files include:
- `SKILL.md`
- `README.md`
- `INSTALL.md`
- `references/framework.md`
- `references/archaeology-workflow.md`
- `references/source-ranking-and-reconciliation.md`
- `references/notion-adapter.md`

## 2. Runtime Notes

### Codex

- Install to `~/.codex/skills/staff-tpm`
- Keep the package intact; do not copy only `SKILL.md`
- Use your normal Codex skill invocation flow

### Claude Code

- Install to `~/.claude/skills/staff-tpm`
- Use your normal Claude Code skill invocation flow
- If your client expects a workspace context file, start from `examples/example-WORKSPACE.md`

## 3. Optional Adapters

### Atlassian

Use when Jira or Confluence is part of the source-of-truth set.

Recommended capabilities:
- Jira issue search and read
- Confluence search and page read
- account and permission visibility checks

Typical MCP configuration uses:

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

## 4. Workspace Setup

Use `examples/example-WORKSPACE.md` as the baseline workspace template.

At minimum, maintain:
- a workspace context file such as `CLAUDE.md` if your client uses one
- `TODO.md`
- squad `specs/` and `status/`
- `cross-squad/specs/` and `cross-squad/status/`

## 5. Smoke Test the Method

Run a simple day-priority prompt using the skill in your client.

Expected behavior:
- reads local context first
- identifies the top priorities for the day
- keeps actions tied to owners and dates

Then run a source-aware status or archaeology request.

Expected behavior:
- inventories the systems in play
- drills to the lowest execution-level artifact available
- separates facts, inferences, unknowns, and conflicts
- includes a `Data Source` section

## 6. Troubleshooting

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
