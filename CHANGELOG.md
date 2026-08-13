# Changelog

All notable changes to `program-truth` are documented in this file. The format is based on Keep a Changelog, and this project uses semantic versioning.

## [Unreleased]

## [0.3.0] - 2026-08-13

StatusArtifact v2 migration and explicit health accountability.

### Added

- Emitted canonical StatusArtifact v2 (`schema_version: 2.0.0`) with required health assessment state, owner, rationale, and source references.
- Added shared health-assessment, timeline-item, and truth-review schema copies with sibling drift verification.
- Added supported on-track and blocked examples, including direct Truth Tools review coverage for pass/health/consistency, plus parity coverage for risk/unknown floors and unsupported health assessments.

### Changed

- Documentation and methodology now require explicit health/evidence reasoning and `unknown` when evidence is insufficient.
- The dependency-free local smoke now mirrors Truth Tools' conservative health resolution and reports claim floors, explicit assessment, health consistency, and findings.
- README now describes a narrow contribution posture without rejecting external pull requests.

## [0.2.1] - 2026-08-13

Public-release hardening for the experimental 0.2.x line.

### Fixed

- Replaced the retired Truth Tools artifact-option spelling with `truth-tools review --input` throughout the published documentation and examples.
- Added a published-package contract test that rejects the retired flag.
- Added documented example smoke coverage for Truth Tools review results (`artifact_quality: pass`, `program_health: blocked`).

### Implementation changes

- Propagated canonical `date-time` formats for source metadata and aligned the dependency-free validator, syntax checks, and tests.
- Standardized trusted releases on published GitHub releases or a required manual tag, with exact-tag verification and the complete pre-publish gate sequence.
- Hardened release tags to canonical `v`-prefixed semver values, full-history checkouts, and explicit tag-commit verification before the dynamic package-version check and publish gates.
- Made the pass/blocked example smoke deterministic and release-enforced; the optional sibling integration remains supplementary rather than the release gate.

## [0.2.0] - 2026-08-11

Methodology convergence: Program Truth now has a defined job, a defined boundary with Truth Tools, and a canonical machine-readable artifact as the contract between the two.

### Added

- Canonical status artifact contract:
  - `schemas/status-artifact.schema.json`, `schemas/source.schema.json`, `schemas/source-ref.schema.json`, and `schemas/claim.schema.json` are byte-exact copies of the flagship truth-tools contracts (draft 2020-12, canonical `StatusArtifact` shape: kind/schema_version/as_of/initiative/policy/sources/claims)
  - full example pair `examples/status-artifact.json` (canonical artifact that reviews `pass` + `blocked` in Truth Tools) and `examples/status-report.md` (richer TPM methodology: system-vs-functional status, facts/inferences, source hierarchy, connector caveats, dependencies, write confirmation)
- Contract and example tests:
  - `scripts/check-syntax.js` (syntax, JSON, schema sanity, sibling drift deep-compare) wired as `npm run check`
  - `scripts/contracts-verify.js` (example validity against the canonical contract, canonical shared shape, no-bespoke-fields guard, human-report shape, documented review command, sibling drift) wired as `npm run contracts:verify`
  - `test/status-artifact.test.js`
  - `test/truth-tools-sibling.test.js` — optional real sibling integration test that runs `truth-tools review` against the example and asserts `artifact_quality: pass` + `program_health: blocked` when the sibling repository is present; skips cleanly otherwise (no runtime dependency)
- Truth Tools boundary:
  - documented validation command `truth-tools review --input <path>`
  - relationship statement: Program Truth gathers and synthesizes -> StatusArtifact -> Truth Tools validates
- Historical case study:
  - `case-studies/historical-ab-case-study.md` preserving raw before/after outputs and all stated limitations
  - `docs/benchmarks/program-truth-benchmark.md` reframed as an honest evaluation summary
- Evaluation infrastructure:
  - `evaluation/blinded-human-review-template.md` with the rubric dimensions used in the historical case study (execution_level, fact_inference_separation, blocker_owner_date, contradiction_handling, data_source_block, system_vs_functional_status, risk_owner)
  - `evaluation/README.md`
- Release and repository hygiene:
  - `CHANGELOG.md`, `MIGRATION.md`, `docs/release-process.md`
  - `.github/workflows/release.yml` (trusted publishing with provenance)
  - `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/bug.yml`
  - clean-install, check, and contract steps in `.github/workflows/quality.yml`

### Changed

- `package.json`: version 0.2.0; Node engine requirement raised to `>=22`; expanded `files` allowlist to include docs, evaluation, case studies, schemas, scripts, and tests; added `check`, `contracts:verify`, and `prepack` scripts; added `publishConfig` with provenance.
- `README.md`: restructured for one-minute understanding; relationship to Truth Tools and explicit does-not-own boundaries; details moved to SKILL/references.
- `SKILL.md`: removed the `truth.run` umbrella reference; added one-sentence methodology job, exact does-not-own boundaries, canonical status artifact contract, and exact connector language (guides available connectors, bundles none).
- `lib/install.js`: doctor now requires Node 22+; doctor accepts `--codex-target` / `--claude-target` isolated targets for deterministic CI verification; package file checks and install copy roots extended to the new artifacts and docs.
- `lib/bootstrap.js`: the package's own docs, evaluation, case studies, schemas, scripts, and tests are excluded from candidate-source scanning when bootstrapping inside the skill repo.
- `bin/program-truth.js`: `install all --target <path>` is now rejected with a usage error instead of silently ignoring `--target`; doctor flags are documented in `--help` output.
- `schemas/`: replaced the bespoke in-house contract with byte-exact copies of the flagship truth-tools schemas (canonical `$id`s and external `$ref`s preserved); `schema_version` documented as the artifact contract version, independent of the package version.
- `scripts/contracts-verify.js`: draft-2020-12 validator subset (external `$ref` resolution to the local copies, `oneOf`, `minimum`, type arrays), real calendar date validation, `additionalProperties: false` enforced at every nested object level, canonical-shape and no-bespoke-fields example checks, and sibling drift deep-compare; `--help` documents the supported JSON Schema subset.
- `scripts/check-syntax.js`: schema drift check now deep-compares the four shipped schemas byte-for-byte against the sibling truth-tools contracts when present (env override `PROGRAM_TRUTH_SIBLING_TRUTH_TOOLS`), and skips cleanly otherwise.
- `.github/workflows/quality.yml`: CLI smoke installs to isolated targets before doctor so the job passes on a clean runner.
- `.github/workflows/release.yml`: published GitHub releases and required manual `tag` dispatches accept only canonical `v`-prefixed semver tags, use a full-history checkout, verify `HEAD` is the tag commit, and run the full local checklist (clean install, audit, tests, check, contracts, CLI smoke, pack dry run) before publishing with OIDC provenance.
- `docs/release-process.md`: documents both trigger paths, the non-recursive `prepack` chain, and the two independent version axes (package semver vs artifact `schema_version`).
- CI and release now run `npm audit --audit-level=high` after the reproducible `npm ci` install from the committed lockfile.

### Removed

- `truth.run` / nine-tool umbrella language from README and SKILL.
- Standalone "benchmark" framing; the historical A/B is now named a case study (single-scenario evaluation).

## [0.1.1] - 2026-05-16

- npm release matching commit `dd9c18e`; package and CLI verified on 2026-05-16 (see the appendix of `case-studies/historical-ab-case-study.md`).
- Published before the following main-only commits that ship with 0.2.0: anonymized benchmark report (`af8ac7d`), experimental public-release notice (`6e0e9ac`), contributing guide removal (`588783f`), truth-tools entrypoint clarification (`09e47a3`).
- Changelog entries before 0.2.0 are reconstructed from git history; details live in the commit log.

[Unreleased]: https://github.com/hilmimuktitama/program-truth/commits/main
[0.3.0]: https://github.com/hilmimuktitama/program-truth/commit/13fd00e273c523ff18c91b63cb71df8d2623323a
[0.2.1]: https://github.com/hilmimuktitama/program-truth/commit/d00ab0dcdd5e8fc7f3a236e5bb5bfb451ef30821
[0.2.0]: https://github.com/hilmimuktitama/program-truth/compare/v0.1.1...059f8d3fce24d7692732cb289d18e90515b97a8f
[0.1.1]: https://github.com/hilmimuktitama/program-truth/releases/tag/v0.1.1
