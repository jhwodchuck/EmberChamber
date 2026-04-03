type GitHubAsset = {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
  updated_at: string;
  content_type: string;
};

type GitHubRelease = {
  html_url: string;
  name: string | null;
  tag_name: string;
  prerelease: boolean;
  published_at: string | null;
  assets: GitHubAsset[];
};

export type PlatformDownload = {
  label: string;
  url: string;
  size: number;
  downloadCount: number;
  updatedAt: string;
};

export type PlatformReleaseAvailability = {
  releaseName: string;
  releaseTag: string;
  releaseUrl: string;
  prerelease: boolean;
  publishedAt: string | null;
  downloadsByPlatform: Record<string, PlatformDownload[]>;
};

const RELEASES_API_URL = "https://api.github.com/repos/jhwodchuck/EmberChamber/releases";

const PLATFORM_SUFFIXES = {
  android: [".apk", ".aab"],
  windows: [".msi", ".exe"],
  ubuntu: [".deb", ".appimage"],
} as const;

function matchesAsset(name: string, suffixes: string[]) {
  const lowerName = name.toLowerCase();
  return suffixes.some((suffix) => lowerName.endsWith(suffix));
}

function pickPlatformDownloads(release: GitHubRelease, suffixes: string[]) {
  return release.assets
    .filter((asset) => matchesAsset(asset.name, suffixes))
    .map((asset) => ({
      label: asset.name,
      url: asset.browser_download_url,
      size: asset.size,
      downloadCount: asset.download_count,
      updatedAt: asset.updated_at,
    }));
}

export async function getLatestPlatformRelease(): Promise<PlatformReleaseAvailability | null> {
  try {
    const response = await fetch(RELEASES_API_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "emberchamber-web",
      },
      next: {
        revalidate: 300,
      },
    });

    if (!response.ok) {
      return null;
    }

    const releases = (await response.json()) as GitHubRelease[];
    const downloadsByPlatform: Record<string, PlatformDownload[]> = {
      android: [],
      windows: [],
      ubuntu: [],
    };

    let latestNativeRelease: GitHubRelease | null = null;

    for (const release of releases) {
      let releaseHasNativeAssets = false;

      for (const [platform, suffixes] of Object.entries(PLATFORM_SUFFIXES)) {
        if (downloadsByPlatform[platform].length > 0) {
          continue;
        }

        const platformDownloads = pickPlatformDownloads(release, [...suffixes]);
        if (platformDownloads.length > 0) {
          downloadsByPlatform[platform] = platformDownloads;
          releaseHasNativeAssets = true;
        }
      }

      if (!latestNativeRelease && releaseHasNativeAssets) {
        latestNativeRelease = release;
      }

      if (Object.values(downloadsByPlatform).every((downloads) => downloads.length > 0)) {
        break;
      }
    }

    if (!latestNativeRelease) {
      return null;
    }

    return {
      releaseName: latestNativeRelease.name ?? latestNativeRelease.tag_name,
      releaseTag: latestNativeRelease.tag_name,
      releaseUrl: latestNativeRelease.html_url,
      prerelease: latestNativeRelease.prerelease,
      publishedAt: latestNativeRelease.published_at,
      downloadsByPlatform,
    };
  } catch {
    return null;
  }
}
