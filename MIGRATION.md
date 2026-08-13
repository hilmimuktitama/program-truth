# Migration Guide

How to move from `program-truth` 0.1.x through 0.3.0.

## Summary

0.2.0 defined the methodology boundary: Program Truth gathers and synthesizes execution-level evidence into a canonical status artifact; Truth Tools validates it. Version 0.2.1 hardens the public contract by using Truth Tools' `--input` flag consistently and clarifying the experimental public-release status. The installer, bootstrap helper, doctor, and CLI command surface are otherwise unchanged.

## 0.2.1 to 0.3.0

StatusArtifact v2 is now the emitted public artifact contract. It requires `schema_version: "2.0.0"` and an explicit `health_assessment` with `state`, `owner`, a nonempty `rationale` (the required health summary), and canonical nonempty `source_refs`. Claims and health assessments must cite source records by structured locator; references contain metadata only, never source text.

Update consumers and fixtures, then validate with the compatible Truth Tools CLI:

```bash
truth-tools review --input status-artifact.json
```

Truth Tools reports artifact quality separately from health and checks whether the explicit health is consistent with active blockers, risks, and unknowns. Use `unknown` when evidence is insufficient; do not infer health from prose.

## 0.2.0 to 0.2.1

Replace the retired validation spelling wherever it appears in local scripts or notes:

```bash
truth-tools review --input status-artifact.json
```

The 0.2.x artifact contract was `schema_version: 1.0.0`; migrate those artifacts as described above.

## Environment Requirement

| | 0.1.x | 0.2.0 / 0.2.1 | 0.3.0 |
|---|---|---|---|
| Node.js | >= 20 | >= 22 (LTS) | >= 22 (LTS) |

`program-truth doctor` now fails the Node version check on Node 20 or 21. Upgrade to Node 22 LTS or newer before installing 0.2.0 or newer.

## What Changed For Users

- Status-critical output (`status`, `daily`, `archaeology`, `review`, `deps`, `risks`) now produces a machine-readable `status-artifact.json` plus a human-readable Markdown report.
- The artifact is the canonical `StatusArtifact` contract shared with Truth Tools: `kind`, `schema_version`, `as_of`, `initiative`, `policy`, `sources`, and reviewed `claims` (with states and locator-bearing `source_refs`). The shipped schemas are byte-exact copies of the flagship truth-tools contracts; `npm run check` and `npm run contracts:verify` fail on drift against the sibling repository when it is present.
- The richer TPM methodology moved out of machine fields into the human report and methodology docs: system status vs functional status, facts vs inferences, source hierarchy and connector caveats, dependencies, and write confirmation.
- Validation of the artifact is delegated to Truth Tools: `truth-tools review --input <path>`. If Truth Tools is not installed, the output must state that the artifact is unvalidated.
- Installed skill folders now include `schemas/`, `docs/`, `evaluation/`, `case-studies/`, `CHANGELOG.md`, `MIGRATION.md`, and `SECURITY.md`.
- `doctor` accepts optional isolated targets (`--codex-target <path> --claude-target <path>`) for deterministic verification on any machine, including CI runners.
- `install all --target <path>` now fails with a usage error; use `install codex --target <path>` or `install claude --target <path>` instead.

## What Did Not Change

- CLI command set: `install`, `doctor`, `bootstrap`, and `version` remain the same commands as in 0.1.x, and every invocation that worked in 0.1.x (including `--doctor`/`-doctor` aliases and `install all` without `--target`) behaves exactly as before. The two additions listed above only change invocations that previously relied on undefined or new behavior: `doctor` with no flags is identical, and `install all --target` was previously silently ignored rather than supported.
- Installer safety: managed-install manifest, refusal to replace unmodified/unmanaged folders without `--backup` or `--force`, and dry-run behavior are unchanged.
- Bootstrap behavior: anchor-first discovery, minimum scaffold, connector recommendations, and the `--json` / `--json-in` contract are unchanged.
- Write safety: external writes still require explicit user confirmation and are recorded in the status report and methodology docs.

## Upgrade Steps

1. Upgrade Node to >= 22.
2. `npm install -g program-truth@0.3.0`
3. Refresh installed skills:
   - Codex: `program-truth install codex --backup`
   - Claude Code: `program-truth install claude --backup`
   - Both: `program-truth install all --backup`
4. Run `program-truth doctor` and confirm all checks pass.
5. In workspaces, replace hand-rolled status summaries with the artifact + report pair from `examples/status-artifact.json` and `examples/status-report.md`.

## Rollback

0.1.x remains available on npm. To roll back: install 0.1.1, re-run `program-truth install <client> --backup` with the older package, and keep the older `INITIAL-CONTEXT.md` conventions. Artifacts produced by 0.2.x are not consumed by 0.1.x and can be kept as documentation.
