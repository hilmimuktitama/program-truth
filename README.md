# Program Truth

[![Quality](https://github.com/hilmimuktitama/program-truth/actions/workflows/quality.yml/badge.svg)](https://github.com/hilmimuktitama/program-truth/actions/workflows/quality.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

`program-truth` is a documentation-first skill package for TPMs and program operators who need to reconstruct execution truth across Jira, Confluence, Notion, local docs, and meeting notes.

It is built for mid-flight programs where trackers disagree, parent-ticket status looks cleaner than the actual work, and leadership-facing updates need evidence instead of optimism.

## Repository Status

This repository is published for use and reference.

- Clone it, copy it into your local skills directory, and adapt it for your environment.
- External pull requests are not being accepted at this stage.
- Support and fixes are best-effort.

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

## First Useful Run in 10 Minutes

This means a first useful run in a client that can load local skill packages and local workspace context. It does not mean a prompt-only chat with no sources attached.

1. Install the skill in your client.
   - Codex preferred: ask Codex to install the skill from `https://github.com/hilmimuktitama/program-truth`, then restart Codex.
   - Claude Code personal skill: copy this repo to `~/.claude/skills/program-truth`.
   - Claude Code project skill: add it under `.claude/skills/program-truth` in the workspace repo.
2. Use [INSTALL.md](INSTALL.md) for the exact Codex and Claude install paths, plus manual fallback commands.
3. Run `init` first:
   - `Use program-truth init to inspect this workspace, guide me through connecting Jira/Confluence/Notion if needed, and scaffold the minimum local context files in one pass.`
4. Let `init` create or propose the minimum local context set:
   - workspace context file
   - `INITIAL-CONTEXT.md`
   - `TODO.md`
   - minimal `specs/` and `status/` folders
5. Include at least one active spec, one recent status source, and one current execution source.
   - Preferred: Jira, Confluence, Notion, Linear, or another live system.
   - Acceptable fallback: a recent local checklist, meeting note, or action list with owners and dates.
6. If Jira, Confluence, or Notion matter for the program, let `init` guide connector setup and smoke tests before asking for status.
7. Run a context-readiness prompt such as `Use program-truth to inventory available sources, identify the lowest execution-level artifacts, and tell me what is missing before making a priority call.`
8. Only after the readiness pass confirms enough evidence, run a `daily`, `status`, or `archaeology` prompt.
9. Check the output for a `Data Source` block, explicit facts vs inferences vs unknowns, and owner/date on blockers and next actions.

If the first response is empty or generic, assume one of these is true:

- the client did not load the local skill package
- the client did not load the workspace context files
- the source pack is too thin for a real priority or status call

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

## Package Map

- `SKILL.md`: operating contract for the skill
- `INSTALL.md`: cross-platform setup, verification, and adapter reference
- `LICENSE`: MIT license
- `.github/workflows/quality.yml`: markdown, link, and encoding checks on push and pull request
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
