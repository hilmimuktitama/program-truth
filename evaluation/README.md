# Evaluation

This directory holds the review infrastructure for the Program Truth method.

## What Exists Today

- [historical-ab-case-study.md](../case-studies/historical-ab-case-study.md) — the only completed evaluation: a single live Jira A/B scenario from 2026-03-29, with raw outputs and limitations preserved.
- [blinded-human-review-template.md](blinded-human-review-template.md) — the review procedure to use for future evaluations. There was previously no standalone blinded evaluation template; this file closes that gap.

## What Has Not Been Proven

Read [docs/benchmarks/program-truth-benchmark.md](../docs/benchmarks/program-truth-benchmark.md) for the honest summary. In short:

- one scenario is a case study, not a benchmark
- the historical judge was the same model family as the generator (judging bias is possible)
- the later verification run did not repeat the live A/B
- no blinded human review has been run yet

## How To Run A New Evaluation

1. Define the scope: programs, source systems, and models. Do not claim coverage beyond the scenarios actually run.
2. Generate outputs: for each scenario, produce one output with the skill and one without, from the same live data fetched at evaluation time.
3. Anonymize: strip all identifiers that could reveal which condition produced which output, and randomize presentation order.
4. Recruit reviewers: at least three humans who did not generate the outputs. Do not let the generator judge their own work.
5. Score with the template: use the rubric dimensions in `blinded-human-review-template.md`, 0-5 per dimension, independently.
6. Report honestly: include raw outputs, scores per reviewer, inter-reviewer agreement, and every stated limitation.

## Reporting Rules

- Preserve weaker results. A winning baseline that only wins 1/1 scenarios stays visible.
- State judge-model bias explicitly when the judge and generator share a family.
- State whether live data was re-fetched at evaluation time.
- Never describe a case study as a benchmark unless the study covers multiple independent scenarios with a blinded procedure.

## Local Contract Checks

The canonical artifact shape used by evaluations is proven locally without a cross-repo runtime dependency:

```bash
npm run check
npm run contracts:verify
npm test
```

`contracts:verify` validates both shipped examples against the canonical `StatusArtifact` contract (byte-exact truth-tools schema copies), proves the documented `truth-tools review --input` command is present in README, SKILL, INSTALL, and the example report, and deep-compares the shipped schemas against the sibling truth-tools contracts. When the sibling repository is present, `npm test` additionally runs the real truth-tools review engine against the blocked and on-track examples and asserts `artifact_quality: pass` with `program_health: blocked` and `program_health: on_track`, respectively (`test/truth-tools-sibling.test.js`); parity cases also cover active risk/unknown signals and unsupported blocked/at-risk assessments. Without the sibling, those tests skip cleanly.
