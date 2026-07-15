# CaP — Context as a Product

This repo tracks the CaP prototype and its governing methodology docs.

## Structure

- `LATEST_CAP.html` — the working prototype (single-file, reads live from Supabase, pushes generated dossiers to GitHub)
- `CLAUDE.md` — project context for Claude Code sessions. Read automatically at session start.
- `CaP_Docs_vs_Code_Audit.md` — audit comparing the methodology docs against actual code behavior; two real logic bugs identified, not yet fixed
- `CAP_METHODOLOGY.md`, `CRAWL_SPEC.md`, `DECONFLICTION_RULES.md`, `GAP_IDENTIFICATION_RULES.md`, `SOURCE_QA_STANDARDS.md`, `SUPABASE_SCHEMA_REFERENCE.md` — the governing rules. Source of truth; code should match these.

## Commit history so far

1. **Baseline snapshot** — the prototype exactly as it was at time of audit, unmodified.
2. **Add methodology docs + context** — this commit. Adds the rule docs, Claude Code context, and audit findings. Still no code changes.

## Before doing anything else

**Rotate the Supabase key and GitHub token hardcoded in `LATEST_CAP.html` (around line 171-175).** They're in plaintext in commit 1's history now. Rotating them makes the ones in history harmless even after they're pushed anywhere.

## Next steps

See `CLAUDE.md` → "Target state" and "Working agreement" sections.
