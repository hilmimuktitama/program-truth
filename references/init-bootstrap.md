# Init Bootstrap Workflow

Use this reference when the request is to get `program-truth` working quickly in a thin or empty workspace.

The goal of `init` is not to ask the user to hand-build every file. The goal is to inspect what already exists, guide connector setup where useful, and bootstrap the minimum local context set in one pass.

## What `init` Should Do

1. inspect the current workspace
2. identify which context files already exist
3. detect likely source systems from links, issue keys, file names, or user request
4. recommend which connectors are worth wiring now
5. scaffold the minimum local files and folders in one batch
6. leave the user with the exact next prompt to run

## Minimum Local Scaffold

Prefer this minimum set:

- runtime context file such as `CLAUDE.md` when the client uses one
- `INITIAL-CONTEXT.md`
- `TODO.md`
- `cross-squad/specs/`
- `cross-squad/status/`

Add squad-specific `specs/` and `status/` folders only when the workspace already implies multiple squad lanes.

## Detect Likely Systems

Treat these signals as enough to proactively guide connector setup:

- Jira keys such as `ABC-123`
- Confluence links or page titles
- Notion links or references to Notion databases
- roadmap pages that are likely not execution truth
- user requests mentioning Jira, Confluence, or Notion

If none of those appear, do not force connector setup. Bootstrap local context first.

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

## Next Prompt
- exact prompt to run after bootstrap
```

## First Follow-Up Prompt

After `init`, prefer a readiness prompt such as:

```text
Use program-truth to inventory available sources, identify the lowest execution-level artifacts, and tell me what is missing before making a priority call.
```

Only after that should the workflow move into `daily`, `status`, `archaeology`, `deps`, or `risks`.
