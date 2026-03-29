# Init Bootstrap Workflow

Use this reference when the request is to get `program-truth` working quickly in a thin or empty workspace.

The goal of `init` is not to ask the user to hand-build every file or front-load a full brief. The goal is to inspect what already exists, guide connector setup where useful, bootstrap the minimum useful local context in one pass, and start from one real anchor artifact.

When deterministic behavior matters, prefer the local helper `scripts/bootstrap_program_truth.py`. The skill should treat that script as the bootstrap engine for `init` when it is available.

## What `init` Should Do

1. inspect the current workspace
2. identify which context files already exist
3. prefer an explicit anchor when the user already has one
4. detect likely source systems from links, issue keys, file names, or user request
5. recommend which connectors are worth wiring now
6. search the workspace for candidate starting artifacts
7. ask for one strong anchor artifact when the workspace is still thin
8. scaffold the minimum local files only when they are useful
9. leave the user with either direct source discovery or the exact next prompt to continue it
10. if no usable anchor exists yet, ask for it immediately in one compact reply template before suggesting any readiness prompt

## Deterministic Local Helper

If `scripts/bootstrap_program_truth.py` exists, `init` should prefer running it before falling back to a chat-only interview.

Recommended usage:

- shell mode: `python scripts/bootstrap_program_truth.py --anchor ABC-123 --system jira`
- preview mode: `python scripts/bootstrap_program_truth.py --anchor ABC-123 --system jira --dry-run`
- AI-first mode: `python scripts/bootstrap_program_truth.py --json-in - --json-out`

The helper should:

- inspect the workspace
- discover candidate sources in local files
- write the minimum scaffold in one batch
- emit machine-readable bootstrap results for the agent to summarize

Expected JSON keys:

- `workspace_state`
- `files_written`
- `candidate_sources`
- `connector_recommendations`
- `captured_context`
- `remaining_gaps`
- `bootstrap_questions`
- `next_prompt`

## Minimum Local Scaffold

Prefer this minimum set:

- `INITIAL-CONTEXT.md`
- `TODO.md` only when follow-up actions exist
- runtime context file such as `CLAUDE.md` only when the client needs it or the user asks for it
- `cross-squad/specs/` and `cross-squad/status/` only when the workspace already implies multiple workstreams or the user asks for a fuller scaffold

Add squad-specific `specs/` and `status/` folders only when the workspace already implies multiple squad lanes.

If `INITIAL-CONTEXT.md` is missing or nearly empty, do not stop at "fill this in manually" by default. Ask for one usable anchor first and write a first-pass version around that anchor.

## Detect Likely Systems

Treat these signals as enough to proactively guide connector setup:

- Jira keys such as `ABC-123`
- Confluence links or page titles
- Notion links or references to Notion databases
- roadmap pages that are likely not execution truth
- user requests mentioning Jira, Confluence, or Notion

If none of those appear, do not force connector setup. Bootstrap local context first.

## Search For Candidate Sources

Before asking the user for manual Jira keys, filters, Confluence pages, or Notion links, search the local workspace for likely starting artifacts.

Look for:

- Jira keys in specs, notes, TODOs, and status files
- Jira board or filter URLs
- Confluence links or pasted page titles
- Notion links or database references
- recent local specs, decision logs, weekly status notes, and meeting notes

If candidates exist:

- list the strongest ones
- explain why they are likely useful
- propose them as the first sources to inspect

When the current workspace is the `program-truth` skill repo itself, ignore package docs, examples, and tests so the helper does not self-bootstrap from sample Jira keys.

Only ask the user for manual IDs or links when the workspace search yields nothing usable.

## Interview-Style Bootstrap

When the workspace is empty or nearly empty, `init` should help populate `INITIAL-CONTEXT.md` from what the user already knows, but it should optimize for speed.

Capture this first:

- one anchor artifact:
  - Jira key, filter, or board
  - Confluence page or space
  - Notion page or database
  - local spec, status note, or meeting note path

Then capture these only if needed:

- optional initiative name
- optional target milestone, date, or reporting window
- optional systems in scope if the anchor does not make that obvious

If more fields are still missing:

- ask only for the minimum additional details needed
- keep the questions short and operational
- write the file with explicit placeholders for the remaining gaps

The goal is a usable first-pass context pack and a source inventory, not a perfect brief.

If the helper script is available, pass known context into it first and ask follow-up questions only for the remaining gaps it returns.
Do not stop at placeholders plus a readiness prompt when the workspace is still empty. The next user action should be a one-message answer with one anchor artifact.

## Connector Guidance

### Jira / Confluence

If Jira or Confluence is likely in play:

- say that Atlassian MCP or equivalent read access is recommended
- explain that task-level Jira access matters more than parent-summary access
- give a smoke test such as `mcp__atlassian__getAccessibleAtlassianResources()`
- ask the user to confirm whether the connector is already available before assuming it works

### Notion

If Notion is likely in play:

- say that an approved Notion MCP or equivalent connector is recommended
- require search, page reads, database property reads, owner/status/date visibility, and timestamps
- explain that Notion should be downgraded if it only exposes prose and not operating fields
- give a smoke test: search for the target page or database and confirm owner/status/date visibility

## Output Shape

When running `init`, prefer this structure:

```markdown
## Init Summary
- current workspace state
- likely systems in play

## Bootstrap Plan
- files and folders to create or update
- what each file is for

## Connector Setup
- Jira / Confluence: [needed or not needed]
- Notion: [needed or not needed]
- smoke tests

## Best Candidate Sources Found
- [source]
- [source]

## Captured Context
- initiative:
- current question:
- likely systems:
- remaining gaps:

## Next Prompt
- exact next source-discovery prompt when needed
```

## First Follow-Up Prompt

After anchored `init`, prefer a source-discovery prompt such as:

```text
Use program-truth to start from Jira ABC-123, inventory the available sources, identify the lowest execution-level artifacts, and gather the first useful context for this workspace.
```

Use `onboard` only as a compatibility alias when a client already routes source discovery through that verb.
Only after source discovery should the workflow move into `daily`, `status`, `archaeology`, `deps`, or `risks`.
