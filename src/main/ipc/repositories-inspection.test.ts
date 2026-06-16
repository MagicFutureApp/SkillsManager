import { describe, expect, it, vi } from "vitest";

import { inspectRepositorySourceWithSettings } from "./repositories";

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

describe("inspectRepositorySourceWithSettings", () => {
  it("passes the saved GitHub token to source inspection", async () => {
    const inspectSource = vi.fn().mockResolvedValue({
      name: "anthropics/skills",
      provider: "GitHub"
    });

    await inspectRepositorySourceWithSettings({} as never, "https://github.com/anthropics/skills", {
      getGitHubToken: vi.fn().mockResolvedValue("github_pat_saved"),
      inspectSource
    });

    expect(inspectSource).toHaveBeenCalledWith(
      "https://github.com/anthropics/skills",
      expect.objectContaining({
        githubToken: "github_pat_saved"
      })
    );
  });
});
