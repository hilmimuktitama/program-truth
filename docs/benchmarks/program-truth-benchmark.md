# Program Truth Evaluation Summary

- **Report updated:** 2026-08-11
- **What exists today:** one historical single-scenario case study, plus a blinded human review template for future evaluations. There is no standalone blinded evaluation yet.

> **Honest framing:** what was previously titled a "benchmark" is a single-scenario historical A/B case study. The full case study — including raw before/after outputs and all stated limitations — lives at [case-studies/historical-ab-case-study.md](../../case-studies/historical-ab-case-study.md). This page is the short, honest summary.

---

## Truth Statement

- The before/after quality comparison is a **historical, single-scenario case study**: one live Jira scenario (`DEMO-1000`), generated and judged on 2026-03-29.
- In that scenario, the "with skill" output wins by **+15 rubric points**: 32 vs. 17.
- The result validates usefulness for evidence hygiene, explicit uncertainty, source reporting, contradiction handling, and system-vs-functional status separation **in that scenario only**.
- It does **not** prove the skill wins on every program, every source system, or every model.
- The historical judge model is the same model family as the generation model, so judging bias is possible.
- The 2026-05-16 Codex-run verification validated repository state, CLI, package dry run, and bootstrap behavior; it did **not** re-fetch Jira and did **not** repeat the live A/B.
- Raw outputs are preserved in the case study, including the weaker baseline. Nothing is hidden.

## Chronology

| Date | Runner / Model | What Was Evaluated | Result |
|---|---|---|---|
| 2026-03-29 | claude-sonnet-4-6, judged by claude-sonnet-4-6 | Live Jira A/B status-quality comparison for `DEMO-1000` | With skill won 32 vs. 17 |
| 2026-05-16 | Codex in the workspace | Repository verification, package dry run, empty-workspace bootstrap, Jira-anchor bootstrap | CLI and tests passed; package dry run passed after escalation; live Jira was not re-fetched |

## Result Summary

| Scenario | With Skill (A) | Without Skill (B) | Delta | Verdict |
|---|---|---|---|---|
| DEMO-1000 | 32 | 17 | +15 | with_skill_wins |

**with_skill_wins in 1/1 scenarios.** A single scenario is not a benchmark; it is a case study.

## What A Proper Evaluation Needs Next

1. A blinded human review, using [evaluation/blinded-human-review-template.md](../../evaluation/blinded-human-review-template.md), with reviewers who do not know which output came from which condition.
2. Multiple scenarios across multiple source systems and programs, not one live Jira query.
3. Judge models from a different family than the generator, to remove same-family bias.
4. Re-fetched live data at evaluation time, so the A/B and the verification run share the same data.

## Related

- [Historical A/B case study](../../case-studies/historical-ab-case-study.md) — full raw outputs and limitations
- [Evaluation guide](../../evaluation/README.md) — how to run future evaluations
- [Blinded human review template](../../evaluation/blinded-human-review-template.md) — the review procedure
