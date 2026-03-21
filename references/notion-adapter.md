# Notion Adapter

Use this reference when Notion is part of the initiative's source landscape.

## When To Use Notion

Activate the Notion adapter when any of these are true:
- the program home page lives in Notion
- the team tracks delivery in a Notion database
- decisions are logged in Notion pages
- meeting notes or timelines are stored there
- the user provides Notion links as starting context

Do not treat Notion as automatically authoritative. Evaluate the artifacts it contains.

## Install And Authenticate

Install an approved Notion MCP or equivalent API-backed connector for your environment.

The connector should support:
- searching pages
- searching databases
- reading page bodies
- reading database properties
- reading last-edited timestamps
- confirming workspace access

Typical setup requirements:
- authorize a Notion integration or API token
- connect it to the correct workspace
- share relevant pages and databases with the integration

If the connector can read pages but not database properties, do not use it as high-confidence execution truth.

## Run A Smoke Test

Verify all of the following before relying on Notion:
- search can find the target page or database
- the connector can open page content
- the connector can show owner and status properties
- the connector can show a last-edited timestamp

If any check fails, downgrade the confidence of Notion-derived claims.

## Pull These Artifact Types First

Prioritize in this order:
1. project databases with owner, status, and date fields
2. decision logs with dated entries
3. meeting notes with attendees and actions
4. timelines or release trackers
5. program overview pages

Treat overview pages as context, not execution truth, unless no better artifact exists.

## Rank Notion Evidence Correctly

Prefer:
- database rows with explicit owner/status/date
- pages with explicit decisions and timestamps
- recent operational boards over narrative homepages

Distrust:
- undated summary pages
- narrative pages without owners
- stale homepages maintained only occasionally

Use Notion strongly when it contains actual operating records. Use it weakly when it contains only prose.

## Common Failure Modes

Watch for these patterns:
- one page mixing historical notes, current status, and future ideas
- manually maintained status fields that lag real work
- meeting pages that say "done" without clarifying deploy or rollout state
- pages with clear prose but missing timestamps or owners

When those occur:
- lower confidence
- cross-check another adapter if available
- surface the ambiguity in the output

## Use Notion In Archaeology

When running `archaeology`, use Notion to answer:
- what workstreams exist
- who owns them
- what the latest decision was
- what ETA or milestone is currently recorded
- whether a more execution-level tracker is linked

If Notion links out to Jira, Linear, or another tracker:
- follow the link
- prefer the linked execution system for task-level truth
- keep Notion as decision and coordination context

## Example Prompts

Use prompts like:
- `Run staff-tpm archaeology for [program] using Jira, Confluence, and Notion sources`
- `Use staff-tpm status and reconcile the latest Notion project database with Jira tasks`
- `Use staff-tpm deps and treat Notion as the PM coordination source, Jira as the execution source`
