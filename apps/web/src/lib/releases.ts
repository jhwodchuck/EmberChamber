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
    const latestRelease = releases.find((release) => release.assets.length > 0);

    if (!latestRelease) {
      return null;
    }

    return {
      releaseName: latestRelease.name ?? latestRelease.tag_name,
      releaseTag: latestRelease.tag_name,
      releaseUrl: latestRelease.html_url,
      prerelease: latestRelease.prerelease,
      publishedAt: latestRelease.published_at,
      downloadsByPlatform: {
        android: pickPlatformDownloads(latestRelease, [".apk", ".aab"]),
        windows: pickPlatformDownloads(latestRelease, [".msi", ".exe"]),
        ubuntu: pickPlatformDownloads(latestRelease, [".deb", ".appimage"]),
      },
    };
  } catch {
    return null;
  }
}
