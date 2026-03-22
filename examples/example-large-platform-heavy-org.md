# Example: Large / Platform-Heavy Org

## Scenario

A launch depends on `identity`, `billing`, `quota service`, and a central `platform gateway`. The platform roadmap in Notion says the dependency lands on `2026-06-10`, but the execution tracker still shows a critical task open with a later ETA.

## Org Shape

- platform team plus multiple product teams
- several TPMs or program operators
- roadmap and planning context spread across Notion and Confluence
- execution truth primarily in Jira

## Source Systems

- Jira tasks
- Notion program database or roadmap page
- Confluence design and sync pages
- local architecture or status notes

## Problem

Leadership sees a roadmap date that suggests the program is on track. Execution-level evidence says the `platform gateway` task is still open, making the launch functionally blocked even though planning documents look green.

## Prompt

`Use program-truth to reconstruct the true readiness of the platform-gated launch from Jira, Notion, Confluence, and local notes. Show the conflict between roadmap ETA and execution ETA, report system status versus functional status, and identify the critical-path dependency.`

## What The Skill Should Do

1. compare the Notion roadmap ETA with the Jira execution ETA
2. prefer the lower-level owned execution artifact if it is fresher and more explicit
3. keep the planning document visible as a conflicting claim rather than deleting it
4. show system status versus functional status separately
5. identify the `platform gateway` dependency as the critical path
6. state what remains unknown if rollout or validation tasks are still unclear

## Expected Output Shape

```markdown
## Initiative Summary
- Objective: enable launch through platform gateway by 2026-06-12
- System status: roadmap shows on track
- Functional status: blocked on platform gateway completion

## Data Source
- Systems queried: Jira, Notion, Confluence, local architecture note
- Query level: execution task / roadmap item / dated sync note
- Primary artifacts: `PLAT-1442`, Notion roadmap row `Gateway rollout`, sync note 2026-06-08
- Freshness window: 2026-06-06 to 2026-06-09
- Caveats: roadmap item is planning-level only

## Conflicts To Resolve
- Notion roadmap says ETA 2026-06-10
- Jira task `PLAT-1442` says ETA 2026-06-13
- Preferred: Jira task ETA 2026-06-13
- Reason: lower-level execution artifact, explicit owner, updated later

## Execution Truth by Workstream
| Workstream | Owner | System Status | Functional Status | Remaining Scope |
|---|---|---|---|---|
| Identity | Team A | In Progress | ready | rollout check |
| Billing | Team B | In Progress | ready | none |
| Quota Service | Team C | In Progress | ready | none |
| Platform Gateway | Platform Team | In Progress | blocking | complete gateway task + production validation |

## Next Validation Actions
- Platform TPM confirm whether post-deploy validation can finish by 2026-06-12
```

## Why This Example Matters

This is the outsider-proof example for a large organization. It shows that the skill is not a Jira-only status formatter; it is a reconciliation method for environments where roadmap truth, execution truth, and functional truth often diverge.
