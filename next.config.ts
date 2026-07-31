import type { NextConfig } from "next";

// Derive the storage host from env so remotePatterns stay correct across
// deploys (uploads are served from the Supabase project host).
function storageHost(): string | null {
  const raw = process.env.R2_PUBLIC_BASE_URL || process.env.SUPABASE_URL;
  try {
    return raw ? new URL(raw).hostname : null;
  } catch {
    return null;
  }
}

const host = storageHost();

// Security headers applied to every response.
// Full script-src CSP, now ENFORCED (was report-only, promoted after the report
// phase). It still keeps report-uri /api/csp-report, so violations are logged even
// while blocking — that's the ongoing tripwire for anything the policy misses.
// Origins in the allowlist: Razorpay checkout (script + iframe + connect), Supabase
// over both https AND wss (Realtime messaging uses a WebSocket to *.supabase.co),
// and https: images (unsplash / ui-avatars / supabase / cover hosts).
// ponytail: 'unsafe-inline' stays in script-src/style-src because Next injects inline
// scripts/styles today. Enforcing WITH unsafe-inline still blocks external/injected
// script origins, object/base/frame — a real gain. Upgrade path: switch Next to
// nonce-based inline (strict-dynamic + per-request nonce) and drop 'unsafe-inline'.
// React's dev mode needs eval() for debugging (callstacks, fast refresh); prod never
// does. 'unsafe-eval' is added only in dev so the enforced prod policy stays strict.
// Exported for tests — the prod invariants (no unsafe-eval, wss allowed for Realtime,
// report-uri present) are security-critical and worth locking.
export function buildCsp(isDev: boolean): string {
  const devEval = isDev ? "'unsafe-eval' " : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${devEval}https://checkout.razorpay.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.razorpay.com https://*.supabase.co wss://*.supabase.co",
    "frame-src https://*.razorpay.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "report-uri /api/csp-report",
  ].join("; ");
}

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: buildCsp(process.env.NODE_ENV !== "production") },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "website-assets.shubhamdatarkar.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      // User uploads (post media, avatars, covers) — Supabase storage host.
      ...(host ? [{ protocol: "https" as const, hostname: host }] : []),
      // Fallback: any Supabase project host if the env var is unset at build.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
