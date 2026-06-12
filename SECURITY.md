# The Parliament — Security Architecture

**Status:** Foundational design (`AUDIT_REPORT.md` D16/D17). Defines the controls a production alumni social platform must implement. Maps to the schema in `CORE_PLATFORM_SCHEMA.md` and the ARS design.

**Threat model in one line:** an alumni-only network where the main adversaries are (a) outsiders trying to get in, (b) insiders inflating reputation / spamming / harassing, and (c) admins abusing privileged tooling. Reputation (ARS) is one control, not the whole story.

---

## 1. Authentication

| Concern | Decision |
|---------|----------|
| Password storage | **Argon2id** (memory-hard), per-user salt, pepper from KMS. Never MD5/SHA-only. |
| Password policy | Length ≥ 12, zxcvbn strength ≥ 3, breached-password check (HIBP k-anonymity). No forced rotation. |
| Tokens | Short-lived **access JWT** (≤ 15 min) + opaque **refresh token** stored hashed in `user_sessions`. |
| JWT signing | Asymmetric **RS256/EdDSA**, key ID in header, keys rotated; verify `iss`, `aud`, `exp`, `nbf`. Never `alg: none`, never HS256 with a shared secret across services. |
| Refresh rotation | One-time-use refresh tokens with rotation chain (`user_sessions.rotated_from`). Reuse of a rotated token ⇒ **revoke the whole chain** (token-theft detection). |
| MFA | TOTP/WebAuthn via `mfa_factors`. **Mandatory** for any `user_roles` admin and for ARS adjustments > ±500. |
| SSO | `institute_sso` (OIDC) supported via `user_credentials`; institute email can auto-satisfy alumni verification. |
| Account recovery | `verification_tokens` (hashed, single-use, ≤ 30 min TTL). Reset invalidates all sessions. |

**Internal service auth (replaces the static `X-Service-Auth` header — D17):** service-to-service calls (e.g. `POST /reputation/event`) use **short-lived signed service JWTs** (mTLS preferred at the mesh layer) with a `nonce` + `iat`, validated against replay together with the ARS event `dedup_key`. A leaked token is time-boxed and replay is blocked by idempotency.

---

## 2. Session Management

- Access token in memory (SPA) or `HttpOnly; Secure; SameSite=Lax` cookie. **Never** in `localStorage` (XSS-exfiltratable).
- Refresh token only in `HttpOnly; Secure; SameSite=Strict` cookie scoped to the auth path.
- Server-side revocation list = `user_sessions.revoked_at`; logout/breach revokes immediately.
- Absolute session lifetime cap + idle timeout. Privileged (admin) sessions get a shorter cap and re-auth before sensitive actions (step-up auth).
- Bind sessions to a coarse device fingerprint; flag impossible-travel.

---

## 3. Authorization

- **Two independent axes:** assigned admin RBAC (`user_roles`) and earned moderation capability (ARS level). Precedence rule defined in `CORE_PLATFORM_SCHEMA.md` §4 — admin-console surfaces always require an explicit role; reputation level never grants them.
- Enforce on the **server**, per request, at the service layer — never trust client-sent level/role. `PermissionGuard` (ARS) fails **closed** to Level 0 when ARS is unreachable (`INTEGRATION_SPEC.md`).
- Object-level authorization on every resource fetch (no IDOR): a user may read/edit only objects they own or are permitted to see by `visibility`/connection/role. Never rely on UUID unguessability alone.
- Admin self-action guardrails: `no_self_approval` CHECK on adjustments (D12); admins cannot adjust their own reputation; all privileged actions write to the immutable audit trail.

---

## 4. Input Validation & Output Encoding

- **Validate every input** against a schema (e.g. Zod) at the API boundary: type, length, range, enum, format. Reject unknown fields. This is the first line against injection and the `delta != 0` / level-range class of bugs.
- **SQL injection:** parameterized queries / ORM only (Prisma or Kysely per ARS). No string-concatenated SQL anywhere, including the admin audit CSV export and dynamic sort/filter params (`sort=-createdAt` must be an allowlist, not interpolated).
- **XSS:** treat all user content (posts, comments, bio, messages) as untrusted. Output-encode by context; render Markdown through a sanitizing allowlist (e.g. DOMPurify) — strip `<script>`, event handlers, `javascript:` URLs. Set a strict **Content-Security-Policy** (`default-src 'self'`, no inline script, nonce-based).
- **File uploads** (verification evidence, post media, avatars): validate MIME by content sniffing, cap size, store in a private bucket, serve via short-lived signed URLs, never execute, strip EXIF/GPS.

---

## 5. CSRF

- State-changing endpoints require either a **double-submit CSRF token** or `SameSite=Strict` cookies plus an `Origin`/`Referer` check.
- The `POST /reputation/event` internal endpoint is not browser-reachable (service auth + network policy).
- GraphQL/REST mutations reject cross-origin requests lacking the CSRF token.

---

## 6. Rate Limiting & Abuse Prevention (edge layer — distinct from ARS daily caps)

ARS daily caps are *business* limits; these are *infrastructure* limits.

| Surface | Limit (tune in prod) |
|---------|----------------------|
| Login / password reset | Per-IP + per-account exponential backoff; CAPTCHA after N failures; lockout alerting |
| Registration | Per-IP, disposable-email block, optional invite gating |
| `POST /reputation/event` | Per service token, plus idempotency dedup |
| Write APIs (posts, messages, connections) | Per-user token bucket on top of ARS level limits |
| Public leaderboard / read APIs | Per-IP global ceiling |

**Spam / fake-engagement / bot prevention:**
- Reputation gating itself (Level 0 can't post/DM) is the primary structural defense.
- Idempotent, entity-scoped reputation events (ARS D8) stop score farming via replay.
- Velocity/anomaly detection: bursts of reactions/comments/connection requests from one account or coordinated clusters → shadow-limit + review, feed `messaging.abuse` / `fraudulent.activity` penalties.
- Device + behavioral fingerprinting to catch multi-account abuse and self-engagement rings.
- New-account reaction/comment weight is discounted in feed quality scoring until trust is established.

---

## 7. Data Protection & Privacy

- **PII at rest:** mobile, evidence documents, MFA secrets encrypted (column-level/KMS). TLS 1.2+ everywhere in transit.
- **Least privilege DB roles:** the app role has no `UPDATE`/`DELETE` on `reputation_transactions` (append-only audit — ARS D7) and no DDL.
- **GDPR / right-to-erasure vs. immutable ledger:** reconcile the conflict the audit raised — on erasure, **pseudonymize** the `users` row (drop email/mobile/name, set `status='deleted'`) and **retain reputation_transactions** with the user reference intact but PII-free. The ledger keeps integrity; the person is de-identified. Document the lawful basis and retention window.
- **Audit logging:** every admin/privileged action (role grants, rule edits, adjustments, penalty reversals, threshold changes) is logged immutably with actor, target, before/after, and request id. Logs are tamper-evident (append-only + periodic hash chaining).
- **Secrets:** no secrets in repo; use a vault/KMS; rotate signing and service keys.

---

## 8. Operational Security

- Security headers: HSTS, CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, frame-ancestors `'none'`.
- Dependency scanning (SCA) + SAST in CI; pin and review dependencies (supply-chain).
- Centralized structured logs with PII redaction; alerting on auth anomalies, privilege use, and ARS penalty spikes (possible mass-report attack).
- Backups encrypted and restore-tested; documented incident-response runbook.

---

## 9. Mapping to audit findings

| Finding | Addressed in |
|---------|--------------|
| D16 — no security strategy | This whole document |
| D17 — static service token, replayable | §1 (signed short-lived service JWT + nonce) + ARS dedup |
| D12 — admin self-approval / 2FA | §3 + `mfa_factors` + `no_self_approval` |
| D7 — audit immutability is policy not mechanism | §7 (REVOKE UPDATE/DELETE, hash chaining) |
| Erasure vs. never-hard-delete conflict | §7 (pseudonymize user, retain ledger) |
| Downgrade via mass-reporting (QA §5) | §6 (anomaly detection + ARS 24h grace) |

## 10. Pre-launch security checklist (must pass)

- [ ] Argon2id + breached-password check live
- [ ] RS256/EdDSA JWT, refresh rotation + reuse detection
- [ ] MFA enforced for admins and large adjustments
- [ ] All inputs schema-validated; CSP + sanitized rendering deployed
- [ ] Parameterized queries audited (incl. dynamic sort/filter/CSV)
- [ ] CSRF protection on all mutations
- [ ] Edge rate limits + login lockout + CAPTCHA
- [ ] `reputation_transactions` append-only at DB role level
- [ ] Erasure flow pseudonymizes without breaking the ledger
- [ ] Secrets in vault; keys rotated; security headers set
