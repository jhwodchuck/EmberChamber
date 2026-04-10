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

export type PlatformPostedBuild = {
  releaseName: string;
  releaseTag: string;
  releaseUrl: string;
  prerelease: boolean;
  publishedAt: string | null;
  downloads: PlatformDownload[];
};

export type PlatformReleaseAvailability = {
  buildsByPlatform: Record<string, PlatformPostedBuild | null>;
};

const RELEASES_API_URL =
  "https://api.github.com/repos/jhwodchuck/EmberChamber/releases";

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
    const buildsByPlatform: Record<string, PlatformPostedBuild | null> = {
      android: null,
      windows: null,
      ubuntu: null,
    };

    for (const release of releases) {
      for (const [platform, suffixes] of Object.entries(PLATFORM_SUFFIXES)) {
        if (buildsByPlatform[platform]) {
          continue;
        }

        const downloads = pickPlatformDownloads(release, [...suffixes]);
        if (downloads.length === 0) {
          continue;
        }

        buildsByPlatform[platform] = {
          releaseName: release.name ?? release.tag_name,
          releaseTag: release.tag_name,
          releaseUrl: release.html_url,
          prerelease: release.prerelease,
          publishedAt: release.published_at,
          downloads,
        };
      }

      if (Object.values(buildsByPlatform).every(Boolean)) {
        break;
      }
    }

    if (!Object.values(buildsByPlatform).some(Boolean)) {
      return null;
    }

    return {
      buildsByPlatform,
    };
  } catch {
    return null;
  }
}
