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

  it("rejects other URLs on the landing host", async () => {
    await expect(
      openExternalUrl("https://sk.magicfuture.app/settings", {
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
