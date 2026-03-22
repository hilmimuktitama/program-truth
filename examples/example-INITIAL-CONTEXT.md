# Initial Context Pack

Use this before asking for `daily`, `status`, `archaeology`, `review`, `deps`, or `risks`.

The goal is to give the AI a minimum source pack it can actually reason over instead of a prompt with no operating context.

## Initiative

**Name:** [Program or launch name]  
**Objective:** [What this initiative is trying to achieve]  
**Current Question:** [What you want the AI to answer first]  
**Target Milestone Or Date:** [YYYY-MM-DD or reporting window]  
**Last Updated:** [YYYY-MM-DD]

## Scope

| Squad / Service | Owner | Repo / Area | Notes |
|-----------------|-------|-------------|-------|
| [Identity] | [Name] | `/path/to/repo` | [Optional] |
| [Billing] | [Name] | `/path/to/repo` | [Optional] |

## Source Systems

| System | What It Contains | Link / Path / Key | Freshness | Can The AI Read It? |
|--------|------------------|-------------------|-----------|---------------------|
| Jira | task-level execution | [EPIC-123, story links, filter, board] | [YYYY-MM-DD] | [Yes / No] |
| Confluence | sync notes, decisions | [page link or title] | [YYYY-MM-DD] | [Yes / No] |
| Local spec | planned scope | `cross-squad/specs/program.md` | [YYYY-MM-DD] | [Yes / No] |
| Local status | recent status source | `cross-squad/status/2026-03-20.md` | [YYYY-MM-DD] | [Yes / No] |

## Minimum Required Artifacts

### Active Spec

- Path or link: [spec path]

### Recent Status Source

- Path or link: [status page, meeting note, or update]
- Date: [YYYY-MM-DD]

### Current Execution Source

- Link, key, or path: [task board, Jira key, checklist, action list, or meeting note with owners and dates]
- Why it is current: [one line]

## Known Claims To Validate

- [Claim that may be stale or disputed]
- [Current ETA or milestone to confirm]
- [Blocker, dependency, or owner question]

## Missing Access Or Confidence Limits

- [System the AI cannot read yet]
- [Source that may be stale]
- [Unknown owner, unknown date, or unclear dependency]

## Recommended First Prompt

```text
Use program-truth to inventory available sources, identify the lowest execution-level artifacts, and tell me what is missing before making a priority call.
```

Only after that readiness pass should you ask for `daily`, `status`, or `archaeology`.
