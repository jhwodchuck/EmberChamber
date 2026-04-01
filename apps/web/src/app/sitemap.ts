import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const publicRoutes = ["", "/download", "/privacy", "/beta-terms", "/trust-and-safety", "/login", "/register"];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
