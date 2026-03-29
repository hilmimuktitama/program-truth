# Initial Context Pack

Use this before asking for `daily`, `status`, `archaeology`, `review`, `deps`, or `risks`.

The goal is to give the AI a minimum source pack it can actually reason over instead of a prompt with no operating context.

## Next Step

```text
Use program-truth to start from Jira EPIC-123, inspect the linked execution artifacts, and gather the first useful context for this workspace.
```

## If Blocked

- If Jira or Confluence access is not confirmed, call `mcp__atlassian__getAccessibleAtlassianResources()`.

## After That

- Ask for `status`, `deps`, or `archaeology` only after task-level evidence is available.

## Initiative

**Name:** [Program or launch name]  
**Objective:** [What this initiative is trying to achieve]  
**Current Question:** [What you want the AI to answer first]  
**Target Milestone Or Date:** [YYYY-MM-DD or reporting window]  
**Last Updated:** [YYYY-MM-DD]

## Starting Anchor

- Anchor: [EPIC-123, board link, Confluence page, Notion database, or local note]
- Anchor Type: [jira | confluence | notion | local]
- Why it is current: [one line]

## Real Source Set

| System | What It Contains | Link / Path / Key | Freshness | Can The AI Read It? |
|--------|------------------|-------------------|-----------|---------------------|
| Jira | task-level execution | [EPIC-123, story links, filter, board] | [YYYY-MM-DD] | [Yes / No] |
| Confluence | sync notes, decisions | [page link or title] | [YYYY-MM-DD] | [Yes / No] |
| Local file | recent execution note | `status/2026-03-20.md` | [YYYY-MM-DD] | [Yes / No] |

## Ignored Bootstrap Context

- [nested `program-truth` clone path, if present]
- [other local bootstrap-only files excluded from evidence]

## Scope

| Squad / Service | Owner | Repo / Area | Notes |
|-----------------|-------|-------------|-------|
| [Identity] | [Name] | `/path/to/repo` | [Optional] |
| [Billing] | [Name] | `/path/to/repo` | [Optional] |

## Known Claims To Validate

- [Claim that may be stale or disputed]
- [Current ETA or milestone to confirm]
- [Blocker, dependency, or owner question]

## Missing Access Or Confidence Limits

- [System the AI cannot read yet]
- [Source that may be stale]
- [Unknown owner, unknown date, or unclear dependency]
