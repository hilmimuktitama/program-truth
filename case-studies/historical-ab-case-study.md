# Historical A/B Case Study: DEMO-1000 (Single-Scenario Evaluation)

- **Case study type:** historical A/B, one live scenario only
- **Historical case study date:** 2026-03-29
- **Generator model:** claude-sonnet-4-6
- **Judge model:** claude-sonnet-4-6
- **Later Codex-run verification date:** 2026-05-16
- **Scenario:** `DEMO-1000` Example Beta Program, live Jira data from the Atlassian REST API fetched 2026-03-29
- **Verdict:** with_skill_wins in 1/1 scenarios (32 vs. 17, delta +15)

> **Honest framing:** this is a single-scenario evaluation, not a broad multi-scenario claim. The raw before/after outputs below are preserved verbatim, including the weaker baseline. Every stated limitation from the original report is kept. Later verification (2026-05-16) validated the repository, CLI, and bootstrap behavior; it did not repeat the live Jira A/B.

---

## 1. Truth Statement

- The before/after quality comparison is a historical Claude-generated single-scenario evaluation covering **one live Jira scenario only**: `DEMO-1000`.
- In that scenario, the "with skill" output wins by **+15 rubric points**: 32 vs. 17.
- The historical result validates usefulness for evidence hygiene, explicit uncertainty, source reporting, contradiction handling, and system-vs-functional status separation **in that scenario**.
- It does **not** prove the skill wins on every program, every source system, or every model.
- The historical judge model is the same model family as the historical generation model, so judging bias is possible.
- The live Jira data was fetched on 2026-03-29 and was not re-fetched for the 2026-05-16 verification run.
- All captured raw before/after outputs are included below. This case study does not hide the weaker baseline or the limitations.

## 2. Chronology

| Date | Runner / Model | What Was Evaluated | Result |
|---|---|---|---|
| 2026-03-29 | claude-sonnet-4-6, judged by claude-sonnet-4-6 | Live Jira A/B status-quality comparison for `DEMO-1000` | With skill won 32 vs. 17 |
| 2026-05-16 | Codex in the workspace | Repository verification, package dry run, empty-workspace bootstrap, Jira-anchor bootstrap | CLI and tests passed; package dry run passed after escalation; bootstrap behavior matched the tool contract; live Jira was not re-fetched |

## 3. Scenario

**Source:** `jira:DEMO-1000`
**Verdict:** with_skill_wins

### Prompt used

> Use program-truth to produce a status update for DEMO-1000 Example Beta Program. The program is due 2026-03-31. Distinguish system status from functional status, surface any ETA conflicts, identify missing owners or dates, and call out which epics put the program target at risk.

### Dimension scores

| Dimension | With Skill (A) | Without Skill (B) | Delta |
|---|---|---|---|
| execution_level | 4 | 3 | +1 |
| fact_inference_separation | 5 | 2 | +3 |
| blocker_owner_date | 4 | 3 | +1 |
| contradiction_handling | 5 | 3 | +2 |
| data_source_block | 5 | 1 | +4 |
| system_vs_functional_status | 5 | 3 | +2 |
| risk_owner | 4 | 2 | +2 |
| **TOTAL** | **32** | **17** | **+15** |

### Judge summary — With Skill (Output A)

Output A is exceptionally thorough: it explicitly labels inferences vs. facts throughout, includes a detailed Data Source block with freshness and caveats, and directly confronts the contradiction between the parent Jira 'To Do' status and actual Epic completion. Blocker and risk tables name owners where known but acknowledge gaps (e.g., Dependency Team owner unnamed, freeze owner unnamed), which is honest but keeps scores from perfect. Execution detail is pulled from Epic progress notes rather than child tasks, which is flagged transparently.

### Judge summary — Without Skill (Output B)

Output B is well-organized and readable, correctly identifying the two headline risks (DEMO-1400 slip and Dependency Team dependency), but it does not separate confirmed facts from inferences, has no Data Source block, and does not explicitly call out the Jira system-vs-functional-status contradiction beyond a brief note in the epic table. Risk rows lack named mitigation owners and the blocker table has no target dates attached to owners for resolution. It reads as a competent summary but lacks the analytical rigor required by the rubric.

### Key differences

- Output A includes a fully populated Data Source block with query level, freshness window, and explicit caveats; Output B has no Data Source block at all.
- Output A explicitly labels every inference (e.g., 'Inference: freeze is the gate') and distinguishes it from confirmed facts throughout the narrative; Output B presents all statements at the same epistemic level with no inference labeling.
- Output A surfaces and names the contradiction between DEMO-1000's 'To Do' Jira status and 5/9 Epics being Done in a dedicated Jira vs. Functional Status table; Output B mentions the Apr 6 date discrepancy in passing but does not systematically address the stale parent-level status contradiction.

## 4. Raw Output A — With Skill (preserved verbatim)

```markdown
I'll work through the source material systematically before producing output.

---

## Pre-Flight Check

**Source in hand:** Jira query result for DEMO-1000, queried 2026-03-29
**Query level:** Epic (not task/subtask) — execution-level evidence is partially visible through progress notes, not through child tasks
**Live adapter:** Jira live at query time
**Reporting window:** Week of 2026-03-24 through 2026-03-29, milestone 2026-03-31
**Missing:** child task status, Confluence/Notion docs, meeting notes, any source outside Jira

Proceeding with confidence downgrade noted in the Data Source block.

---

## Data Source

- **Systems queried:** Jira (live)
- **Query level:** Epic — child tasks not visible; execution detail comes from Epic progress notes only
- **Primary artifact:** DEMO-1000 and 9 linked Epics
- **Freshness window:** 2026-03-10 through 2026-03-23 (most recent Epic update); queried 2026-03-29
- **Caveats:**
  - No child task data — Epic-level status accepted as proxy, flagged where progress notes suggest otherwise
  - No Confluence, Notion, meeting notes, or cross-team sync artifacts available
  - DEMO-1400 has no start date recorded
  - DEMO-1000 parent initiative remains `To Do` in Jira despite 5 Epics marked Done — status field is stale or not auto-rolled up
  - All health signals are self-reported at Epic level; no independent verification

---

# Weekly Status — Example Beta Program (DEMO-1000)

**Period:** Week ending 2026-03-29
**Milestone:** Beta release 2026-03-31
**Reported by:** Program Truth / Program Owner (reporter of record)
**Confidence:** Medium — Jira Epic level only; no task-level or cross-system verification

---

## Summary

Five of nine Epics are Done. Four remain In Progress with due dates of 2026-03-30 or 2026-04-06. The hard milestone is 2026-03-31 — **two days from now**. Three of the four open Epics (DEMO-1100, DEMO-1200, DEMO-1300) are racing to close by 2026-03-30 and are all self-reported On Track. One Epic (DEMO-1400, Integration Team data integration work) has a due date of 2026-04-06, which **already slips past the beta release date**. A feature-flag toggle and a cross-team dependency on Dependency Team are the two most concrete execution risks this week.

**Overall program health: AT RISK**
The milestone date is reachable for most workstreams, but DEMO-1400 is structurally late and DEMO-1200 has an unresolved cross-team dependency that has not been confirmed closed.

---

## Progress This Period

### ✅ Done (5 Epics)

| Epic | Summary | Done Date |
|---|---|---|
| DEMO-1500 | Auto Enabled data integration for Example Product Release | 2026-03-16 |
| DEMO-1600 | Example Beta Program (core) | 2026-03-10 |
| DEMO-1700 | Support beta release — Quality Team | 2026-03-10 |
| DEMO-1800 | Notification session setup | 2026-03-23 |
| DEMO-1900 | Company token / seamless Messaging x Consumer App | 2026-03-16 |

### 🔄 In Progress (4 Epics)

#### DEMO-1100 — Signup Adjustments (Platform Team) | Due 2026-03-30

**Completed inside this Epic:**
- Unified app condition based on billing package (toggled off)
- Trial account auto-assignment to Example Product (toggled off)

**Remaining:**
- Bug fix deployment — blocked by freeze period; will deploy post-freeze
- Feature flag toggle-on

**Inference:** "Ready to be deployed after freeze period" implies the code is done but the freeze is the gate. If the freeze lifts before 2026-03-30, this Epic closes on time. If freeze extends past 2026-03-30, it slips.

**ETA movement:** Mar 9 → Mar 30 (already slipped once)

---

#### DEMO-1200 — Realtime Notification (Consumer App Team) | Due 2026-03-30

**Completed inside this Epic:**
- Consumer-app-side development done

**Remaining:**
- Dependency Team must deliver `device identifier` integration before this Epic can close

**Status:** Waiting on a named cross-team dependency (Dependency Team). Last update 2026-03-17 — **12 days ago with no recorded progress since.**

**Risk:** This is a hard external dependency. Consumer App Team cannot close this Epic without Dependency Team action. No Dependency Team ETA is recorded.

---

#### DEMO-1300 — Webhook & OpenAPI for data integration (Integration Team) | Due 2026-03-30

**Completed inside this Epic:**
- System-to-system endpoints (account identifier fetch — unblocks Integration Team)
- Customer CRUD OpenAPI
- Webhook event
- Customer association OpenAPI
- Register webhook events
- E2E Testing for Webhook

**Remaining:**
- Add configuration item for template layout

**Inference:** One item remaining. Scope is narrow. Last update 2026-03-18 — 11 days ago. On Track is plausible but unverified.

**ETA movement:** Mar 10 → Mar 30 (already slipped once)

---

#### DEMO-1400 — Data Integration Workstream (Integration Team) | Due 2026-04-06

**Completed:** Not specified in Epic notes
**Remaining:** Not specified in Epic notes
**Start date:** Not recorded

**Fact:** This Epic's due date (2026-04-06) already extends past the beta release milestone (2026-03-31).

**Inference:** Either Integration Team data integration work is scoped as non-blocking for beta launch, or this Epic represents a known slip that has not been formally flagged. This must be clarified before the milestone date.

---

## Risks and Blockers

| # | Risk / Blocker | Type | Owner | What Is Needed | Target Date | Current Status |
|---|---|---|---|---|---|---|
| 1 | **DEMO-1400 due 2026-04-06 — after beta milestone** | Blocker / scope question | Integration Team + DEMO-1000 owner | Confirm whether Integration Team data integration work is in-scope for beta or deferred. If deferred, document the decision. | **2026-03-29** | ⚠️ Unresolved |
| 2 | **DEMO-1200 blocked on Dependency Team `device identifier`** | Cross-team dependency | Dependency Team (unnamed owner) | Dependency Team must complete and ship `device identifier` integration; Consumer App Team needs confirmation of ETA | **2026-03-30** | ⚠️ No update in 12 days |
| 3 | **DEMO-1100 toggle-on gated by freeze period** | Deployment gate | Platform Team (unnamed owner) | Freeze lift confirmed; deployment window identified | **2026-03-30** | ⚠️ Pending freeze |
| 4 | **DEMO-1000 parent still shows `To Do`** | Tracking hygiene | Program Owner | Roll up or manually update parent status to reflect 5/9 Epics Done | 2026-03-29 | ℹ️ Minor / tracking |

---

## Dependencies

| Provider | Consumer | Dependency | Provider ETA | Impact If Blocked |
|---|---|---|---|---|
| Dependency Team (`device identifier`) | DEMO-1200 (Consumer App Team) | `device identifier` in Dependency Team required to close realtime notification Epic | **Unknown** | DEMO-1200 cannot close; beta notification feature incomplete |
| DEMO-1300 (Integration Team — account identifier endpoint) | DEMO-1400 (Integration Team) | System-to-system account identifier fetch unblocks Integration Team data integration work | Done (✅) | Unblocked |
| Freeze lift (Ops/Infra) | DEMO-1100 (Platform) | Bug fix and toggle-on require post-freeze deployment window | Unknown | DEMO-1100 cannot close on 2026-03-30 |

---

## Decisions Needed

| # | Decision | Who Decides | By When |
|---|---|---|---|
| D1 | Is DEMO-1400 (data integration work, due 2026-04-06) blocking beta launch, or is it explicitly deferred? | DEMO-1000 owner + Integration Team lead | **2026-03-29** |
| D2 | What is Dependency Team's committed ETA for `device identifier`? Is DEMO-1200 at risk of missing 2026-03-30? | Dependency Team lead + Consumer App Team lead | **2026-03-29** |
| D3 | When does the freeze lift, and is there a confirmed deployment window for DEMO-1100 before 2026-03-30? | Platform Team + Release/Ops | **2026-03-29** |

---

## Next Steps (48 Hours)

| Action | Owner | Due |
|---|---|---|
| Get written confirmation from Dependency Team on `device identifier` ETA (D2) | Consumer App Team lead / Program Owner | 2026-03-29 |
| Confirm DEMO-1400 is explicitly deferred from beta scope or escalate (D1) | Program Owner / Integration Team lead | 2026-03-29 |
| Confirm freeze lift window and DEMO-1100 deployment plan (D3) | Platform lead / Release ops | 2026-03-30 |
| Update DEMO-1000 parent status in Jira to reflect current rollup | Program Owner | 2026-03-29 |
| Verify DEMO-1300 configuration item is on track or escalate if blocked | Integration Team lead | 2026-03-29 |

---

## Jira Status vs. Functional Status

| Epic | Jira Status | Functional Assessment |
|---|---|---|
| DEMO-1000 (parent) | `To Do` | **Stale** — 5/9 Epics Done, 4 In Progress; parent not rolled up |
| DEMO-1400 | `In Progress / On Track` | **Structurally late** — due date exceeds beta milestone |
| DEMO-1200 | `In Progress / On Track` | **Dependency risk** — blocked on Dependency Team; no update in 12 days |
| DEMO-1100 | `In Progress / On Track` | **Deployment gate** — code done, freeze is the remaining constraint |
| DEMO-1300 | `In Progress / On Track` | One item remaining; plausible but last updated 11 days ago |

---

## Unknowns

- Dependency Team owner name for `device identifier` dependency (DEMO-1200)
- Freeze lift date (DEMO-1100)
- DEMO-1400 scope decision (in or out of beta)
- Child task completion rates for any In Progress Epic
- Whether any Confluence or Notion docs carry additional program context not visible in Jira
```

## 5. Raw Output B — Without Skill (preserved verbatim)

```markdown
# Program Status Update — DEMO-1000: Example Beta Program

**As of:** 2026-03-29 | **Due:** 2026-03-31 | **Owner:** Program Owner

---

## Overall Status: 🟡 AT RISK

Program due date is **2 days away** with 4 of 9 epics still In Progress. One epic has a due date extending beyond the program deadline.

---

## Progress Summary

| | Count |
|---|---|
| ✅ Epics Done | 5 |
| 🔄 Epics In Progress | 4 |
| **Total** | **9** |

---

## In-Progress Epics

| Epic | Team | Due | Health | Notes |
|---|---|---|---|---|
| DEMO-1100 — Signup Adjustments | Platform Team | Mar 30 | 🟢 On Track | Bugfix pending deploy post-freeze; feature flag toggle pending |
| DEMO-1200 — Realtime Notification | Consumer App Team | Mar 30 | 🟢 On Track | Consumer app work done; **blocked on Dependency Team** `device identifier` implementation |
| DEMO-1300 — Webhook & OpenAPI for data integration | Integration Team | Mar 30 | 🟢 On Track | Final item: configuration item for template layout |
| DEMO-1400 — Data Integration Workstream | Integration Team | **Apr 6** | 🟢 On Track | ⚠️ Due date exceeds program deadline by 6 days |

---

## Key Blockers

1. **🚧 Dependency Team `device identifier` not yet picked up** — Blocking finalization of Realtime Notification epic (DEMO-1200). Consumer App Team is idle on this item until Dependency Team resolves it.
2. **🚧 Freeze period delaying deployment** — DEMO-1100 bugfix is ready but cannot be deployed until the freeze lifts. Feature flag cannot be toggled on until deployment completes.

---

## Key Risks

| Risk | Impact | Likelihood |
|---|---|---|
| DEMO-1400 due Apr 6 — slips past Mar 31 program deadline | Beta release incomplete at deadline | High |
| Freeze period extends past Mar 30 | DEMO-1100 signup adjustments miss the deadline | Medium |
| Dependency Team `device identifier` pickup delayed | Realtime notifications not functional at launch | Medium |
| Configuration item for template layout (DEMO-1300) not completed | data integration webhook incomplete | Low |

---

## Dependencies

- **DEMO-1200 → Dependency Team**: `device identifier` development must be completed to unblock Consumer App Team
- **DEMO-1100 → Freeze schedule**: Deployment window must open before Mar 30 to enable feature flag
- **DEMO-1400 → DEMO-1300**: data integration work downstream of Webhook/OpenAPI work

---

## Next Actions

| Action | Owner | Due |
|---|---|---|
| Confirm Dependency Team has picked up `device identifier` task; escalate if not assigned | Program Owner / Consumer App Team Lead | **Today, Mar 29** |
| Confirm freeze lift date and validate DEMO-1100 deployment window is before Mar 30 | Platform Team Lead | **Mar 29–30** |
| Clarify DEMO-1400 Apr 6 date — assess whether partial delivery is acceptable for beta or if program deadline needs adjustment | Program Owner / Integration Team Lead | **Mar 29** |
| Complete configuration item for template layout (DEMO-1300) | Integration Team | Mar 30 |
| Toggle on feature flags post-deployment (DEMO-1100) | Platform Team | Mar 30 |

---

> **Bottom line:** The program is functionally near completion but faces a hard deadline risk. The Dependency Team dependency for realtime notifications and the Integration Team data integration work extending to Apr 6 are the two items most likely to prevent a clean Mar 31 release. Immediate escalation on both is recommended.
```

## 6. Limitations

- **Single scenario.** This is one live Jira scenario. Generalization to other programs, source systems, or models is not demonstrated.
- **Judge bias risk.** The historical judge model is the same model family as the generator (claude-sonnet-4-6), so judging bias is possible.
- **No repeated live A/B.** The 2026-05-16 Codex-run verification validated repository state, CLI, package dry run, and bootstrap behavior only; it did not re-fetch Jira or re-run the live A/B.
- **Epic-level evidence.** The scenario had no child-task visibility; the winning output itself flagged this as a confidence downgrade.
- **Anonymized.** Scenario labels and raw outputs are anonymized; scores and structural differences are preserved.
- **Self-reported.** All health signals in the live data were self-reported at Epic level with no independent verification.

## 7. What This Case Study Does Not Claim

- It does not claim the skill wins on every program, every source system, or every model.
- It does not claim a validated, repeatable evaluation pipeline. That is the purpose of `evaluation/blinded-human-review-template.md`, which provides a blinded procedure for future evaluations.
- It does not claim live adapters were exercised on 2026-05-16. They were not.

## 8. Appendix: 2026-05-16 Codex-Run Repository Verification

These commands were run from the repository root on 2026-05-16 after pulling latest `origin/main`.

| Check | Result | Honest Interpretation |
|---|---|---|
| `program-truth doctor` | Pass | Package files present; both Codex and Claude personal skill locations exist, but both installed copies were unmanaged. |
| `npm test` | Pass, 14/14 tests | Unit tests covered args, bootstrap behavior, and install behavior. They did not prove live Jira/Confluence/Notion output quality. |
| `npm run pack:dry-run` | Pass after escalation | The sandboxed run failed with npm cache `EPERM`; the escalated rerun produced `program-truth-0.1.1.tgz`. |
| Empty workspace bootstrap | Pass | The CLI correctly refused to invent context and asked for one anchor artifact. Dry run only. |
| Jira anchor bootstrap | Pass | The CLI correctly moved from missing-anchor mode to source-discovery mode and recommended Atlassian access. Dry run only; it did not fetch Jira. |

- **Repository commit verified:** `dd9c18e9e352a3d39dce18cf1adc9a94a6857a4f`
- **Package version verified:** `0.1.1`
- The 2026-05-16 run did not re-fetch Jira and did not repeat the live A/B.

The version referenced in this appendix is historical: the package has since moved to 0.2.0 with the canonical status artifact contract (see `CHANGELOG.md`).
