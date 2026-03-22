# Program Truth Framework

This document contains the operating rules and reusable templates behind `program-truth`.

Use it when you need the method, not just the skill entrypoint.

## I. Operating Rules

### 1. Work at the Lowest Execution Level

Status quality depends on query depth.

- Jira: task, subtask, or linked split task
- Notion: database item, dated action item, or owner-tagged work item
- Docs and notes: explicit decision, blocker, or dated action item

Never report Epic or Story status as program truth when lower-level evidence exists.

### 2. Separate System Status From Functional Status

Track both:
- `System status`: what the tracker currently says
- `Functional status`: what is actually shipped, usable, or blocked

This matters when parent tickets lag behind the real delivery state.

### 3. Make Blockers and Risks Operational

Every blocker must include:
- what is blocked
- what is needed
- who is needed
- by when

Every risk must include:
- likelihood
- impact
- mitigation
- owner

### 4. Treat Dependencies as Two-Sided

For every dependency, capture:
- provider
- consumer
- current status
- ETA from both sides
- impact if missed

The dependency is not healthy until both sides align on the ETA.

### 5. Make Source Quality Visible

Every status-critical output should include:
- systems queried
- query level
- primary artifacts
- freshness window
- caveats

### 6. Prefer Evidence Over Clean Narrative

If sources conflict:
1. show both claims
2. say which is currently preferred
3. explain why
4. state what evidence is missing

Do not smooth over contradictions just to make the summary shorter.

## II. Jira Drill-Down Pattern

Use this pattern when the initiative is tracked in Jira.

1. Start from the Epic.
2. Query child Stories with `parent = EPIC-KEY`.
3. Request `issuelinks` on each Story.
4. Follow outward links for `Work item split`.
5. Deduplicate shared tasks before aggregating.
6. Report execution truth from the task layer.

Minimum `Data Source` note for Jira-backed output:

```markdown
## Data Source
- Systems queried: Jira
- Query level: Task via Epic -> Story -> issuelinks
- Primary artifacts: [Epic keys], [Story keys], [Task keys]
- Freshness window: [query date]
- Caveats: [shared tasks, pagination, missing permissions, ...]
```

## III. Reusable Templates

### Program Spec

```markdown
# [Program Name]

**Priority:** [High | Strategic | Medium]
**Status:** [Planning | In Progress | Done]
**Owner:** [TPM Name]
**Last Updated:** [YYYY-MM-DD]

## Objective
[What this program is trying to achieve]

## Current State
[What is true now]

## Stakeholders
| Role | Name |
|------|------|
| Product | |
| Engineering | |
| TPM | |
| QA | |

## Scope
- In scope:
- Out of scope:

## Timeline
| Milestone | Target Date | Status | Notes |
|-----------|-------------|--------|-------|
| | | | |

## Dependencies
| Provider | Consumer | Dependency | ETA | Notes |
|----------|----------|------------|-----|-------|
| | | | | |

## Risks
| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| | | | | |

## Open Decisions
- [Decision needed]
```

### Meeting Notes

```markdown
# [Meeting Name] — [YYYY-MM-DD]

- **Context:** [one line]
- **Attendees:** [names]
- **References:** [docs, tickets, pages]

## Decisions
- [decision with rationale]

## Blockers and Risks
- BLOCKER — [what is needed] — [by when] — waiting on [who]

## Next Actions
| Owner | Action | Due Date |
|-------|--------|----------|
| | | |
```

### Weekly Status

```markdown
# Weekly Status — [Program]
**Week of:** [YYYY-MM-DD]

## Summary
[2-3 sentences]

## Data Source
- Systems queried:
- Query level:
- Primary artifacts:
- Freshness window:
- Caveats:

## Progress This Week
- [completed or materially advanced item]

## Plan Next Week
- [next steps]

## Risks and Blockers
| Item | Owner | Impact | Mitigation | Due Date |
|------|-------|--------|------------|----------|
| | | | | |

## Dependencies
| Provider | Consumer | Status | ETA | Notes |
|----------|----------|--------|-----|-------|
| | | | | |

## Jira Status vs Functional Status
- [only include when they differ]
```

### Leadership Review

```markdown
# Program Review — [Program]
**Date:** [YYYY-MM-DD]

## Summary
[current health, milestone confidence, main issue]

## Milestones
| Milestone | Target Date | Confidence | Notes |
|-----------|-------------|------------|-------|
| | | | |

## Execution Truth by Workstream
| Workstream | Owner | System Status | Functional Status | Remaining Scope |
|------------|-------|---------------|-------------------|-----------------|
| | | | | |

## Risks
| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| | | | | |

## Escalations and Decisions Needed
- [clear ask]
```

## IV. Anti-Patterns

Avoid these:
- reporting only from epics or summary pages
- calling something done because a meeting note said so
- listing blockers without owner or date
- listing risks without mitigation
- tracking dependencies from only one side
- merging facts and inferences into one paragraph
- hiding stale or contradictory claims

## V. Workspace Conventions

Use a workspace structure that makes current context easy to inspect.

Typical layout:

```text
tpm/
├── squad-a/specs/
├── squad-a/status/
├── squad-b/specs/
├── squad-b/status/
├── cross-squad/specs/
├── cross-squad/status/
├── TODO.md
└── CLAUDE.md
```

Start from `examples/example-WORKSPACE.md` and adapt to your runtime.
