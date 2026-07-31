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

// Security headers applied to every response. These are the non-breaking ones:
// HSTS, anti-sniffing, referrer/permissions policy, and a CSP limited to
// clickjacking/base-tag/plugin protection (frame-ancestors/base-uri/object-src)
// — deliberately NOT a script-src CSP, which would need a monitored rollout to
// avoid breaking the Razorpay checkout script on this live payment app.
// Full script-src CSP shipped as REPORT-ONLY first: it never blocks, it only
// reports violations to /api/csp-report so the policy can be tuned (nonces, real
// third-party origins) before being promoted to an enforced Content-Security-Policy.
// 'unsafe-inline' is present only because Next injects inline styles/scripts today;
// the goal of the report phase is to replace it with nonces, then enforce.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.razorpay.com https://*.supabase.co",
  "frame-src https://*.razorpay.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "report-uri /api/csp-report",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
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
