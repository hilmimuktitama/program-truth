# TPM Workspace Template

Use this as the baseline context file for a TPM workspace. Rename or adapt it to whatever your client expects.

## Template Body

**TPM:** [Your Name]
**Location:** [City, Country]
**Timezone:** [TZ]
**Last Updated:** [YYYY-MM-DD]

## Squads

| Squad | Folder | Source Code |
|-------|--------|-------------|
| [Squad A] | `squad-a/` | `/path/to/repo` |
| [Squad B] | `squad-b/` | `/path/to/repo` |

## Active Programs

| Program | Scope | Spec | Status |
|---------|-------|------|--------|
| [Program A] | Cross-squad | `cross-squad/specs/program-a.md` | In Progress |
| [Program B] | Squad A | `squad-a/specs/program-b.md` | Planning |

## Workflow Rules

- Every meeting must produce a decision, blocker, or next action.
- Normalize dates into `YYYY-MM-DD`.
- Report execution truth from the lowest work unit available.
- Keep `TODO.md` current.
- Distinguish facts, inferences, unknowns, and conflicts.

## Current Priorities

- [Top item that must move this week]
- [Known blocker to resolve]
- [Dependency to watch]

## Session Context Log

### [YYYY-MM-DD]
- [Initiative] - [key finding]
- [Initiative] - [status change]
- [Initiative] - [follow-up needed]

## Key References

- `docs/ACTIVE-TRACKS.md`
- `TODO.md`
- `cross-squad/specs/`
- `cross-squad/status/`
