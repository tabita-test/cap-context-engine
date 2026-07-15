# CaP — Context as a Product

This repo tracks the CaP prototype and its governing methodology docs.

## Structure

- `LATEST_CAP.html` — the working prototype (single-file, reads live from Supabase via `db-proxy`, pushes generated dossiers to GitHub via `github-push`)
- `supabase/functions/db-proxy` — Edge Function that forwards PostgREST calls, holding the real Supabase key server-side
- `supabase/functions/github-push` — Edge Function that commits generated dossiers to GitHub, holding the real GitHub token server-side
- `CLAUDE.md` — project context for Claude Code sessions. Read automatically at session start.
- `CaP_Docs_vs_Code_Audit.md` — audit comparing the methodology docs against actual code behavior; real logic bugs identified, not yet fixed
- `CAP_METHODOLOGY.md`, `CRAWL_SPEC.md`, `DECONFLICTION_RULES.md`, `GAP_IDENTIFICATION_RULES.md`, `SOURCE_QA_STANDARDS.md`, `SUPABASE_SCHEMA_REFERENCE.md` — the governing rules. Source of truth; code should match these.

## Commit history so far

1. **Baseline snapshot** — the prototype exactly as it was at time of audit, unmodified.
2. **Add methodology docs + context** — adds the rule docs, Claude Code context, and audit findings. No code changes.
3. **Move secrets behind a server-side proxy** — this commit. `LATEST_CAP.html` no longer holds the Supabase key or GitHub token; both live as Edge Function env vars instead (see "Deploying the proxy" below).

## Deploying the proxy

One-time setup (requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and a login/link to project `buknaajuolfkvcpepbaf`):

```bash
supabase login
supabase link --project-ref buknaajuolfkvcpepbaf

# Set the real secrets — never commit these values anywhere
supabase secrets set CAP_SB_KEY=sb_publishable_...      # your Supabase publishable key
supabase secrets set CAP_GITHUB_TOKEN=github_pat_...    # a token scoped to DesignProdigySG/DP-Syntropy-May-2026

supabase functions deploy db-proxy
supabase functions deploy github-push
```

`supabase/config.toml` already sets `verify_jwt = false` for both functions — each function does its own `apikey` header check against `CAP_SB_KEY` instead, since the new publishable key format isn't a JWT and Supabase's gateway-level JWT check isn't reliable for it.

Then in `LATEST_CAP.html`, fill in `SUPABASE_PUBLISHABLE_KEY` (same value as `CAP_SB_KEY` above) — this key is designed by Supabase to be safe in browser code; it only ever authenticates to these two proxy functions, never to PostgREST or GitHub directly.

## Before doing anything else

**Rotate the Supabase key and GitHub token that were previously hardcoded in `LATEST_CAP.html`.** They're in plaintext in commit 1's history. Rotating them makes the ones in history harmless even after they're pushed anywhere.

## Next steps

See `CLAUDE.md` → "Target state" and "Working agreement" sections. The two known logic bugs in `CaP_Docs_vs_Code_Audit.md` (conflict auto-resolution, rejection routing) are still open and were deliberately not touched by this commit.
