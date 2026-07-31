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
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
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
