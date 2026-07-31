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

const nextConfig: NextConfig = {
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
