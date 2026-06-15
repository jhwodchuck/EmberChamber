import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const publicRoutes = [
  "",
  "/start",
  "/download",
  "/privacy",
  "/beta-terms",
  "/trust-and-safety",
  "/support",
  "/changelog",
  "/security",
  "/docs",
  "/docs/no-phone-number-private-messaging",
  "/docs/local-first-messaging",
  "/docs/relay-boundary",
  "/docs/encrypted-group-chat",
  "/docs/android-private-messenger-beta",
  "/docs/windows-encrypted-messenger",
  "/docs/ubuntu-encrypted-messenger",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
