import crypto from "node:crypto"
import { env } from "@/config/env"

// Signed token embedded in the ID-card QR. It does NOT itself assert validity —
// it only names *which* member this card belongs to, tamper-proof. The verify
// page re-checks live membership status from the DB (BookMyShow model: the scan
// is authenticated by the signature, the verdict is computed fresh each time).
//
// Hand-rolled HS256 over node:crypto — the project deliberately avoids jose /
// jsonwebtoken (see supabase-realtime.ts). Payload: { u: userId, iat }.

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

function sign(data: string, secret: string): string {
  return b64url(crypto.createHmac("sha256", secret).update(data).digest())
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export interface IdCardTokenPayload {
  u: string // userId
  iat: number // issued-at (epoch seconds)
}

/** Sign a card token for a user. Secret defaults to AUTH_SECRET. */
export function signIdCardToken(userId: string, secret = env.authSecret): string {
  if (!secret) throw new Error("AUTH_SECRET missing — cannot sign ID-card token")
  const payload: IdCardTokenPayload = { u: userId, iat: Math.floor(Date.now() / 1000) }
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  return `${body}.${sign(body, secret)}`
}

/** Verify a token's signature and return its payload, or null if tampered/malformed. */
export function verifyIdCardToken(token: string, secret = env.authSecret): IdCardTokenPayload | null {
  if (!secret) return null
  const dot = token.indexOf(".")
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!body || !sig) return null
  if (!safeEqual(sig, sign(body, secret))) return null
  try {
    const parsed = JSON.parse(b64urlDecode(body).toString("utf8")) as IdCardTokenPayload
    if (!parsed || typeof parsed.u !== "string" || typeof parsed.iat !== "number") return null
    return parsed
  } catch {
    return null
  }
}
