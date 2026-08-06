import crypto from "node:crypto"
import { after } from "next/server"

// Server-only Supabase Realtime helpers:
//   - signRealtimeToken: mints a Supabase-format JWT so a logged-in Auth.js user
//     can authenticate to Realtime (private channels). Signed HS256 with the
//     project's legacy JWT secret — still the active verify key (the anon/
//     service_role keys are HS256 tokens off the same secret).
//   - broadcast: server pushes an event to a private channel via the Realtime
//     REST endpoint using the service-role key (bypasses channel RLS).
// ponytail: hand-rolled HS256 instead of adding jose/jsonwebtoken — it's 12 lines
// and next-auth's transitive jose isn't a stable direct import.

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

/** Supabase-compatible JWT for the given user. sub=userId drives auth.uid() in RLS. */
export function signRealtimeToken(userId: string, ttlSec = 3600): string {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) throw new Error("SUPABASE_JWT_SECRET not configured")
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })))
  const payload = b64url(
    Buffer.from(JSON.stringify({ sub: userId, role: "authenticated", aud: "authenticated", iat: now, exp: now + ttlSec })),
  )
  const data = `${header}.${payload}`
  const sig = b64url(crypto.createHmac("sha256", secret).update(data).digest())
  return `${data}.${sig}`
}

export function conversationTopic(conversationId: string): string {
  return `conversation:${conversationId}`
}

/** Per-user private channel — used for the realtime notification bell. */
export function userTopic(userId: string): string {
  return `user:${userId}`
}

async function postToTopic(topic: string, event: string, payload: unknown): Promise<void> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  try {
    await fetch(`${url.replace(/\/$/, "")}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ topic, event, payload, private: true }],
      }),
    })
  } catch {
    // ignore — DB write already succeeded; delivery falls back to reconnect fetch
  }
}

/**
 * Push a broadcast event to a private conversation channel. Best-effort:
 * callers must not let a Realtime hiccup fail the underlying DB write, so this
 * swallows errors (the client's initial fetch + reconnect covers any drop).
 *
 * Runs via `after()` so the ~200-300ms Realtime REST roundtrip lands *after* the
 * response is flushed — the sender's action returns as soon as the DB write is
 * durable, and the peer still gets the event on the same request.
 */
export async function broadcast(conversationId: string, event: string, payload: unknown): Promise<void> {
  try {
    after(() => postToTopic(conversationTopic(conversationId), event, payload))
  } catch {
    // outside a request scope (scripts, tests) — just send inline
    await postToTopic(conversationTopic(conversationId), event, payload)
  }
}

/**
 * Push an event to a user's private channel — used to nudge the notification
 * bell to refetch. Same best-effort/after() semantics as broadcast().
 */
export async function broadcastToUser(userId: string, event: string, payload: unknown): Promise<void> {
  try {
    after(() => postToTopic(userTopic(userId), event, payload))
  } catch {
    await postToTopic(userTopic(userId), event, payload)
  }
}
