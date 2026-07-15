# CaP: Documented Rules vs. Actual Code Behavior

*Audit basis: the 6 MD files in your repo (CAP_METHODOLOGY, CRAWL_SPEC, DECONFLICTION_RULES, GAP_IDENTIFICATION_RULES, SOURCE_QA_STANDARDS, SUPABASE_SCHEMA_REFERENCE) checked line-by-line against `LATEST_CAP.html`.*

---

## ✅ Matches — these are genuinely implemented as documented

| Rule | Doc says | Code does | Verdict |
|---|---|---|---|
| Confidence at intake | A=95, B=70, C=55, D=unscored | `TYPE_CONFIDENCE = { A: 95, B: 70, C: 55, D: null }` | ✅ Match |
| Review thresholds | 85% (buying committee, conversation prep) / 75% (qualification, timing) | `REVIEW_THRESHOLD` object, identical values | ✅ Match |
| Decay model | Flat until 30 days pre-expiry, linear slide to 60% floor, frozen past expiry | `effectiveConfidence()` implements exactly this curve | ✅ Match |
| Gap spec keywords | Named expected signals per intended_use (CEO/CFO/CTO/procurement, revenue/growth/headcount/R&D, exec statement/vendor, restructure/earnings/announcement) | `GAP_SPEC` constant — keyword sets match doc almost verbatim | ✅ Match |
| Gap check trigger | "Auto-runs: on Issues tab open **+ after every new fact added**" | `saveFact()` calls `runGapCheck()` immediately after insert; `renderIssues()` also runs it on tab open | ✅ Match |
| Gap non-duplication | Don't recreate an existing gap | Code checks `existingGaps` before inserting | ✅ Match |
| Near-duplicate detection | >70% word overlap → flag as likely duplicate | Code uses the same 70% threshold | ✅ Match |
| Compaction is never automatic (for duplicates) | Requires Director review via Issues tab | Duplicate conflicts still go through the same open/resolved flow as other conflicts | ✅ Match |

---

## 🚩 Drift — code does something the docs explicitly say it shouldn't

### 1. Conflict auto-resolution contradicts the documented rule directly
**DECONFLICTION_RULES.md says, twice:**
> Rule 3 — Trusted fact auto-assignment: *"This doesn't resolve the conflict — it gives the Context Director a starting point for review."*
> What deconfliction does NOT do: *"It does not resolve conflicts automatically. Every conflict requires a human 'Mark resolved' action."*

**What the code actually does** (`runDeconfliction`, both the numeric-contradiction and duplicate-detection blocks):
```js
const canAutoResolve = confGap >= 10;
...
status: canAutoResolve ? 'resolved' : 'open',
resolved_by: canAutoResolve ? 'CaP (auto)' : null,
```
Any time two conflicting facts have a confidence gap of 10+ points, the system marks the conflict `resolved` **by itself**, with no human involved. This is the opposite of what the methodology promises — the doc's whole "defensibility" pitch rests on every conflict getting a human decision, and this silently skips that for what's likely the majority of conflicts (a 10-point gap is common between, say, a Type A fact at 95% and a Type B at 70%).

**Why this matters for your audit:** this is the one place where "trustworthy, human-verified system" and "what actually runs" diverge in a way that changes real outcomes, not just cosmetics.

### 2. Rejection routing writes values that don't match the schema's own categories
**SUPABASE_SCHEMA_REFERENCE.md** defines `rejection_type` as one of: *Stale fact, Wrong contact, Incorrect information, Wrong timing, Wrong approach, Wrong channel*, and `routed_to` as one of: *'source'* or *'engine_logic'*.

**The code** (`submitRepRejection`) hardcodes:
```js
rejection_type: 'bad_data_quality',   // not one of the 6 documented values
routed_to: 'cap',                     // not 'source' or 'engine_logic'
```
The six reasons actually shown to the rep in the UI (*Wrong/inaccurate, Outdated, Misinterpreted signal, Not relevant, Duplicate, Wrong account*) don't correspond to the schema's six categories at all — they're a completely different, undocumented list, and the real reason text just goes into `notes` as a free-text string instead of the structured `rejection_type` field.

**Downstream consequence:** `generateMD()` computes `sourceRejections = rejections.filter(r => r.routed_to === 'source')` to report how many rejections required a CaP correction vs. routing to WHEN Layer. Since the code never writes `routed_to: 'source'`, **that count will always be zero** — the dossier's rejection-routing summary is silently wrong every time, regardless of what actually happened.

### 3. Deconfliction Rule 2 (dual Type-A cross-check) is not implemented at all
**Doc:** *"If two facts are both classified Type A but come from different sources and reference the same keyword, this is flagged at low severity for cross-checking — even if the values don't numerically contradict."*

**Code:** only flags when values *do* differ by >5%, or on near-duplicate content overlap. Two Type-A facts that agree on a number but come from different sources are never cross-checked. This entire rule is missing.

### 4. Severity labeling doesn't match the schema or the doc
- **Schema/doc:** conflict severity is `critical / moderate / low`; stale-fact severity scales by age (>90 days = critical, 30-90 = moderate, <30 = low).
- **Code:** uses `HIGH / MEDIUM / LOW` (different vocabulary), and stale facts get **no severity at all** — just a flat `trust_status: 'stale'` flag regardless of how overdue they are.

---

## ⚠️ Gaps — documented but simply not built yet

- **Source registry linkage:** doc/schema note the `source_id` foreign key and registry are "currently unused" — facts store source as free text in `notes`. This is flagged in the docs themselves as a known structural gap, not a surprise, but it means every "traceability" claim in the Output dossier is really just a free-text string, not a verified link to a registered, tiered source.
- **Trigger-signal valid_until (90 days)** is listed in SOURCE_QA_STANDARDS but doesn't appear as its own row in the code's on-screen credibility-rules reference table — minor, but worth reconciling so the two don't silently diverge further.

---

## What this means for your audit priorities

If you only fix one thing before going further: **#1 (silent conflict auto-resolution)**. It's the clearest case of the code doing something materially different from — and in direct contradiction of — what's documented as the system's core trust mechanism. #2 is close behind because it corrupts a number that ends up in every generated dossier without any visible error.

Both are good candidates for the "migrate first, then let Claude Code touch anything" plan — they're logic bugs to fix with full context, not blind refactors.
