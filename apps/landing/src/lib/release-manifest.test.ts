import { describe, expect, it } from "vitest";

import { getReleaseAsset, isReleaseManifest } from "./release-manifest";

const manifest = {
  schemaVersion: 1 as const,
  version: "0.1.5",
  tag: "v0.1.5",
  publishedAt: "2026-07-22T00:00:00Z",
  releaseUrl: "https://github.com/yimity/SkillsManager-Releases/releases/tag/v0.1.5",
  downloads: {
    windows: {
      name: "skills-manager-0.1.5-win-x64-setup.exe",
      url: "https://example.com/win.exe",
      sha256: "abc"
    },
    macos: {
      name: "skills-manager-0.1.5-mac-arm64.dmg",
      url: "https://example.com/mac.dmg",
      sha256: "def"
    },
    linux: {
      name: "skills-manager-0.1.5-ubuntu-x64.deb",
      url: "https://example.com/linux.deb",
      sha256: "ghi"
    }
  }
};

describe("release manifest", () => {
  it("accepts a complete manifest", () => {
    expect(isReleaseManifest(manifest)).toBe(true);
  });

  it("rejects incomplete download metadata", () => {
    const incomplete = {
      ...manifest,
      downloads: { ...manifest.downloads, linux: { name: "linux.deb" } }
    };
    expect(isReleaseManifest(incomplete)).toBe(false);
  });

  it("returns the requested platform asset", () => {
    expect(getReleaseAsset(manifest, "macos")?.name).toContain("mac-arm64");
    expect(getReleaseAsset(null, "windows")).toBeNull();
  });
});
