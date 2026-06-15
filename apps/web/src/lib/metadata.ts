import type { Metadata } from "next";
import { siteUrl } from "./site";

interface MetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  image?: string;
}

export function createMetadata({
  title,
  description,
  path = "",
  noIndex = false,
  image,
}: MetadataOptions = {}): Metadata {
  const resolvedUrl = `${siteUrl}${path}`;
  const displayDescription =
    description ||
    "Invite-only encrypted messaging for private DMs and trusted small groups, with local-first history, device-local search, and clear relay boundaries.";
  const ogImage = image || "/opengraph-image";
  const twitterImage = image || "/twitter-image";

  // Use absolute title structure for the root to prevent appending layout template suffix twice
  const isRoot = path === "" || path === "/";
  const defaultTitle = "EmberChamber — Invite-Only Encrypted Messaging";
  const pageTitle = title || defaultTitle;

  return {
    title: isRoot ? { absolute: pageTitle } : pageTitle,
    description: displayDescription,
    alternates: {
      canonical: resolvedUrl,
    },
    openGraph: {
      title: pageTitle,
      description: displayDescription,
      url: resolvedUrl,
      images: [
        {
          url: ogImage,
          alt: title || "EmberChamber",
        },
      ],
    },
    twitter: {
      title: pageTitle,
      description: displayDescription,
      images: [twitterImage],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
