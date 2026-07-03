import { describe, expect, it, vi } from "vitest";

import { getAppSettings, openExternalUrl, updateDistributionSettings } from "./settings";
import { createDbClient } from "../../db/client";

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

  it("rejects non-GitHub external URLs", async () => {
    await expect(
      openExternalUrl("https://example.com/settings", {
        openExternal: vi.fn()
      })
    ).rejects.toThrow("Only GitHub URLs can be opened from settings.");
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
