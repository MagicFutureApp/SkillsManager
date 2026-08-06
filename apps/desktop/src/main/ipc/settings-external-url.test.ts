import { describe, expect, it, vi } from "vitest";

import { getAppSettings, openExternalUrl, updateDistributionSettings } from "./settings";
import { createDbClient } from "../../db/client";
import { GITHUB_TOKEN_HELP_URL } from "../../core/app-constants";

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn()
  },
  shell: {
    openExternal: vi.fn()
  }
}));

describe("openExternalUrl", () => {
  it("opens GitHub HTTPS URLs with the system browser", async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const url = "https://github.com/settings/personal-access-tokens/new";

    await openExternalUrl(url, { openExternal });

    expect(openExternal).toHaveBeenCalledWith(url);
  });

  it("opens the landing GitHub token help URL with the system browser", async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);

    await openExternalUrl(GITHUB_TOKEN_HELP_URL, { openExternal });

    expect(openExternal).toHaveBeenCalledWith(GITHUB_TOKEN_HELP_URL);
  });

  it("rejects non-GitHub external URLs", async () => {
    await expect(
      openExternalUrl("https://example.com/settings", {
        openExternal: vi.fn()
      })
    ).rejects.toThrow("Only approved settings URLs can be opened.");
  });

  it("rejects other URLs on non-approved hosts", async () => {
    await expect(
      openExternalUrl("https://example.org/settings", {
        openExternal: vi.fn()
      })
    ).rejects.toThrow("Only approved settings URLs can be opened.");
  });

  it("opens the official site with the system browser", async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const url = "https://sk.magicfuture.app";

    await openExternalUrl(url, { openExternal });

    expect(openExternal).toHaveBeenCalledWith(url);
  });

  it("opens skills.sh catalog detail URLs with the system browser", async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const url = "https://skills.sh/skills/some-skill";

    await openExternalUrl(url, { openExternal });

    expect(openExternal).toHaveBeenCalledWith(url);
  });

  it("opens www.skills.sh catalog detail URLs with the system browser", async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const url = "https://www.skills.sh/skills/another-skill";

    await openExternalUrl(url, { openExternal });

    expect(openExternal).toHaveBeenCalledWith(url);
  });

  it("rejects http (non-https) skills.sh URLs", async () => {
    await expect(
      openExternalUrl("http://skills.sh/skills/x", {
        openExternal: vi.fn()
      })
    ).rejects.toThrow("Only approved settings URLs can be opened.");
  });

  it("rejects spoofed subdomain hosts such as skills.sh.evil.com", async () => {
    await expect(
      openExternalUrl("https://skills.sh.evil.com/skills/x", {
        openExternal: vi.fn()
      })
    ).rejects.toThrow("Only approved settings URLs can be opened.");
  });
});

describe("app settings", () => {
  it("keeps automatic distribution disabled by default", async () => {
    const db = createDbClient(":memory:");

    await expect(getAppSettings(db)).resolves.toMatchObject({
      distribution: {
        autoDistributeOnSync: false
      }
    });
  });

  it("updates automatic distribution settings", async () => {
    const db = createDbClient(":memory:");

    await updateDistributionSettings(db, { autoDistributeOnSync: true });

    await expect(getAppSettings(db)).resolves.toMatchObject({
      distribution: {
        autoDistributeOnSync: true
      }
    });
  });
});
