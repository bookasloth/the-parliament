import type { MetadataRoute } from "next";
import { listApprovedBusinessSlugs } from "@/modules/business/service";

const BASE = "https://nnawca.org";

// Public, crawlable static pages. Business detail pages are public + indexable
// and appended below; events and profiles are still auth-gated, so excluded.
const PUBLIC_PATHS = [
  "",
  "/auth/signin",
  "/auth/signup",
  "/about",
  "/changelog",
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries = PUBLIC_PATHS.map((p) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : p.startsWith("/auth") ? 0.5 : 0.7,
  }));

  // Approved businesses — public, crawlable pages. Best-effort: never let a DB
  // hiccup blank the whole sitemap.
  let businessEntries: MetadataRoute.Sitemap = [];
  try {
    const rows = await listApprovedBusinessSlugs();
    businessEntries = rows.map((b) => ({
      url: `${BASE}/business/${b.slug}`,
      lastModified: b.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    businessEntries = [];
  }

  return [...staticEntries, ...businessEntries];
}
