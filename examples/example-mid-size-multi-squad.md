# Example: Mid-Size / Multi-Squad

## Scenario

A program operator is covering a cross-squad program spanning `billing`, `quota service`, `campaign orchestration`, and `customer admin`. The weekly update looks healthy at the epic level, but nobody can clearly say which component is on the critical path.

## Org Shape

- 1 program operator
- 4-6 squads
- Jira for execution
- Confluence for sync pages and PRDs
- local specs and status notes kept with varying freshness

## Source Systems

- Jira epics, stories, and linked split tasks
- Confluence sync notes
- local program spec
- local weekly status note

## Problem

The parent epics are all `In Progress`, but one dependency from `quota service` to `campaign orchestration` is gating the actual release. The local status note implies "mostly on track" without proving it.

## Prompt

`Use program-truth to prepare a weekly status report for the billing + quota + campaign program. Drill to the task level, build a component truth table, and identify the provider -> consumer dependency that actually gates the release.`

## What The Skill Should Do

1. query Jira at the task level instead of reporting from the epic
2. deduplicate shared QA or rollout tasks before aggregation
3. use recent Confluence sync notes as supporting evidence, not as the primary execution truth
4. compare the local status note with the live task breakdown
5. produce a workstream or component truth table
6. call out the gating dependency with provider, consumer, ETA, and impact

## Expected Output Shape

```markdown
## Summary
- Overall health: At risk
- Jira status: all parent epics remain `In Progress`
- Functional status: 3 components are execution-ready, 1 dependency blocks release

## Data Source
- Systems queried: Jira, Confluence, local spec, local weekly note
- Query level: linked split task
- Primary artifacts: `BILL-920`, `QUOTA-311`, `CMP-188`, weekly sync 2026-05-07
- Freshness window: 2026-05-05 to 2026-05-07
- Caveats: local weekly note is stale on dependency timing

## Component Truth Table
| Component | Owner | System Status | Functional Status | Evidence | Remaining Scope |
|---|---|---|---|---|---|
| Billing | Eng Lead A | In Progress | ready | all required tasks done | rollout coordination |
| Quota Service | Eng Lead B | In Progress | blocking | quota API task open | API contract + deploy |
| Campaign Orchestration | Eng Lead C | In Progress | blocked by provider | waiting on quota API | integration validation |
| Customer Admin | Eng Lead D | In Progress | ready | FE + QA tasks done | none |

## Dependencies
- Provider: Quota Service
- Consumer: Campaign Orchestration
- Current status: blocking
- Provider ETA: 2026-05-12
- Consumer impact: release cannot proceed until integration validation is complete
```

## Why This Example Matters

This is a common cross-squad execution failure mode: parent tickets create the illusion of progress, while the real release outcome depends on one unresolved component dependency. The example proves that the skill is built for that layer of work.
