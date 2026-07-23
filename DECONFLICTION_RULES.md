# Deconfliction Rules

## Purpose

CaP runs independently of WHEN Layer and other downstream engines. It does not wait for another system to flag contradictions in its own data — deconfliction is something CaP does to itself, on demand, against the facts it has collected.

CaP's job here is narrow: **surface that two facts might need a second look, and give a human enough context to decide fast.** CaP does not decide *why* two facts differ, and does not attempt to reason about which one is "true." It detects, hints, and hands the decision to a person — every time.

## When deconfliction runs

On demand, triggered by a "Run deconfliction" action per account. Not automatic on every fact insert (write-load tradeoff, deliberately accepted). Should be run any time a meaningful batch of new facts is added, or before an account moves through Director Gate.

## The five detection rules

### Rule 1 — Numeric contradiction detection
Facts sharing the same `intended_use` category are scanned for shared metric keywords (revenue, EBITDA, CEO, CFO, COO, headcount, employees, R&D, guidance). If two facts reference the same keyword but assert numeric values differing by more than 5%, a conflict is logged.

Severity: differences over 20% are marked HIGH; 5–20% are MEDIUM.

### Rule 2 — Dual Type A source flagging
If two facts are both classified Type A (verified) but come from different sources and reference the same keyword, this is flagged at low severity for cross-checking — even if the values don't numerically contradict. Two "verified" facts from different sources making the same claim should still be confirmed as genuinely consistent, not just superficially similar.

### Rule 3 — Confidence-based suggestion (never a decision)
When a conflict is detected, the fact with the higher confidence score is highlighted (a bolded border on its button in the review UI) as a starting point for the Context Director's review. **This is a visual hint only — it never resolves anything on its own, and it disappears entirely on an exact confidence tie**, since there's no honest basis for a hint at that point.

### Rule 4 — Near-duplicate detection
Facts within the same `intended_use` category are compared for content word-overlap. If similarity exceeds 70%, they're flagged as likely duplicates — candidates for compaction rather than genuine contradiction.

### Rule 5 — Stale fact detection
Any fact past its `valid_until` date is automatically flagged, regardless of whether it conflicts with anything else. Severity scales with how overdue it is: over 90 days is critical, 30–90 days is moderate, under 30 days is low. This is compaction, not a conflict — handled directly on the fact's own row, never as a fact-vs-fact record.

## Detection hints — cheap, mechanical, never authoritative

Alongside the five rules above, each conflict card may show **at most one** plain-language hint line, based on simple pattern-matching on the fact content — not reasoning, not an LLM call, just cheap text checks:

- Different year/quarter markers in the two facts (e.g. "FY2023" vs "FY2024") → *"These might be from different years."*
- A scope word near the number (consolidated / domestic / segment / regional / global) → *"These might cover different scopes."*
- A hedge word in either fact (approximately / roughly / about / ~) → *"One of these looks like an estimate."*

Only the single strongest match shows. If none match, no hint line appears — the card looks exactly as it does without this feature. **These hints exist to speed up a human's read of the card, never to pre-decide anything.**

## Resolution — always three options, every time

Every open conflict card shows the same three choices, in the same order, with no exceptions:

1. **Keep Fact A** — archives Fact B (`trust_status: 'archived'`), marks the conflict resolved.
2. **Keep Fact B** — archives Fact A, marks the conflict resolved.
3. **Both are valid** — marks the conflict resolved, archives neither fact. Used when the human recognizes the two facts aren't actually in contradiction (different timeframe, scope, or perspective) — this is the direct answer to "what if both facts actually matter."

There is no fourth state and no default selection — a human always makes an explicit choice, every single time, regardless of confidence gap or hint.

## Decision risk — high-stakes categories get extra caution

For facts tagged `buying_committee_mapping` or `conversation_prep` (the two categories where acting on a wrong fact costs the most — a bad contact, a bad line in a live call), **Rule 3's confidence hint never displays**, even when the confidence gap is large. The reviewer sees the same three buttons with no visual lean either way. This doesn't change how conflicts are detected — only how much of a nudge the resolution screen gives, scaled to how costly a wrong call would be.

## Reducing review load — triage, not fewer checks

Every conflict and every low-confidence fact still requires an explicit human action — nothing here makes anything silent. The goal is only to stop "needs a human" from feeling like one infinite, undifferentiated pile spread across separate tabs.

**Every open item — conflicts in Issues, facts in Sales Rep Review — is grouped into one of two buckets, always visibly labeled:**

- **Quick confirm** — a conflict with a clear (non-tied) confidence gap in a non-high-risk category, or a fact just below its review threshold with no detected hint. Still shows the full three buttons (or confirm/edit/reject for facts) — nothing is auto-approved — but it's visually marked as low-effort.
- **Needs real judgment** — a true confidence tie, anything in `buying_committee_mapping` or `conversation_prep`, or anything with a detected hint (temporal/scope/estimate) from the section above. No shortcuts here — always the full three-option review, no bulk action available.

**One bulk action, scoped only to the quick pile:** "Confirm all quick items" — shows the full list of what it's about to confirm before acting, and never includes anything from the needs-judgment bucket. This is the only place multiple items can be closed in one click; it never substitutes for the three-choice review itself, it just batches several easy ones together.

**One combined count, shown once, not per-tab:** e.g. on the account Overview — "3 need real judgment · 11 are quick confirms" — spanning both the Issues tab's conflicts and Sales Rep Review's queue together, so a reviewer knows the actual scope of the work before opening either tab.

## Compaction

Resolution never deletes. "Keep A" / "Keep B" archives the losing fact — visible (grayed out) in the Fact ledger for audit purposes, excluded from active counts, the Sales Rep Review queue, and the generated dossier. "Both are valid" archives nothing. Compaction from Rule 4 (duplicates) follows the same archive-don't-delete pattern.

## What deconfliction does NOT do

- It does not resolve conflicts automatically. Every conflict requires an explicit human choice — always three options, never zero.
- It does not reason about *why* two facts differ. The hint lines are pattern-matches on text, not conclusions — a human still makes the call.
- It does not touch WHEN Layer's domain — timing, posture, and approach decisions are never evaluated by this engine.
- It does not delete facts, ever. Every resolution either archives one fact or archives none.
