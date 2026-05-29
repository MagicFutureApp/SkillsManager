import { describe, expect, it, vi } from "vitest";

import { inspectRepositorySource } from "./source-inspection";

describe("inspectRepositorySource", () => {
  it("infers provider, name, about, branch, and nested skill entries for GitHub repositories", async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({
        default_branch: "main",
        description: "Composable Claude skills from Anthropic."
      })
      .mockResolvedValueOnce({
        tree: [
          { path: "README.md", type: "blob" },
          { path: "skills/pdf/SKILL.md", type: "blob" },
          { path: "skills/xlsx/SKILL.md", type: "blob" },
          { path: "skills/xlsx/assets/icon.png", type: "blob" }
        ]
      });

    const result = await inspectRepositorySource("https://github.com/anthropics/skills", {
      fetchJson
    });

    expect(result).toEqual({
      about: "Composable Claude skills from Anthropic.",
      branch: "main",
      name: "anthropics/skills",
      patterns: ["skills/*/SKILL.md"],
      provider: "GitHub"
    });
    expect(fetchJson).toHaveBeenNthCalledWith(1, "https://api.github.com/repos/anthropics/skills");
    expect(fetchJson).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/anthropics/skills/git/trees/main?recursive=1"
    );
  });

  it("returns root discovery for a single root skill", async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ default_branch: "main", description: "Read the news locally." })
      .mockResolvedValueOnce({ tree: [{ path: "SKILL.md", type: "blob" }] });

    await expect(
      inspectRepositorySource("git@github.com:sfkislev/the-news.git", { fetchJson })
    ).resolves.toMatchObject({
      about: "Read the news locally.",
      name: "sfkislev/the-news",
      patterns: ["SKILL.md"],
      provider: "GitHub"
    });
  });

  it("keeps an exact nested entry when one child skill is found", async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ default_branch: "main", description: "One Vercel skill." })
      .mockResolvedValueOnce({ tree: [{ path: "skills/vercel/SKILL.md", type: "blob" }] });

    await expect(
      inspectRepositorySource("https://github.com/vercel-labs/skills", { fetchJson })
    ).resolves.toMatchObject({
      name: "vercel-labs/skills",
      patterns: ["skills/vercel/SKILL.md"],
      provider: "GitHub"
    });
  });

  it("uses a root directory glob when multiple top-level skill directories are found", async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ default_branch: "main", description: "Many root skills." })
      .mockResolvedValueOnce({
        tree: [
          { path: "analyst/SKILL.md", type: "blob" },
          { path: "writer/SKILL.md", type: "blob" }
        ]
      });

    await expect(
      inspectRepositorySource("https://github.com/example/root-skills", { fetchJson })
    ).resolves.toMatchObject({
      patterns: ["*/SKILL.md"]
    });
  });

  it("falls back to URL-only metadata when remote inspection is unavailable", async () => {
    const fetchJson = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(
      inspectRepositorySource("https://gitlab.com/design/lab-skills.git", { fetchJson })
    ).resolves.toEqual({
      name: "design/lab-skills",
      patterns: ["skills/*/SKILL.md"],
      provider: "GitLab"
    });
  });

  it("accepts markdown links and host-only GitHub URLs", async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValue({ default_branch: "main", description: "Markdown pasted repo." });

    await expect(
      inspectRepositorySource("[anthropics/skills](https://github.com/anthropics/skills)", {
        fetchJson
      })
    ).resolves.toMatchObject({
      name: "anthropics/skills",
      provider: "GitHub"
    });

    await expect(
      inspectRepositorySource("github.com/vercel-labs/skills", { fetchJson })
    ).resolves.toMatchObject({
      name: "vercel-labs/skills",
      provider: "GitHub"
    });
  });
});
