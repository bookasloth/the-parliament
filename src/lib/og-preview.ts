// Server-only Open Graph preview fetcher for `link` posts.
// Security: this fetches an arbitrary user-supplied URL server-side, so it MUST
// guard against SSRF — no non-http(s) schemes, no private/loopback/link-local
// hosts, and every redirect hop is re-validated. Failures degrade to null (the
// UI then shows the bare link).

import { lookup } from "node:dns/promises"
import net from "node:net"

export interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

const TIMEOUT_MS = 5000
const MAX_REDIRECTS = 2
const MAX_BYTES = 512 * 1024 // only the <head> matters; cap the body read
const UA = "NNAWCA-LinkPreview/1.0 (+https://nnawca.org)"

/** True for IPv4/IPv6 literals that must never be fetched (private, loopback,
 *  link-local, unspecified, CGNAT, unique-local, etc.). Pure — unit tested. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number)
    if (p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true // malformed → treat as unsafe
    const [a, b] = p
    if (a === 10) return true // 10.0.0.0/8
    if (a === 127) return true // loopback
    if (a === 0) return true // 0.0.0.0/8 "this host"
    if (a === 169 && b === 254) return true // link-local 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64.0.0/10
    if (a >= 224) return true // multicast/reserved 224.0.0.0+
    return false
  }
  if (net.isIPv6(ip)) {
    const lc = ip.toLowerCase()
    if (lc === "::1" || lc === "::") return true // loopback / unspecified
    if (lc.startsWith("fe80")) return true // link-local
    if (lc.startsWith("fc") || lc.startsWith("fd")) return true // unique-local fc00::/7
    // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded v4.
    const m = lc.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (m) return isPrivateIp(m[1])
    return false
  }
  return true // not a recognizable IP literal → unsafe
}

/** Hostnames that resolve to the local machine regardless of DNS. */
export function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "")
  return h === "localhost" || h.endsWith(".localhost")
}

/** Parse + scheme-check a candidate URL. Returns the URL only for http(s) with a
 *  non-blocked, non-private-literal host. Pure (no DNS) — unit tested. */
export function parseUrlSafe(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  const host = url.hostname
  if (!host) return null
  if (isBlockedHostname(host)) return null
  // If the host is an IP literal, reject private ranges up front (before DNS).
  const bareHost = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host
  if (net.isIP(bareHost) && isPrivateIp(bareHost)) return null
  return url
}

const OG = ["title", "description", "image", "site_name"] as const

function metaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    // property="og:title" content="..."  OR  content="..." property="og:title"
    // (both attribute orders), and name="..." as a fallback carrier.
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i"),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m && m[1].trim()) return decodeEntities(m[1].trim())
    }
  }
  return undefined
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x2F;/gi, "/")
}

/** Extract OG metadata from raw HTML, falling back to <title>. Pure — unit tested. */
export function parseOgTags(html: string): Omit<LinkPreview, "url"> {
  const title =
    metaContent(html, ["og:title", "twitter:title"]) ??
    (() => {
      const m = html.match(/<title[^>]*>([^<]*)<\/title>/i)
      return m && m[1].trim() ? decodeEntities(m[1].trim()) : undefined
    })()
  const description = metaContent(html, ["og:description", "twitter:description", "description"])
  const image = metaContent(html, ["og:image", "twitter:image", "twitter:image:src"])
  const siteName = metaContent(html, ["og:site_name"])
  return { title, description, image, siteName }
}

/** DNS-resolve a hostname and confirm every address is public. Throws on unsafe. */
async function assertPublicHost(hostname: string): Promise<void> {
  const bare = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname
  if (net.isIP(bare)) {
    if (isPrivateIp(bare)) throw new Error("blocked host")
    return
  }
  const results = await lookup(bare, { all: true })
  if (results.length === 0) throw new Error("no address")
  for (const r of results) {
    if (isPrivateIp(r.address)) throw new Error("blocked host")
  }
}

/** Read a response body but stop after MAX_BYTES (the <head> is all we parse). */
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return res.text()
  const decoder = new TextDecoder()
  let out = ""
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    out += decoder.decode(value, { stream: true })
    if (total >= MAX_BYTES) {
      await reader.cancel().catch(() => {})
      break
    }
  }
  return out
}

/**
 * Fetch and parse an OG preview for `rawUrl`. Returns null on any failure
 * (invalid/unsafe URL, timeout, non-HTML, no OG tags) so callers can store null
 * and render the bare link.
 */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  let target = rawUrl
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const parsed = parseUrlSafe(target)
      if (!parsed) return null
      await assertPublicHost(parsed.hostname)

      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
      let res: Response
      try {
        res = await fetch(parsed.toString(), {
          method: "GET",
          redirect: "manual", // re-validate each hop ourselves (SSRF)
          signal: ctrl.signal,
          headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
        })
      } finally {
        clearTimeout(timer)
      }

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location")
        if (!loc) return null
        target = new URL(loc, parsed).toString()
        continue
      }
      if (!res.ok) return null
      const ct = (res.headers.get("content-type") ?? "").toLowerCase()
      if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null

      const html = await readCapped(res)
      const og = parseOgTags(html)
      if (!og.title && !og.description && !og.image && !og.siteName) return null
      return { url: parsed.toString(), ...og }
    }
    return null // too many redirects
  } catch {
    return null
  }
}
