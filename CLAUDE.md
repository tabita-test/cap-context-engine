# CLAUDE.md — CaP (Context as a Product) Project Context

*Drop this file in the repo root. Claude Code reads CLAUDE.md automatically at the start of every session — this replaces having to re-explain the project each time.*

---

## What CaP is

CaP (Context as a Product) is a verification-to-context engine for Singtel's Japan AI/GPUaaS expansion, targeting ~30 enterprise accounts. It sits between raw intelligence sources and downstream engines (WHEN Layer, which owns timing/posture/sense-making, and the Activation engine, which owns delivery/outreach).

**Core model: IRO, not IPO.** Traditional systems are Input → Process → Output — data passes through and disappears. CaP is Input → **Reasoning** → Output: it actively judges whether data is trustworthy, whether it conflicts with other data, what it's for, and whether it's still valid. Context persists and compounds rather than being consumed once.

**Primary quality metric: defensibility**, not volume or speed. Every fact and conclusion must be justifiable if questioned. Four components: transparent assumption articulation, explicit trade-off/conflict disclosure, clear intended-use logic, and named accountability (a Context Director owns every dossier).

**The 80% rule:** nothing enters the system without a stated `intended_use`. If a signal doesn't map to one of the five intended_use categories, it doesn't belong yet.

Full methodology: see `CAP_METHODOLOGY.md`, `CRAWL_SPEC.md`, `DECONFLICTION_RULES.md`, `GAP_IDENTIFICATION_RULES.md`, `SOURCE_QA_STANDARDS.md`, `SUPABASE_SCHEMA_REFERENCE.md` in the repo — these are the source-of-truth docs. **The code should match these. Where it currently doesn't, see "Known drift" below — do not treat the code as correct by default.**

---

## People

- **Tabita** — Context Director, owns CaP, final decision-maker on rules/thresholds
- **Marc Goh** — leadership, evaluates the system
- **Jocelyn** — owns WHEN Layer (timing, posture, sense-making) — a downstream consumer of CaP's output, not something CaP should reach into
- **Hon Lam** — owns Activation (delivery/outreach) — also downstream
- **Robin, Katherine** — sales reps, the "Sales rep review" tab is built for them

---

## Terminology glossary

| Term | Meaning |
|---|---|
| Fact type A/B/C/D | A = verified from named primary source, B = inferred/synthesised, C = third-party unverified, D = known gap (not a fact, an absence) |
| intended_use | Which of 5 downstream purposes a fact serves: `account_qualification`, `buying_committee_mapping`, `conversation_prep`, `timing_signal`, `gap_identification`. Every fact needs exactly one. |
| Confidence | 0-100 score, starts from fact type (A=95/B=70/C=55), decays toward a floor as the fact ages |
| Review threshold | Minimum confidence to auto-clear without human review; two tiers — 85% for buying_committee_mapping/conversation_prep, 75% for account_qualification/timing_signal |
| Decay | Confidence slides linearly from base to a 60% floor starting 30 days before `valid_until`; frozen at 60% once expired |
| Deconfliction | On-demand check for numeric contradictions, duplicates, and staleness among facts |
| Gate 1 | Manual checklist confirming structural data quality (sources named, valid_until set, etc.) |
| Gate 2 | Live-calculated defensibility score (% pending review, open conflicts, compaction status, accountability) |
| Compaction | Archiving a lower-quality duplicate/stale fact in favor of a better one — never automatic, requires Director review |
| Orientation artifact | The final generated Markdown dossier per account, pushed to GitHub |
| Credibility tier | Source quality: Tier 1 (primary/company-published), Tier 2 (reputable secondary press/analyst), Tier 3 (third-party, use with caution, never alone) |

---

## Current architecture (as it exists today — not the target state)

- **Single HTML file** (`LATEST_CAP.html`) containing all markup, styles, and JS. No build step, no modules.
- **Supabase** (Postgres + REST) is the live data store — genuinely live, not mocked. Tables: `accounts`, `facts`, `sources`, `conflicts`, `rejections`, `gaps` (unused), `pattern` (unused). See `SUPABASE_SCHEMA_REFERENCE.md` for exact columns — **check this before writing any query or migration**, column-name mismatches have repeatedly broken the build before (e.g. `content` not `claim`, `notes` not `source_name`).
- **GitHub integration is push-only.** The app writes the generated dossier `.md` to `agents/tabita/accounts/{slug}/v1.md` in `DesignProdigySG/DP-Syntropy-May-2026`. It never reads rules back from GitHub — despite the methodology docs living in that same repo, the running code does not consume them. All rules (confidence-by-type, thresholds, gap-spec keywords, credibility tiers) are hardcoded as JS constants inside the HTML file.
- **No version control has been in place.** This CLAUDE.md and a `git init` of the current file are meant to be the starting point.

---

## 🔴 Security — fix before anything else

Lines ~171-175 of `LATEST_CAP.html` hardcode, in plaintext, client-side:
```
SUPABASE_KEY (anon JWT)
GITHUB_TOKEN (was a live classic personal access token — deleted from GitHub as of this audit, but do not reintroduce a real token value in this file or the code)
```
Anyone who views page source can read and use the GitHub token to write to the repo. **First task, before any refactor:** move both to environment variables behind a server-side proxy (Supabase Edge Function or small backend) so neither ships to the browser. Rotate the GitHub token once it's moved — treat the current one as already compromised since it's been in a shared file.

---

## Known drift — code vs. documented rules (full detail in `CaP_Docs_vs_Code_Audit.md`)

**Verified matches (safe to treat as correct):** confidence-by-type values, review thresholds, decay curve, gap-spec keywords per intended_use, gap-check running both on Issues-tab-open and after every fact save, 70%-overlap duplicate detection.

**Real bugs — do not "fix" silently, confirm with Tabita/chat first since these affect what's already live in Supabase:**

1. **Conflict auto-resolution contradicts the docs.** `runDeconfliction()` sets `status: 'resolved', resolved_by: 'CaP (auto)'` whenever the confidence gap between two conflicting facts is ≥10 points — no human involved. `DECONFLICTION_RULES.md` states twice this should never happen automatically ("every conflict requires a human 'Mark resolved' action"). This is the highest-priority logic bug — it undermines the system's core defensibility claim.
2. **Rejection routing writes non-schema values.** `submitRepRejection()` hardcodes `rejection_type: 'bad_data_quality'` and `routed_to: 'cap'` — neither matches the six documented `rejection_type` values or the two allowed `routed_to` values (`'source'` / `'engine_logic'`) in `SUPABASE_SCHEMA_REFERENCE.md`. Consequence: `generateMD()`'s count of rejections "routed to source" (`routed_to === 'source'`) will always be zero, so the dossier's rejection summary is silently wrong on every account.
3. **Deconfliction Rule 2 unimplemented.** Two Type-A facts from different sources agreeing on the same keyword should be flagged low-severity for cross-check per the docs. Not built.
4. **Severity vocabulary mismatch.** Docs/schema use `critical/moderate/low`; code uses `HIGH/MEDIUM/LOW`. Stale facts get no severity tiering in code at all, though the doc specifies age-based tiers (>90/30-90/<30 days).

**Dead code (safe to remove, confirm no hidden wiring first):** `toggleReject`, `reviewFact`, `rejectionPickerHTML`, `submitRejection`, `REJECTION_TYPES = []` — stubs left over from an earlier rejection-flow design, superseded by `submitRepRejection`.

---

## Target state (what "migrate" means here)

1. Secrets → environment variables + server-side proxy (see Security section).
2. Hardcoded rule constants (`TYPE_CONFIDENCE`, `REVIEW_THRESHOLD`, `GAP_SPEC`, credibility tier table, valid-until defaults) → separate versioned config files under `/rules`, read by the app at runtime. The goal: a diff to a rules file is the audit trail, not a diff buried inside application code.
3. Fix the two real logic bugs above — but only after they're confirmed and understood, not as a side effect of the refactor.
4. Keep UI behavior and Supabase schema untouched unless a change is explicitly requested — this is a structural/security refactor, not a feature rebuild.

---

## Working agreement for this repo

- **Always start in Plan mode**, not Accept-edits, for anything beyond trivial fixes. Show the plan before writing code.
- **Do not silently "fix" the logic bugs listed above** — flag them and wait for explicit go-ahead, since Supabase already has live data shaped by the current (buggy) behavior.
- **Check `SUPABASE_SCHEMA_REFERENCE.md` before writing any query.** Column-name mismatches have broken this build multiple times before.
- **Don't reintroduce hardcoded secrets** anywhere, including in test/debug code.
- When in doubt about intent, terminology, or whether something is a deliberate design choice vs. an accident — ask, don't assume. This project has been built incrementally across many separate chat sessions, so "why does it do X" often has a real answer that isn't visible in the code alone.
