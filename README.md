# Program Truth

[![Quality](https://github.com/hilmimuktitama/program-truth/actions/workflows/quality.yml/badge.svg)](https://github.com/hilmimuktitama/program-truth/actions/workflows/quality.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

`program-truth` is a documentation-first skill package for TPMs and program operators who need to reconstruct execution truth across Jira, Confluence, Notion, local docs, and meeting notes.

It is built for mid-flight programs where trackers disagree, parent-ticket status looks cleaner than the actual work, and leadership-facing updates need evidence instead of optimism.

## Who It Helps

- TPMs working across multiple squads or systems
- chiefs of staff or program operators supporting engineering execution
- teams that need status, dependency, or risk artifacts that can survive leadership review
- teams where parent-ticket status is often cleaner than real execution state

## Not A Fit For

- people looking for a personal task manager or note formatter
- teams with one clean source of truth and little reconciliation work
- users who want polished summaries without evidence discipline

## What It Optimizes For

- execution truth over parent-ticket optics
- explicit facts, inferences, unknowns, and conflicts
- blocker and risk hygiene with owners and dates
- outputs that can survive leadership review

## Quick Start

### Step 1. Install

**Claude Code (personal)**

```bash
git clone https://github.com/hilmimuktitama/program-truth.git
mkdir -p ~/.claude/skills
cp -R program-truth ~/.claude/skills/
```

**Claude Code (project)**

```bash
git clone https://github.com/hilmimuktitama/program-truth.git
mkdir -p .claude/skills
cp -R program-truth .claude/skills/
```

**Codex**

Ask Codex to install the skill from `https://github.com/hilmimuktitama/program-truth`, then restart Codex.

See [INSTALL.md](INSTALL.md) for PowerShell variants, verification steps, and troubleshooting.

### Step 2. Init from one anchor

Give the skill one real artifact to start from — a Jira key, a Confluence page, a Notion database, or a local status note. Paste this into the chat:

```
Use program-truth init from [your anchor here] to inspect this workspace, identify the real source set, and write the minimum useful context files.
```

Examples:
- `Use program-truth init from Jira ABC-123 to inspect this workspace...`
- `Use program-truth init from https://[your-domain].atlassian.net/wiki/... to inspect this workspace...`
- `Use program-truth init from my-notes/status-2026-03.md to inspect this workspace...`

The skill inspects the workspace, fills in what it can, and writes a first-pass `INITIAL-CONTEXT.md`. If behavior is inconsistent or you want a deterministic run:

```bash
python scripts/bootstrap_program_truth.py --anchor ABC-123 --system jira --dry-run
```

### Step 3. Ask for what you actually need

Once `INITIAL-CONTEXT.md` exists, start with one of these:

| What you want | Prompt |
|---|---|
| What is actually blocked right now | `Use program-truth daily` |
| A status update with evidence | `Use program-truth status` |
| Reconstruct what really happened | `Use program-truth archaeology` |

Check the output for a `Data Source` block, explicit facts vs inferences vs unknowns, and owner and date on every blocker.

Other actions: `review`, `deps`, `risks`, `meeting`, `comms`, `spec`, `retro`, `translate`. See [SKILL.md](SKILL.md) for the full reference.

## What Good Output Looks Like

```markdown
## Data Source
- Systems queried: Jira, Confluence, local status notes
- Query level: task / action item
- Caveats: Notion unavailable; one status page last updated 2026-03-14

## Current Truth
- Release is yellow because provider work is complete but consumer rollout tasks are still open.
- Jira epic status is green, but task-level evidence does not support a green release call.

## Open Unknowns
- Owner for the migration fallback test is missing.
- No dated confirmation of staging sign-off after 2026-03-20.
```

## What Makes It Different

Most TPM prompts stop at "write a status report." This package is stricter:

- Jira is not treated as truth unless the query reaches the task level.
- Confluence and Notion are treated as evidence, not decoration.
- Parent status is not allowed to overwrite lower-level execution data.
- Unknowns stay visible instead of being silently converted into confident prose.
- System status and functional status stay separate when they differ.

## End-to-End Examples

These examples are intentionally different in org shape and source quality.

- [Startup / Single TPM](examples/example-startup-single-tpm.md): 2 squads, partial docs, chat-heavy execution, launch readiness mismatch
- [Mid-Size / Multi-Squad](examples/example-mid-size-multi-squad.md): 4-6 squads, Jira plus Confluence plus local specs, unclear component critical path
- [Large / Platform-Heavy Org](examples/example-large-platform-heavy-org.md): platform dependencies, roadmap-vs-execution conflicts, system status versus functional status mismatch

## Repository Status

This repository is published for use and reference.

- Clone it, copy it into your local skills directory, and adapt it for your environment.
- External pull requests are not being accepted at this stage.
- Support and fixes are best-effort.

## Package Map

- `SKILL.md`: operating contract for the skill
- `INSTALL.md`: cross-platform setup, verification, and adapter reference
- `scripts/bootstrap_program_truth.py`: deterministic bootstrap helper for agents and local shells
- `LICENSE`: MIT license
- `.github/workflows/quality.yml`: markdown, link, encoding, and bootstrap-script tests on push and pull request
- `references/framework.md`: templates and operating rules
- `references/init-bootstrap.md`: guided `init` workflow for connectors and workspace bootstrap
- `references/archaeology-workflow.md`: step-by-step reconstruction playbook
- `references/source-ranking-and-reconciliation.md`: conflict resolution rules
- `references/notion-adapter.md`: Notion-specific caveats
- `examples/example-INITIAL-CONTEXT.md`: minimum source pack for the first useful run
- `examples/example-WORKSPACE.md`: generic workspace template
- `examples/example-CLAUDE.md`: Claude-oriented compatibility note
- `examples/example-startup-single-tpm.md`: startup scenario
- `examples/example-mid-size-multi-squad.md`: mid-size multi-squad scenario
- `examples/example-large-platform-heavy-org.md`: large-org scenario
