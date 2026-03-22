# Program Truth

[![Quality](https://github.com/hilmimuktitama/program-truth/actions/workflows/quality.yml/badge.svg)](https://github.com/hilmimuktitama/program-truth/actions/workflows/quality.yml)
[![Version](https://img.shields.io/github/v/tag/hilmimuktitama/program-truth)](https://github.com/hilmimuktitama/program-truth/tags)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

`program-truth` is an evidence-first program reconciliation skill for reconstructing program truth across Jira, Confluence, Notion, local docs, and meeting notes.

It is designed for the part of TPM work where summaries usually fail: mid-flight programs, conflicting trackers, partial ownership, stale docs, and status reports that look clean but are wrong.

## Who This Is For

- TPMs working across multiple squads or systems
- chiefs of staff or program operators supporting engineering execution
- operators who need status, dependency, or risk artifacts that can survive leadership review
- teams where parent-ticket status is often cleaner than the real execution state

## Who This Is Not For

- people looking for a personal task manager or lightweight note formatter
- teams with one clean source of truth and little reconciliation work
- users who want polished summaries without evidence discipline
- workflows where owners, dates, blockers, and contradictions do not matter

## What It Optimizes For

- execution truth over parent-ticket optics
- explicit facts, inferences, unknowns, and conflicts
- blocker and risk hygiene with owners and dates
- outputs that can survive leadership review

## Project Status

This repository is published for use and reference.

External contributions are not being accepted at this stage. If you want to adapt the skill, fork the repository or copy the package into your local skills directory and customize it there.

## First Useful Run in 10 Minutes

This means a first useful run, not full live-adapter maturity.

1. Install the package into your local skills directory.
   - If you cloned this repository directly:
     - Codex: `cp -r program-truth ~/.codex/skills/program-truth`
     - Claude Code: `cp -r program-truth ~/.claude/skills/program-truth`
   - If this repo already lives under a local `skills/` directory:
     - Codex: `cp -r skills/program-truth ~/.codex/skills/program-truth`
     - Claude Code: `cp -r skills/program-truth ~/.claude/skills/program-truth`
2. Create a minimal workspace context from `examples/example-WORKSPACE.md`.
3. Point it to your current `TODO.md`, one active spec, and one recent status source.
4. Run a day-priority prompt through the skill.
   - Example: `Use program-truth to identify the Top 1 that must move today and the Top 2 that must not get worse.`
5. Run one real archaeology or status prompt on an active initiative.
   - Example: `Use program-truth to reconstruct the true status of this launch from Jira, Confluence, and local notes.`
6. Check the output for:
   - a `Data Source` block
   - facts vs inferences vs unknowns
   - owner and date on blockers and next actions

For full setup, runtime details, and live adapters, see `INSTALL.md`.

## Install

Choose the install path that matches how you have the files locally.

### Option A: Direct clone of this repository

```bash
git clone https://github.com/hilmimuktitama/program-truth.git
cp -r program-truth ~/.codex/skills/program-truth
```

For Claude Code:

```bash
cp -r program-truth ~/.claude/skills/program-truth
```

### Option B: Copy from a larger local `skills/` directory

```bash
cp -r skills/program-truth ~/.codex/skills/program-truth
```

For Claude Code:

```bash
cp -r skills/program-truth ~/.claude/skills/program-truth
```

The version badge in this README reflects the latest Git tag, for example `v0.1.0`.

## What Makes It Different

Most TPM prompts stop at “write a status report.” This package is stricter:

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

## Package Map

- `SKILL.md`: operating contract for the skill
- `INSTALL.md`: detailed setup and adapter reference
- `LICENSE`: MIT license
- `.github/workflows/quality.yml`: markdown and link checks on push and pull request
- `references/framework.md`: templates and operating rules
- `references/archaeology-workflow.md`: step-by-step reconstruction playbook
- `references/source-ranking-and-reconciliation.md`: conflict resolution rules
- `references/notion-adapter.md`: Notion-specific caveats
- `examples/example-WORKSPACE.md`: generic workspace template
- `examples/example-CLAUDE.md`: Claude-oriented compatibility note
- `examples/example-startup-single-tpm.md`: startup scenario
- `examples/example-mid-size-multi-squad.md`: mid-size multi-squad scenario
- `examples/example-large-platform-heavy-org.md`: large-org scenario

## Intended Audience

This package is for technical program managers, chiefs of staff to engineering, and operators who regularly need to reconcile execution truth across multiple systems.
