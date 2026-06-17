import { describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { inspectRepositorySourceWithSettings, selectLocalRepositoryPath } from "./repositories";

vi.mock("electron", () => ({
  dialog: {
    showOpenDialog: vi.fn()
  },
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

  it("inspects local source paths with the local directory scanner", async () => {
    const inspectSource = vi.fn();
    const inspectLocalSource = vi.fn().mockResolvedValue({
      branch: "main",
      name: "local-skills",
      patterns: ["skills/*/SKILL.md"],
      provider: "Local Git"
    });

    await expect(
      inspectRepositorySourceWithSettings({} as never, "D:\\workspace\\local-skills", {
        getGitHubToken: vi.fn().mockResolvedValue("github_pat_saved"),
        inspectLocalSource,
        inspectSource
      })
    ).resolves.toEqual({
      branch: "main",
      name: "local-skills",
      patterns: ["skills/*/SKILL.md"],
      provider: "Local Git"
    });

    expect(inspectLocalSource).toHaveBeenCalledWith("D:\\workspace\\local-skills");
    expect(inspectSource).not.toHaveBeenCalled();
  });

  it("derives local source metadata from a selected directory", async () => {
    const sourcePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-source-inspection-"));

    await mkdir(path.join(sourcePath, "skills", "review-bot"), { recursive: true });
    await writeFile(
      path.join(sourcePath, "skills", "review-bot", "SKILL.md"),
      [
        "---",
        "name: review-bot",
        "description: Review pull requests.",
        "---",
        "",
        "# Review Bot"
      ].join("\n"),
      "utf8"
    );

    await expect(
      inspectRepositorySourceWithSettings({} as never, sourcePath)
    ).resolves.toMatchObject({
      branch: "main",
      name: path.basename(sourcePath),
      patterns: ["skills/*/SKILL.md"],
      provider: "Local Git"
    });
  });
});

describe("selectLocalRepositoryPath", () => {
  it("returns the selected directory path", async () => {
    const showOpenDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: ["D:\\workspace\\local-skills"]
    });

    await expect(selectLocalRepositoryPath({ showOpenDialog })).resolves.toBe(
      "D:\\workspace\\local-skills"
    );
    expect(showOpenDialog).toHaveBeenCalledWith({
      properties: ["openDirectory"]
    });
  });

  it("returns null when directory selection is canceled", async () => {
    const showOpenDialog = vi.fn().mockResolvedValue({
      canceled: true,
      filePaths: []
    });

    await expect(selectLocalRepositoryPath({ showOpenDialog })).resolves.toBeNull();
  });
});
