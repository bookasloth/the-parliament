import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/onboarding/",
          "/auth/",
          "/settings/",
          "/messages/",
          "/notifications/",
        ],
      },
    ],
    sitemap: "https://nnawca.org/sitemap.xml",
    host: "https://nnawca.org",
  };
}
