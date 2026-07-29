import { describe, expect, it, vi } from "vitest";

import { getLatestRelease } from "./release";

const createJsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  }) as unknown as Response;

describe("getLatestRelease", () => {
  it("returns the version and platform download URL from a valid release manifest", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse(200, {
        schemaVersion: 1,
        version: "1.2.3",
        tag: "v1.2.3",
        releaseUrl: "https://github.com/MagicFutureApp/SkillsManager/releases/tag/v1.2.3",
        downloads: {
          windows: {
            name: "skills-manager-win.exe",
            url: "https://github.com/MagicFutureApp/SkillsManager/releases/download/v1.2.3/skills-manager-win.exe",
            sha256: "abc"
          },
          macos: {
            name: "skills-manager-mac.dmg",
            url: "https://github.com/MagicFutureApp/SkillsManager/releases/download/v1.2.3/skills-manager-mac.dmg",
            sha256: "abc"
          },
          linux: {
            name: "skills-manager-linux.AppImage",
            url: "https://github.com/MagicFutureApp/SkillsManager/releases/download/v1.2.3/skills-manager-linux.AppImage",
            sha256: "abc"
          }
        }
      })
    ) as unknown as typeof fetch;

    const result = await getLatestRelease(fetchImpl, "https://example.test/latest");

    expect(result?.version).toBe("1.2.3");
    expect(typeof result?.downloadUrl).toBe("string");
    expect(result?.downloadUrl).toContain(
      "https://github.com/MagicFutureApp/SkillsManager/releases/download/v1.2.3/"
    );
    expect(fetchImpl).toHaveBeenCalledWith("https://example.test/latest", {
      headers: { Accept: "application/json" }
    });
  });

  it("falls back to releaseUrl when the platform asset is missing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse(200, {
        schemaVersion: 1,
        version: "1.2.3",
        releaseUrl: "https://github.com/MagicFutureApp/SkillsManager/releases/tag/v1.2.3"
      })
    ) as unknown as typeof fetch;

    const result = await getLatestRelease(fetchImpl, "https://example.test/latest");

    expect(result?.downloadUrl).toBe(
      "https://github.com/MagicFutureApp/SkillsManager/releases/tag/v1.2.3"
    );
  });

  it("throws when the response is not ok", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(createJsonResponse(404, {})) as unknown as typeof fetch;

    await expect(getLatestRelease(fetchImpl, "https://example.test/latest")).rejects.toThrow(
      /Release manifest request failed/
    );
  });

  it("throws when the manifest schema version is unexpected", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse(200, { schemaVersion: 2, version: "1.2.3" })
      ) as unknown as typeof fetch;

    await expect(getLatestRelease(fetchImpl, "https://example.test/latest")).rejects.toThrow(
      /invalid shape/
    );
  });

  it("throws when the version is missing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(createJsonResponse(200, { schemaVersion: 1 })) as unknown as typeof fetch;

    await expect(getLatestRelease(fetchImpl, "https://example.test/latest")).rejects.toThrow(
      /invalid shape/
    );
  });
});
