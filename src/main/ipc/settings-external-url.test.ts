import { describe, expect, it, vi } from "vitest";

import { openExternalUrl } from "./settings";

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
