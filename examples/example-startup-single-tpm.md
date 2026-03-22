# Example: Startup / Single TPM

## Scenario

A single TPM is coordinating a launch across `identity` and `notifications`. The engineering lead says the launch is on track, but the last customer-facing rollout step may still be open.

## Org Shape

- 1 TPM
- 2 engineering squads
- low process maturity
- many decisions happen in chat before they land in docs

## Source Systems

- Jira
- chat export or thread summary
- local launch checklist
- one recent meeting note

## Problem

The chat thread says the launch is "done," but the Jira rollout task is still `In Progress` and the local checklist has no owner for the production communication step.

## Prompt

`Use program-truth to reconstruct the true launch status for identity + notifications from Jira, chat notes, and the local checklist. Distinguish system status from functional status, and call out any missing owners or dates.`

## What The Skill Should Do

1. inventory the sources instead of trusting the chat summary
2. drill from any Jira parent item down to the actual rollout task
3. compare the chat claim with the task status and checklist detail
4. separate:
   - confirmed facts
   - inferences
   - unknowns
5. identify whether "done" means build complete, deploy complete, or rollout complete
6. flag the missing owner/date on the production communication step

## Expected Output Shape

```markdown
## Initiative Summary
- Objective: ship identity + notifications launch on 2026-04-18
- Jira status: In Progress
- Functional status: build complete, rollout incomplete

## Data Source
- Systems queried: Jira, chat summary, local launch checklist, meeting note
- Query level: rollout task / checklist item / dated note
- Primary artifacts: `PLAT-412`, `NOTIF-288`, launch-checklist.md, 2026-04-16 launch sync
- Freshness window: 2026-04-15 to 2026-04-17
- Caveats: chat summary is not execution-level evidence

## Confirmed Facts
- Jira rollout task `PLAT-412` remains `In Progress`
- customer notification step has no explicit owner in the checklist

## Inferences
- the engineering lead likely meant build complete, not rollout complete

## Unknowns
- whether support and customer comms can still be completed before 2026-04-18

## Blockers And Dependencies
- BLOCKER — assign owner for production communication — needed by 2026-04-18 — waiting on product lead
```

## Why This Example Matters

This shows that `program-truth` is useful even when the organization is small and the tooling is messy. The value is not "more process"; it is preventing a chat-level green status from masking an incomplete launch.
