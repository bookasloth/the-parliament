import type { MetadataRoute } from "next";

const BASE = "https://nnawca.org";

// Public, crawlable pages only. Events, businesses, and profiles live behind the
// auth gate — listing them would point crawlers at a login redirect, so they're
// deliberately excluded.
const PUBLIC_PATHS = [
  "",
  "/auth/signin",
  "/auth/signup",
  "/about",
  "/committee",
  "/contact",
  "/donate",
  "/governance",
  "/join",
  "/newsroom",
  "/privacy",
  "/sponsorship",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_PATHS.map((p) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : p.startsWith("/auth") ? 0.5 : 0.7,
  }));
}
