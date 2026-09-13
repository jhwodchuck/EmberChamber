import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Purely static content (no per-request data) — required explicitly for
// `output: "export"` compatibility (the desktop static-export build).
export const dynamic = "force-static";

// Stable for the generated sitemap in a deploy, rather than per request.
const lastModified = new Date();

type RouteConfig = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

const routes: RouteConfig[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/tour", priority: 0.9, changeFrequency: "monthly" },
  { path: "/engineering", priority: 0.9, changeFrequency: "monthly" },
  { path: "/start", priority: 0.9, changeFrequency: "weekly" },
  { path: "/download", priority: 0.9, changeFrequency: "weekly" },
  { path: "/docs", priority: 0.7, changeFrequency: "monthly" },
  { path: "/docs/no-phone-number-private-messaging", priority: 0.8, changeFrequency: "monthly" },
  { path: "/docs/local-first-messaging", priority: 0.8, changeFrequency: "monthly" },
  { path: "/docs/relay-boundary", priority: 0.8, changeFrequency: "monthly" },
  { path: "/docs/encrypted-group-chat", priority: 0.8, changeFrequency: "monthly" },
  { path: "/docs/android-private-messenger-beta", priority: 0.8, changeFrequency: "monthly" },
  { path: "/docs/windows-encrypted-messenger", priority: 0.8, changeFrequency: "monthly" },
  { path: "/docs/ubuntu-encrypted-messenger", priority: 0.8, changeFrequency: "monthly" },
  { path: "/trust-and-safety", priority: 0.7, changeFrequency: "monthly" },
  { path: "/security", priority: 0.6, changeFrequency: "monthly" },
  { path: "/support", priority: 0.6, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/beta-terms", priority: 0.4, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
