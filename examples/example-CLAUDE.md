# Claude-Compatible Workspace Note

If your workflow uses `CLAUDE.md`, start from `example-WORKSPACE.md` and save the adapted file as `CLAUDE.md`.

Claude-specific guidance:
- keep the file at the workspace root
- point the skill to `docs/ACTIVE-TRACKS.md`, `TODO.md`, and your `specs/` and `status/` folders
- keep squad paths and active program references current

Minimal `CLAUDE.md` skeleton:

```markdown
## TPM Workspace

**TPM:** [Your Name]
**Timezone:** [TZ]
**Last Updated:** [YYYY-MM-DD]

## Squads
| Squad | Folder | Source Code |
|-------|--------|-------------|
| [Squad] | `squad/` | `/path/to/repo` |

## Active Programs
| Program | Spec | Status |
|---------|------|--------|
| [Program] | `cross-squad/specs/program.md` | In Progress |

## Workflow Rules
- Normalize dates into `YYYY-MM-DD`
- Report execution truth from the lowest work unit available
- Distinguish facts, inferences, unknowns, and conflicts
```
