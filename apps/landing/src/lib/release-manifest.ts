export const RELEASE_MANIFEST_KEY = "latest";
export const RELEASE_PAGE_URL = "https://github.com/yimity/SkillsManager-Releases/releases/latest";

export type ReleasePlatform = "windows" | "macos" | "linux";
const RELEASE_PLATFORMS: ReleasePlatform[] = ["windows", "macos", "linux"];

export interface ReleaseAsset {
  name: string;
  url: string;
  sha256: string;
}

export interface ReleaseManifest {
  schemaVersion: 1;
  version: string;
  tag: string;
  publishedAt: string;
  releaseUrl: string;
  downloads: Record<ReleasePlatform, ReleaseAsset>;
}

export function isReleaseManifest(value: unknown): value is ReleaseManifest {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ReleaseManifest>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.version !== "string" ||
    typeof candidate.tag !== "string" ||
    typeof candidate.publishedAt !== "string" ||
    typeof candidate.releaseUrl !== "string" ||
    !candidate.downloads ||
    typeof candidate.downloads !== "object"
  ) {
    return false;
  }

  return RELEASE_PLATFORMS.every((platform) => {
    const asset = candidate.downloads?.[platform];
    if (!asset) return false;
    return (
      typeof asset.name === "string" &&
      typeof asset.url === "string" &&
      typeof asset.sha256 === "string"
    );
  });
}

export function getReleaseAsset(
  manifest: ReleaseManifest | null,
  platform: ReleasePlatform
): ReleaseAsset | null {
  return manifest?.downloads[platform] ?? null;
}

export function getBrowserPlatform(): ReleasePlatform {
  if (typeof navigator === "undefined") return "windows";

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "macos";
  if (userAgent.includes("linux")) return "linux";
  return "windows";
}

export function getReleaseDownloadUrl(manifest: ReleaseManifest | null): string {
  return (
    getReleaseAsset(manifest, getBrowserPlatform())?.url ?? manifest?.releaseUrl ?? RELEASE_PAGE_URL
  );
}
