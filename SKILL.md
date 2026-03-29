---
name: program-truth
description: Evidence-first program truth workflow for reconstructing program reality across Jira, Confluence, Notion, local docs, and meeting notes. Use it to produce status, dependency, risk, review, and meeting artifacts with clear owners, dates, facts, inferences, and unknowns.
---

# Program Truth

Use this skill when the user needs program output that is operationally trustworthy, not just well formatted.

## Purpose

This skill is for mid-flight programs where truth is scattered across trackers, docs, notes, and chat.

Its default job is to:
- find the lowest execution-level evidence available
- reconcile contradictions instead of flattening them
- separate facts, inferences, unknowns, and follow-ups
- produce outputs that are usable by PMs, EMs, and leadership

Read these references only as needed:
- `README.md` for the package overview
- `INSTALL.md` for setup and runtime notes
- `references/framework.md` for templates and operating rules
- `references/init-bootstrap.md` for guided workspace bootstrap and connector setup
- `references/archaeology-workflow.md` for the reconstruction workflow
- `references/source-ranking-and-reconciliation.md` for conflict handling
- `references/notion-adapter.md` for Notion-specific caveats

## When To Use

Apply this skill when the user asks to:
- ramp into a program quickly
- reconstruct initiative status from incomplete sources
- write a weekly status or leadership review
- map cross-squad dependencies
- build or refresh a risk register
- turn a meeting or thread into explicit decisions and actions
- translate technical discussion into explicit operational actions

Do not use it as a shortcut for generic summarization when no source reconciliation is needed.

## Required Behaviors

1. Work at the execution level.
   - Jira: Task, subtask, or linked split task
   - Notion: database item, dated action item, or owner-tagged work item
   - Docs and notes: explicit decision, blocker, or action item
2. Never report Epic or Story status as program truth when lower-level evidence exists.
3. Normalize relative dates into `YYYY-MM-DD`.
4. Distinguish:
   - confirmed facts
   - inferences
   - unknowns
   - conflicts that still need follow-up
5. Give every blocker a named owner, what is needed, and a target date.
6. Give every risk a mitigation and owner.
7. If a live adapter is unavailable, continue with local artifacts and state the confidence downgrade.
8. For `init`, prefer guided bootstrap over asking the user to create files or folders one-by-one.
9. When Jira, Confluence, or Notion are likely systems in play, explicitly guide connector setup and smoke tests before asking for status-critical output.
10. After connector setup or connector detection, search the local workspace for candidate starting artifacts before asking the user for Jira keys, filters, page links, or Notion links manually.
11. When the workspace is empty or thin, prefer a single-anchor bootstrap over a full questionnaire. Ask for one strong anchor artifact and let the skill discover the rest before requesting broader context.
12. If `scripts/bootstrap_program_truth.py` exists in the workspace or installed skill package, prefer running it for `init` when deterministic local bootstrap is useful. Treat its output as the baseline workspace inspection and scaffold result.
13. Do not jump to the readiness prompt when no starting artifact exists yet. End `init` by asking for one anchor artifact in one message.

## Minimum Context Pack

Before any prioritization or status-critical action such as `daily`, `status`, `archaeology`, `review`, `deps`, or `risks`, confirm that the request or workspace provides:

1. initiative name or clearly bounded scope
2. objective or operating question
3. target milestone, reporting window, or relevant date
4. squads, services, or workstreams involved
5. at least one recent status source
6. at least one current execution source
   - preferred: Jira, Confluence, Notion, Linear, Asana, or another live system artifact
   - acceptable fallback: a recent local checklist, meeting note action item, or task list with owners and dates
7. any known missing access, stale docs, or confidence limits

If critical context is missing, do not invent priorities, status, or confidence.

Return this instead:

```markdown
## Missing Context Pack
- Current request:
- Available context:
- Missing context:
- Best next sources to gather:
- Recommended next prompt:
```

For `daily`, `status`, `archaeology`, `review`, `deps`, and `risks`, stop after the checklist until the missing context is provided.

## Source Hierarchy

Trust the freshest owned operational source unless lower-level execution evidence disproves it.

Use this order:
1. lowest-level execution artifact in a live system
2. recent dated sync notes or decision docs
3. maintained local specs or status files
4. offline notes or thread fragments

If two sources disagree:
1. show both claims
2. say which claim is currently preferred
3. explain why
4. state what evidence is still missing

## Pre-Flight

Before any status-critical action such as `archaeology`, `status`, `deps`, `review`, or `risks`:

1. Read `references/framework.md` Section I when this repo is the workspace.
2. Read a workspace source pack such as `INITIAL-CONTEXT.md` when present.
3. Read any workspace-specific active-tracks file or Jira query pack only when the workspace actually has one.
4. Inventory the source systems in play before trusting one platform.
5. Map each source to its lowest execution-level artifact.
6. Decide which live adapters are actually available.
7. Record any missing access, stale docs, or confidence limits.

## Action Router

Infer the action from the request. If unclear, default to `init`.

- `archaeology`: reconstruct execution truth across multiple systems
- `init`: bootstrap the workspace, guide connector setup, scaffold the minimum local context set, and get one usable anchor
- `onboard`: compatibility alias for anchored source discovery when the client already uses that verb
- `status`: generate a weekly status backed by evidence
- `review`: prepare a leadership-ready review
- `deps`: map provider -> consumer dependencies
- `risks`: build a prioritized risk register
- `meeting`: capture meeting output with owners and due dates
- `comms`: draft stakeholder communication by channel
- `daily`: identify the highest-leverage priorities for today
- `spec`: create or refresh a program spec
- `retro`: prepare retrospective materials
- `translate`: convert technical or product discussion into TPM implications

## Standard Workflow

1. Read local context first:
   - source pack such as `INITIAL-CONTEXT.md` when present
   - workspace-specific active-tracks or query-pack files when present
   - `TODO.md` when present
   - runtime context file such as `CLAUDE.md` when present
   - relevant specs, status notes, and decisions
   - when running `init`, inspect what already exists before proposing new files
2. Inventory live systems and adapters.
3. Pull execution-level evidence from each available source.
4. Reconcile contradictions using `references/source-ranking-and-reconciliation.md`.
5. Produce the artifact with explicit facts, inferences, unknowns, and conflicts.
6. Ensure every blocker, dependency, and action has an owner and date.
7. Stamp freshness when status depends on live verification:
   - `Live-Verified (source): YYYY-MM-DD TZ`

## Output Contract

Use a `Data Source` block in every status-critical output:

```markdown
## Data Source
- Systems queried: [Jira, Confluence, Notion, local specs, meeting notes, ...]
- Query level: [task / database item / action item / other lowest work unit]
- Primary artifacts: [list]
- Freshness window: [dates or last updated timestamps]
- Caveats: [missing permissions, stale docs, pagination, unresolved conflicts, ...]
```

Minimum quality bar before sending:
- every critical claim has a source or is marked as inference
- every unresolved contradiction is visible
- every blocker has owner and due date
- every risk has mitigation and owner
- every relative date has been normalized

## Action Outputs

### `init`

Produce:
- workspace inspection
- minimum local scaffold plan
- connector setup guidance for Jira/Confluence and Notion when those systems are likely in play
- smoke tests for the connectors worth setting up
- best candidate sources found in the local workspace
- one-anchor bootstrap when the workspace is empty or thin
- a one-pass file creation plan instead of one-by-one manual scaffolding
- the next source-discovery prompt when `init` did not already complete that step

If `scripts/bootstrap_program_truth.py` is available and local execution is appropriate, prefer this order:
1. run the bootstrap helper with the best context you already have
2. read its workspace inspection, candidate sources, remaining gaps, and `next_prompt`
3. summarize the result back to the user
4. only fall back to pure chat bootstrap when the script is unavailable or cannot be run

When you run the helper in AI-first mode, prefer structured input and output:
- input keys should prefer `anchor` and `anchor_system` when known
- input: `--json-in -`
- output: `--json-out`

The helper's output contract is:
- `workspace_state`
- `files_written`
- `action_plan`
- `candidate_sources`
- `bootstrap_context_paths`
- `connector_recommendations`
- `captured_context`
- `remaining_gaps`
- `bootstrap_questions`
- `next_prompt`

When local writes are appropriate, prefer this order:
- `INITIAL-CONTEXT.md`
- `TODO.md` only when follow-up actions exist
- runtime context file such as `CLAUDE.md` only when the client needs it or the user asked for it
- minimal `specs/` and `status/` folders only when the workspace clearly implies multiple workstreams or the user asked for a fuller scaffold

If `INITIAL-CONTEXT.md` is missing or mostly empty, prefer this order:
1. search the workspace for candidate sources
2. capture whatever the user already knows from the current conversation
3. ask for one anchor artifact when the workspace still has no usable source
4. write a first-pass `INITIAL-CONTEXT.md` instead of leaving it blank
5. ask for broader fields such as initiative name or target date only after the anchor-driven source inventory shows they are actually needed

If you are not writing files yet, return a ready-to-apply scaffold plan with exact file paths and starter contents.

Before asking the user for manual starting points, search local files for:
- Jira keys such as `ABC-123`
- Jira filter URLs or board links
- Confluence URLs, page titles, or copied references
- Notion URLs or database references
- recent local specs, status notes, decisions, and meeting notes

If candidate sources are found, report them under `Best Candidate Sources Found` and use them as the proposed starting point.
Ask the user for manual IDs, filters, or links only when the workspace search does not produce usable candidates.
If the workspace contains a nested `program-truth` clone, report it as bootstrap-only context and exclude it from the evidence/source-system set.

When bootstrapping from a thin workspace, target this first:
- one anchor artifact:
  - Jira key, filter, or board
  - Confluence page or space
  - Notion page or database
  - local spec, status note, or meeting note path
- optional initiative name
- optional target milestone or reporting date
- optional systems in scope when already known

If broader fields remain unknown, write the file with explicit placeholders and list the gaps under `Missing Access Or Confidence Limits`, but do not block the source-inventory step if a strong anchor exists.
Lead the output with `Next Step`, `If Blocked`, and `After That` so a new user can tell what to do without reading the full context pack first.

### `onboard`

Treat this as a compatibility alias for anchored `init` source discovery.

Produce:
- source inventory starting from the anchor
- lowest execution-level artifacts reachable from that anchor
- likely systems, workstreams, owners, and dates inferred from the source set
- missing-context checklist limited to the gaps that actually block useful output
- a 48-hour action plan or next-query plan when more archaeology is still needed

Prefer prompts shaped like:
- `Use program-truth init from Jira ABC-123 to inspect this workspace and gather the first useful context.`
- `Use program-truth to start from this Confluence page, inventory the available sources, and tell me what else you need.`
- `Use program-truth to start from this Notion database and inventory the first useful sources.`

### `archaeology`

Produce:
- initiative framing
- source inventory
- component or workstream truth table
- blockers and dependencies
- stale claims detected
- open conflicts
- 48-hour validation plan if gaps remain

### `status`

Reuse `archaeology`, then produce:
- summary
- progress this week
- plan next week
- risks and blockers
- dependencies
- decisions needed
- Jira status versus functional status when they differ

### `review`

Reuse `archaeology`, then produce:
- milestone health
- execution confidence
- risk register
- escalations and asks

### `deps`

Reuse `archaeology`, then report:
- provider
- consumer
- current status
- ETA from both sides
- impact if blocked
- escalation path

### `risks`

Reuse `archaeology`, then report:
- risk
- likelihood
- impact
- mitigation
- owner
- trigger signal

### `meeting`

Produce in this order:
1. context and attendees
2. decisions
3. blockers and risks
4. next actions with owner and due date

### `comms`

Always include:
- the ask
- impact
- what has already been tried
- responder or owner needed
- due date or decision date

### `daily`

Produce:
- Top 1 must move today
- Top 2 must not get worse today
- slip risks and mitigations

### `spec`

Include:
- objective and current status
- stakeholders
- scope and timeline
- dependencies
- risks
- open decisions

### `retro`

Include:
- wins
- misses
- root causes
- action items with owner and due date

### `translate`

Produce:
- plain-language summary
- program impact
- key follow-up questions
- next TPM actions

## Write Safety

Ask for explicit user confirmation before any state-changing operation in an external system.

This applies to:
- Jira create, edit, comment, assign, or transition
- Confluence create, edit, or comment
- Notion writes through any connector
- any equivalent external write path

Protocol:
1. prepare the exact payload
2. show the proposed change
3. ask whether to proceed
4. write only after clear approval
