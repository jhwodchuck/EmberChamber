import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Purely static content (no per-request data) — required explicitly for
// `output: "export"` compatibility (the desktop static-export build).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
