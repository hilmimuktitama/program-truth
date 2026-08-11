# Blinded Human Review Template

Use this template when evaluating Program Truth output quality with human reviewers. It is designed to remove the bias of knowing which output came from which condition.

## 1. Scope And Honesty Guardrails

Before starting, write down and keep visible:

- the scenarios being evaluated (programs, source systems, models)
- whether live data was fetched at evaluation time
- how many outputs per scenario
- who generates and who reviews (never the same people)
- what the evaluation can and cannot claim if it wins or loses

One scenario is a case study, not a benchmark. State the scenario count in every report.

## 2. Procedure

1. Generate outputs per scenario: one "with skill" and one "without skill" from the same source data.
2. Anonymize each output:
   - remove model, tool, and prompt identifiers
   - remove any formatting or vocabulary that reveals which condition produced the output
   - randomize presentation order per reviewer
3. Recruit at least three reviewers who did not generate the outputs and who have not discussed the scenario with the generator.
4. Reviewers score each output independently, without seeing the other reviewer's scores, using the rubric below.
5. Collect scores, compute per-dimension averages and totals, and report inter-reviewer agreement (e.g., spread or standard deviation per dimension).
6. After scores are locked, reveal which output belonged to which condition and write the summary.

## 3. Scoring Sheet

Reviewer ID: ________  Scenario ID: ________  Output ID (A or B): ________

| Dimension | Score 0-5 | Notes |
|-----------|-----------|-------|
| execution_level | | |
| fact_inference_separation | | |
| blocker_owner_date | | |
| contradiction_handling | | |
| data_source_block | | |
| system_vs_functional_status | | |
| risk_owner | | |
| **TOTAL** | | |

Overall impression (2-3 sentences): ________

## 4. Rubric

Score each dimension 0-5, where 3 means "competent but with material gaps" and 5 means "no material gap found in this dimension."

| Dimension | What 5 Requires | What 3 Usually Looks Like |
|-----------|-----------------|---------------------------|
| execution_level | Evidence comes from the lowest execution-level artifacts available; parent-level proxies are flagged, not silently used. | Mixed use of parent summaries and task-level evidence without flagging the difference. |
| fact_inference_separation | Facts, inferences, and unknowns are explicitly separated and labeled throughout. | Statements presented at one epistemic level; inference labels are missing or inconsistent. |
| blocker_owner_date | Every blocker names what is blocked, what is needed, an owner, and a target date. | Blockers listed without owners or dates in places. |
| contradiction_handling | Conflicting claims are shown side by side with a preferred claim and a reason. | Contradictions smoothed over or mentioned only in passing. |
| data_source_block | A Data Source block names systems queried, query level, primary artifacts, freshness window, and caveats. | Data source information is partial or missing. |
| system_vs_functional_status | Tracker status and functional status are reported separately when they differ. | Tracker status reported as truth without functional assessment. |
| risk_owner | Every risk has likelihood, impact, mitigation, and a named owner. | Risk rows lack mitigations or owners. |

## 5. Minimum Report Contents

Every evaluation report must include:

- scenario count and descriptions
- date of data fetch and date of review
- generator and judge model families, with an explicit statement if they share a family
- anonymization and randomization method
- per-dimension scores for every reviewer, plus totals
- inter-reviewer agreement
- raw outputs in full, including the weaker baseline
- an explicit limitations section

## 6. Template Output Format

```markdown
# Blinded Human Review Report

- Evaluation date: [YYYY-MM-DD]
- Scenarios: [count] - [list]
- Data fetched: [YYYY-MM-DD] (live) or [state]
- Generators: [model family]
- Judges: [model family] ([same family as generator: yes/no])
- Reviewers: [count], independent, blinded: yes

## Scores

| Scenario | Output | execution_level | fact_inference_separation | blocker_owner_date | contradiction_handling | data_source_block | system_vs_functional_status | risk_owner | TOTAL |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

## Inter-Reviewer Agreement

- [per-dimension spread or notes]

## Raw Outputs

- [include all outputs verbatim]

## Limitations

- [every limitation observed during the run]
```
