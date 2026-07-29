import { ipcMain } from "electron";

import { RELEASE_MANIFEST_URL } from "../../core/app-constants";

export type ReleasePlatform = "windows" | "macos" | "linux";

export interface LatestReleaseInfo {
  version: string;
  downloadUrl: string | null;
}

interface ReleaseAssetShape {
  url?: string;
}

interface ReleaseManifestShape {
  schemaVersion: number;
  version: string;
  releaseUrl?: string;
  downloads?: Partial<Record<ReleasePlatform, ReleaseAssetShape>>;
}

const isReleaseManifest = (value: unknown): value is ReleaseManifestShape => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ReleaseManifestShape>;

  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.version === "string" &&
    candidate.version.length > 0
  );
};

const platformFromProcess = (): ReleasePlatform => {
  switch (process.platform) {
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    default:
      return "windows";
  }
};

export const getLatestRelease = async (
  fetchImpl: typeof fetch = fetch,
  manifestUrl: string = RELEASE_MANIFEST_URL
): Promise<LatestReleaseInfo | null> => {
  const response = await fetchImpl(manifestUrl, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error(`Release manifest request failed: ${response.status}`);

  const value: unknown = await response.json();

  if (!isReleaseManifest(value)) throw new Error("Release manifest has an invalid shape");

  const platform = platformFromProcess();
  const platformAsset = value.downloads?.[platform];
  const downloadUrl = platformAsset?.url ?? value.releaseUrl ?? null;

  return { version: value.version, downloadUrl };
};

export const registerReleaseIpc = (): void => {
  ipcMain.handle("app:getLatestRelease", async (): Promise<LatestReleaseInfo | null> => {
    try {
      return await getLatestRelease();
    } catch {
      return null;
    }
  });
};
