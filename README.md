# Program Truth

[![Quality](https://github.com/hilmimuktitama/program-truth/actions/workflows/quality.yml/badge.svg)](https://github.com/hilmimuktitama/program-truth/actions/workflows/quality.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Program Truth gathers and synthesizes execution-level evidence from available sources into a canonical, machine-readable status artifact; Truth Tools validates it.**

Truth Tools is an evidence-first technical-program reliability toolkit combining provenance-preserving evidence intake, defensible timeline compilation, agent-guided status synthesis, and deterministic pre-publication review.

Built for mid-flight programs where trackers disagree, parent-ticket status looks cleaner than the actual work, and leadership updates need evidence instead of optimism.

## What This Package Does And Does Not Own

- **Does:** source discovery, workspace bootstrap, evidence gathering, reconciliation, and synthesis into a `status-artifact.json` plus a human-readable `status-report.md`.
- **Does not:** validate artifacts, parse timelines, or run quality checks — that is [Truth Tools](https://github.com/hilmimuktitama/truth-tools), invoked with `truth-tools review --input <path>`.
- **Does not:** bundle or implement connectors. Program Truth guides the connectors already available in your client (Atlassian MCP, Notion MCP, or equivalent) but ships none.
- **Does not:** write to external systems. Every Jira, Confluence, or Notion write waits for your explicit confirmation.

```text
Program Truth (gathers + synthesizes evidence) -> StatusArtifact -> Truth Tools (validates)
```

## Quick Start

### 1. Install

```bash
npm install -g program-truth
program-truth install codex   # or: claude, all
program-truth doctor
```

Requires Node 22 or newer. See [INSTALL.md](INSTALL.md) for PowerShell variants, verification, and troubleshooting.

### 2. Init from one anchor

Paste this into the chat with one real artifact (a Jira key, Confluence page, Notion database, or local status note):

```text
Use program-truth init from Jira DEMO-1234 to inspect this workspace, identify the real source set, and write the minimum useful context files.
```

Deterministic fallback:

```bash
program-truth bootstrap --anchor DEMO-1234 --system jira --dry-run
```

### 3. Ask for what you need, get the artifact

```text
Use program-truth status
```

Every status-critical action (`status`, `daily`, `archaeology`, `review`, `deps`, `risks`) produces:

1. **Canonical artifact** — `status-artifact.json` conforming to [`schemas/status-artifact.schema.json`](schemas/status-artifact.schema.json); see the full example at [`examples/status-artifact.json`](examples/status-artifact.json).
2. **Human report** — Markdown companion; see [`examples/status-report.md`](examples/status-report.md).

Then validate:

```bash
truth-tools review --input status-artifact.json
```

The pinned Truth Tools review is authoritative for artifact quality and program health. The shipped examples cover both a clean `on_track` result and a clean `blocked` result; the local deterministic smoke also resolves active risk/unknown signals conservatively and reports unsupported or missing health assessments for review.

## What Good Output Looks Like

```markdown
## Data Source
- Systems queried: Jira, Confluence, local status notes
- Query level: task / action item
- Caveats: Notion unavailable; one status page last updated 2026-03-14

## Current Truth
- Release is yellow because provider work is complete but consumer rollout tasks are still open.
- Jira epic status is green, but task-level evidence does not support a green release call.

## Open Unknowns
- Owner for the migration fallback test is missing.
- No dated confirmation of staging sign-off after 2026-03-20.
```

## What Makes It Different

- Jira is not treated as truth unless the query reaches the task level.
- The artifact is the canonical `StatusArtifact` v2 contract shared with Truth Tools (`kind`, `schema_version: 2.0.0`, `as_of`, `initiative`, `policy`, `sources`, explicit `health_assessment`, reviewed `claims` with locators); no bespoke machine fields.
- Parent (tracker) status is reported separately from functional status in the human report; tracker optics cannot overwrite lower-level execution data.
- Facts, inferences, and unknowns stay separate in the report; unknowns stay visible instead of becoming confident prose.
- Every blocker has an owner and date; every risk has a mitigation and owner.
- Every external write requires explicit confirmation, recorded in the report.

## Examples

- [Startup / Single TPM](examples/example-startup-single-tpm.md)
- [Mid-Size / Multi-Squad](examples/example-mid-size-multi-squad.md)
- [Large / Platform-Heavy Org](examples/example-large-platform-heavy-org.md)

## Case Study And Evaluation

- [Evaluation summary](docs/benchmarks/program-truth-benchmark.md) — honest framing of what has and has not been proven.
- [Historical A/B case study](case-studies/historical-ab-case-study.md) — the one live scenario that exists, with raw outputs and all limitations preserved.
- [Blinded human review template](evaluation/blinded-human-review-template.md) — the review procedure to use for future evaluations.

The release fixtures exercise both supported outcomes: `examples/status-artifact.json` reviews as `pass` + `blocked`, while `examples/status-artifact-on-track.json` reviews as `pass` + `on_track`.

## Documentation

- [SKILL.md](SKILL.md) — operating contract for the skill (full action list, context pack, artifact contract)
- [INSTALL.md](INSTALL.md) — setup, verification, and adapter reference
- [references/framework.md](references/framework.md) — operating rules and reusable templates
- [CHANGELOG.md](CHANGELOG.md) — release history
- [MIGRATION.md](MIGRATION.md) — upgrading from 0.1.x through 0.3.0
- [SECURITY.md](SECURITY.md) — vulnerability reporting
- [docs/release-process.md](docs/release-process.md) — how releases are cut and published

## Release

Releases are published by the trusted OIDC workflow after a GitHub release is
published for the matching version tag. A manual workflow dispatch is also
available with a required tag. Both paths check out the exact tag, run the
complete verification sequence, and publish without an npm token. See
[docs/release-process.md](docs/release-process.md) for the sequence and
rollback procedure.

## Repository Status

This is an experimental public release, published for use and reference while the workflow continues to be validated.

- Clone it, copy it into your local skills directory, and adapt it for your environment.
- Contributions should preserve the canonical artifact contract, evidence-first methodology, and explicit external-write confirmation posture. Open an issue before substantial changes.
- Support and fixes are best-effort.

## Package Map

- `SKILL.md`: operating contract for the skill
- `INSTALL.md`: cross-platform setup, verification, and adapter reference
- `bin/program-truth.js`: npm CLI entrypoint
- `lib/bootstrap.js`: deterministic Node bootstrap helper
- `lib/install.js`: installer and doctor support
- `schemas/`: canonical `StatusArtifact` 2.0.0 contract — byte-exact copies of the flagship truth-tools schemas (`source`, `source-ref`, `claim`, `status-artifact`, `health-assessment`, `timeline-item`, `truth-review`), drift-checked against the sibling repository by `scripts/check-syntax.js` and `scripts/contracts-verify.js`
- `examples/status-artifact.json`, `examples/status-report.md`: canonical artifact + human report example pair
- `scripts/check-syntax.js`: syntax, JSON, and schema-drift checks (`npm run check`)
- `scripts/contracts-verify.js`: artifact contract and documentation checks (`npm run contracts:verify`)
- `test/`: unit and contract tests (`npm test`)
- `case-studies/`: historical A/B case study
- `evaluation/`: blinded human review template and evaluation guide
- `.github/workflows/quality.yml`: clean-install, tests, contracts, package, markdown, link, and encoding checks
- `.github/workflows/release.yml`: trusted publishing to npm
- `references/framework.md`: templates and operating rules
- `references/init-bootstrap.md`: guided `init` workflow for connectors and workspace bootstrap
- `references/archaeology-workflow.md`: step-by-step reconstruction playbook
- `references/source-ranking-and-reconciliation.md`: conflict resolution rules
- `references/notion-adapter.md`: Notion-specific caveats
- `examples/example-INITIAL-CONTEXT.md`: minimum source pack for the first useful run
- `examples/example-WORKSPACE.md`: generic workspace template
- `examples/example-CLAUDE.md`: Claude-oriented compatibility note
- `examples/example-startup-single-tpm.md`: startup scenario
- `examples/example-mid-size-multi-squad.md`: mid-size multi-squad scenario
- `examples/example-large-platform-heavy-org.md`: large-org scenario
