import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// A stable build-time timestamp. Using `new Date()` per-route reports that every
// page changed on every crawl, which erodes the signal crawlers take from
// <lastmod>. Pin it once per deploy instead.
const lastModified = new Date();

type RouteConfig = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

const routes: RouteConfig[] = [
  // Primary conversion + entry pages
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/start", priority: 0.9, changeFrequency: "weekly" },
  { path: "/download", priority: 0.9, changeFrequency: "weekly" },
  // SEO landing / documentation
  { path: "/docs", priority: 0.7, changeFrequency: "monthly" },
  {
    path: "/docs/no-phone-number-private-messaging",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/docs/local-first-messaging",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  { path: "/docs/relay-boundary", priority: 0.8, changeFrequency: "monthly" },
  {
    path: "/docs/encrypted-group-chat",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/docs/android-private-messenger-beta",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/docs/windows-encrypted-messenger",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/docs/ubuntu-encrypted-messenger",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  // Trust / support surface
  { path: "/trust-and-safety", priority: 0.7, changeFrequency: "monthly" },
  { path: "/security", priority: 0.6, changeFrequency: "monthly" },
  { path: "/support", priority: 0.6, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.6, changeFrequency: "weekly" },
  // Legal
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
