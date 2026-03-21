# Source Ranking And Reconciliation

Use this reference when sources disagree or when the workspace uses more than one project system.

## Default Ranking Order

Prefer sources in this order, unless lower-level execution evidence disproves them:

1. freshest owned operational artifact with explicit owner and date
2. execution-level tracker item
3. recent meeting note with explicit decisions or actions
4. broader status page, program page, or spec
5. stale local notes or backlog summaries
6. inference only

Do not interpret "platform prestige" as evidence. Jira is not automatically better than Notion, and Notion is not automatically better than Jira.

## Definitions

### Confirmed Fact

A claim backed by explicit evidence from a source with identifiable ownership and timestamp.

### Inference

A reasoned conclusion drawn from incomplete evidence. Useful, but not the same as truth.

### Unknown

A gap that cannot be resolved from the currently available evidence.

### Stale Claim

A claim from an older or less authoritative source that conflicts with fresher operational evidence.

### Conflict

Two or more sources making materially different claims about status, ETA, scope, ownership, or readiness.

### System Status

The status shown by the tracking system or document itself, such as `In Progress`, `Done`, or `On Track`.

### Functional Status

The actual usable state of the deliverable, based on execution-level evidence. This may differ from system status.

## Resolution Rules

### Parent Status vs Child Execution

If a parent issue or page conflicts with child execution items:
- prefer the child execution items for functional truth
- report the parent status separately as system status

Example:
- parent Epic = `In Progress`
- all required tasks = `Done`
- report:
  - Jira status: `In Progress`
  - functional status: shipped or technically complete

### Tracker vs Notion Program Page

If a tracker and a Notion page disagree:
- compare timestamps
- compare ownership
- compare level of detail
- prefer the source tied more directly to current execution

Examples:
- prefer Jira task over undated Notion homepage
- prefer recent Notion project database row with owner/date over an old tracker parent summary

### Meeting Note vs Tracker

If a meeting note says "done" but tracker items remain open:
- inspect whether the note means feature complete, not rollout complete
- distinguish build complete, QA complete, deploy complete, and rollout complete
- report the mismatch explicitly

### Local Repo Note vs Live System

If a local spec or status note conflicts with live tools:
- mark the local note stale
- keep it only as historical context
- prefer the live system unless the live system is missing execution detail

### Relative Dates

When a source says "today", "tomorrow", "next Monday", or similar:
- normalize to `YYYY-MM-DD`
- preserve the original wording only when ambiguity matters

## Reporting Rules

When a conflict remains unresolved, write all four pieces:
1. source A claim
2. source B claim
3. currently preferred claim
4. why that claim is preferred

Use phrasing like:

```markdown
- Conflict:
  - Jira task `TF-123` says ETA `2026-03-25`
  - Notion project page says ETA `2026-03-20`
  - Preferred: Jira task ETA `2026-03-25`
  - Reason: lower-level execution artifact, explicit owner, updated later
```

## Confidence Guidelines

Use:
- `high` when the source is recent, owned, and execution-level
- `medium` when one critical field is missing
- `low` when ownership, timestamp, or execution level is unclear

Lower confidence when:
- the artifact has no owner
- the timestamp is weak or absent
- the status is summary-level only
- the system is known to lag reality

## Minimum Output Standard

Every status-critical output must show:
- what sources were checked
- what conflict existed
- what claim is preferred
- what remains unknown
