# Context Archaeology Workflow

Use this playbook when the goal is to reconstruct the real state of a program from scattered artifacts.

## Objective

Build a trustworthy TPM brief from incomplete, cross-tool evidence.

Always produce:
- a source inventory
- execution truth by component or workstream
- blockers and dependencies
- conflicts and stale claims
- next validation actions

## Step 1: Frame the Initiative

Establish these fields before pulling detail:
- initiative name
- objective
- target milestone or date
- squads or services involved
- expected source systems

If the request is vague, infer the likely systems from links, file paths, Jira keys, or page titles before asking questions.

## Step 2: Inventory the Source Systems

List every system that may contain truth:
- Jira
- Confluence
- Notion
- local specs
- local status notes
- TODO trackers
- meeting notes
- chat or thread exports
- other trackers such as Linear or Asana

Do not let one tool suppress another. The point of archaeology is to compare them.

## Step 3: Find the Lowest Execution-Level Artifact

Do not stop at parent artifacts or summary pages.

| System | Prefer This Lowest Unit |
|---|---|
| Jira | Task, subtask, or linked split task |
| Confluence | explicit decision, blocker, or action item in a dated page |
| Notion | database item, owner-tagged work item, dated action item |
| Linear | issue or sub-issue |
| Asana | task or subtask |
| Docs-only workflow | explicit action item, decision record, or dated checklist item |
| Chat/thread | named owner plus explicit due date or decision statement |

If the system does not expose a clear execution unit, lower confidence.

## Step 4: Extract Evidence Into a Table

Use this schema:

| Field | Description |
|---|---|
| Claim | statement to validate |
| Source System | Jira, Confluence, Notion, local doc, chat, etc. |
| Source Artifact | issue key, page title, database row, note filename |
| Owner | named owner if present |
| Timestamp | explicit updated date or meeting date |
| Level | epic, story, task, page, database item, action item |
| Confidence | confirmed, likely, unknown |
| Notes | contradictions, caveats, or missing fields |

Prefer exact dates in `YYYY-MM-DD`.

## Step 5: Separate Fact From Inference

Mark a claim as:
- `confirmed` when a source provides explicit owner/date/status evidence
- `likely` when the source is recent but incomplete
- `unknown` when evidence is missing, contradictory, or stale

Never present `likely` as settled truth.

## Step 6: Reconcile Contradictions

Use `source-ranking-and-reconciliation.md` to decide which claim to prefer.

Common contradictions:
- parent issue says `In Progress`, but child tasks are complete
- Notion program page says one ETA, Jira task says another
- local spec says one scope, recent sync notes say scope changed
- meeting note says "done", but rollout or QA task is still open

If you cannot resolve the contradiction:
- show both claims
- say which one is currently preferred
- explain why
- say what evidence is still missing

## Step 7: Build the Component Truth Table

Organize the output by component, workstream, or service layer.

For each line item, capture:
- workstream or component
- execution owner
- system status
- functional status
- evidence
- remaining scope
- blocker, if any

This is mandatory for cross-service programs. Do not report only the parent program label.

## Step 8: Produce the Output

Use this structure unless the user asks for another format:

```markdown
## Initiative Summary
- objective
- current phase
- overall health

## Data Source
- systems queried
- query level
- primary artifacts
- freshness window
- caveats

## Confirmed Facts
- ...

## Inferences
- ...

## Conflicts To Resolve
- ...

## Component Truth Table
| Component | Owner | System Status | Functional Status | Evidence | Remaining Scope |
|---|---|---|---|---|---|

## Blockers And Dependencies
- ...

## Next Validation Actions
- [owner] [action] [YYYY-MM-DD]
```

## Failure Modes To Avoid

- reporting only from Epic or summary-page status
- trusting the freshest page without checking execution-level artifacts
- hiding contradictions to make the summary cleaner
- leaving out owner or due date
- reusing stale local notes without saying so
