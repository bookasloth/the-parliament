# Laya auto-moderation via Python sidecar — scope

**Date:** 2026-09-26
**Status:** scoped, not built
**Owner:** solo

## Goal
Add proactive content scoring to the (currently reactive) moderation queue using
`convaiinnovations/laya` — a non-autoregressive ModernBERT decision engine that
returns calibrated toxic/harassment/threat/spam/severity signals in one forward
pass. Laya does **not** replace human moderators; it flags and prioritises.

## Why a sidecar
Laya is Python + torch + a ~400M-param model. The app is TypeScript on Vercel
serverless — no Python runtime, and cold-loading a 400M model per request is a
non-starter. So laya runs as a **long-lived Python service** (FastAPI) that loads
the model once at boot and exposes one HTTP endpoint. The Next.js app calls it
over HTTP.

## Architecture

```
post/comment/message created ──▶ Next.js server action
                                      │  (fire-and-forget or queued)
                                      ▼
                            POST {SIDECAR_URL}/score   ── fail-open ──▶ skip
                                      │
                                      ▼
                        FastAPI (laya loaded once, GPU/CPU)
                        agent.system_one(text, moderation_questions())
                                      │
                                      ▼
             { toxic, harassment, threat, spam, severity, confidence }
                                      │
        severity ≥ THRESHOLD ──▶ fileReport() from AUTOMOD bot user
        else                  ──▶ store score only (queue sort hint)
```

### Sidecar (new, ~120 lines Python)
- `services/laya-automod/` (new top-level dir, own Dockerfile).
- `app.py`: FastAPI, one route `POST /score` → `{text}` in, laya answers out.
  Load `laya.load()` once at module import. Use `laya.moderation_questions()`.
- Auth: shared secret header `X-Automod-Key` (env), reject otherwise.
- `requirements.txt`: `laya==0.3.6`, `torch`, `fastapi`, `uvicorn`.
- Deploy target: **NOT Vercel** (no long-lived Python + no model weights). Options:
  - Railway / Render / Fly.io small box (CPU is fine — ModernBERT-large runs on
    CPU in ~100-300ms/item; no GPU needed for this volume).
  - Or the existing Hostinger VPS (Docker Compose already used for local PG).
    Cheapest given a box already exists.

### App side (TypeScript)
- `src/lib/automod.ts` (new): `scoreContent(text): Promise<AutomodScore | null>`.
  - `fetch(SIDECAR_URL + "/score")` with key header, 2s timeout.
  - **Fail-open**: any error / unset `LAYA_SIDECAR_URL` → return `null`, log, move
    on. Missing sidecar must never block a user posting. (Mirror the AiSensy
    fail-closed env guard pattern, but open here — flagging, not gating.)
- `src/modules/moderation/automod.ts` (new): `maybeAutoFlag(entityType, entityId,
  text)`:
  - Calls `scoreContent`. If `null` → noop.
  - If `severity >= LAYA_AUTOMOD_THRESHOLD` (default 2.5 on the 0-3 scale) OR any
    of threat/harassment `noul > 0.85` → `fileReport({ reporterId: AUTOMOD_BOT_ID,
    reason: "auto:" + topSignal, details: JSON.stringify(score) })`.
  - Reuses existing `fileReport` → existing cluster/queue/committee-notify flow.
    **No new moderator UI needed for MVP** — auto-reports land in the same queue,
    distinguishable by `reporterId === AUTOMOD_BOT_ID` and `reason` prefix `auto:`.
- Reporter identity: reuse the existing NNAWCA system/bot account
  (`member_type="system"`, `admin@nnawca.com`) as AUTOMOD_BOT_ID, or a dedicated
  `automod` system user. Reuse — the bot account already exists.

### Where to call it (hook points)
Call `maybeAutoFlag` fire-and-forget (`void ...catch`) after successful create:
- Post create — `src/modules/feed/*` create path.
- Comment create — comment action.
- DM send — `src/modules/messaging/*` send path (optional; higher volume).
MVP: **posts + comments only.** DMs are higher volume + private; defer.

## Data
Two lazy options for storing the score:

- **A (MVP, zero migration):** don't persist raw scores. High-severity → an
  auto `ContentReport` (already persisted). Low-severity → dropped. Queue order
  unchanged. Simplest; ships without SQL.
- **B (later):** add `automod_score jsonb`, `automod_severity real` to posts (or a
  `content_scores` table) to sort/filter the queue by model severity and show a
  badge. Needs a migration (hand-run SQL per project rule). Do only if A proves
  the model useful.

Ship A first.

## Config / env (new)
```
LAYA_SIDECAR_URL          # https://automod.internal/...  unset = fail-open, no-op
LAYA_AUTOMOD_KEY          # shared secret, sent as X-Automod-Key
LAYA_AUTOMOD_THRESHOLD    # optional, default 2.5 (0-3 severity scale)
```
Sidecar env: `LAYA_AUTOMOD_KEY` (same secret), `MODEL_ID=convaiinnovations/laya`.

## Tests (standing rule)
- Unit (`tests/automod.test.ts`): the decision logic — given a mocked laya
  response, `maybeAutoFlag` files a report above threshold, skips below, and is a
  noop when `scoreContent` returns `null` (sidecar down). Mock the fetch; no real
  model. Cover threshold boundary + threat-noul override + fail-open.
- Sidecar: one `pytest` asserting `/score` returns the 5 keys for a sample string
  and rejects a bad key. (Runs only where Python + model available; not in CI.)

## Explicitly out of scope (MVP)
- Auto-*removal* — laya only flags; humans still act. (Calibrated but not
  infallible; auto-hide is a P2 once precision is measured on real reports.)
- DM scanning, queue re-sort UI, per-signal badges (option B).
- GPU. CPU inference is enough at this volume.
- Guardrails/triage/routing presets — laya supports them, but this scope is
  moderation only.

## Risks / notes
- **Extra infra to run + pay for.** A box must stay up. If that's unwanted, laya
  isn't worth it yet — the reactive queue works. This only earns its cost once
  volume makes human-only triage slow.
- **Weights:** ~800MB download on first boot (`model.safetensors`). Bake into the
  Docker image or a mounted volume so restarts don't re-pull.
- **Latency:** keep the call off the user's request path (fire-and-forget). A slow
  or dead sidecar must never delay a post landing.
- **Language:** laya ships a `detect_language`; content here is EN + Hindi/Marathi
  romanised. ModernBERT is English-weighted — non-English precision unproven.
  Measure before trusting auto-flags on vernacular posts.

## Build order
1. Sidecar `app.py` + Dockerfile + one pytest. Deploy to the VPS. Curl `/score`.
2. `src/lib/automod.ts` + `src/modules/moderation/automod.ts` + unit tests.
3. Wire `maybeAutoFlag` into post + comment create (fire-and-forget).
4. Set the 3 env vars in Vercel. Watch the queue for `auto:` reports a week.
5. If precision is good → option B (persist scores, queue sort) + maybe DMs.
