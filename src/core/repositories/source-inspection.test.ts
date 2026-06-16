import { afterEach, describe, expect, it, vi } from "vitest";

import { inspectRepositorySource } from "./source-inspection";

describe("inspectRepositorySource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("uses a nested directory glob when one child skill is found under a container", async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ default_branch: "main", description: "One Vercel skill." })
      .mockResolvedValueOnce({ tree: [{ path: "skills/find-skills/SKILL.md", type: "blob" }] });

    await expect(
      inspectRepositorySource("https://github.com/vercel-labs/skills", { fetchJson })
    ).resolves.toMatchObject({
      name: "vercel-labs/skills",
      patterns: ["skills/*/SKILL.md"],
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

  it("keeps separate discovery entries when root-level and nested skill directories coexist", async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ default_branch: "main", description: "Anthropic skills." })
      .mockResolvedValueOnce({
        tree: [
          { path: "template/SKILL.md", type: "blob" },
          { path: "skills/pdf/SKILL.md", type: "blob" },
          { path: "skills/xlsx/SKILL.md", type: "blob" }
        ]
      });

    await expect(
      inspectRepositorySource("https://github.com/anthropics/skills", { fetchJson })
    ).resolves.toMatchObject({
      patterns: ["skills/*/SKILL.md", "template/SKILL.md"]
    });
  });

  it("falls back to URL-only metadata when remote inspection is unavailable", async () => {
    const fetchJson = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(
      inspectRepositorySource("https://gitlab.com/design/lab-skills.git", { fetchJson })
    ).resolves.toEqual({
      name: "design/lab-skills",
      provider: "GitLab"
    });
  });

  it("returns a network error and logs repository metadata inspection failures in development", async () => {
    const logger = { warn: vi.fn() };
    const fetchJson = vi.fn().mockRejectedValue(new Error("GitHub metadata unavailable"));

    await expect(
      inspectRepositorySource("https://github.com/anthropics/skills", {
        fetchJson,
        isDevelopment: true,
        logger
      })
    ).rejects.toThrow("网络连接中断，暂时无法解析这个 GitHub 来源。");
    expect(logger.warn).toHaveBeenCalledWith(
      "Failed to inspect GitHub repository metadata.",
      expect.objectContaining({
        error: expect.any(Error),
        remoteUrl: "https://github.com/anthropics/skills"
      })
    );
  });

  it("returns GitHub rate limit guidance when repository metadata inspection is rate-limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        headers: new Headers({
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1781481600"
        }),
        json: vi.fn().mockResolvedValue({ message: "API rate limit exceeded" }),
        ok: false,
        status: 403
      })
    );

    await expect(inspectRepositorySource("https://github.com/anthropics/skills")).rejects.toThrow(
      "GitHub API 访问频率已达上限，请在 2026-06-15T00:00:00.000Z 后重试。"
    );
  });

  it("returns GitHub permission guidance when repository metadata is inaccessible to the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        headers: new Headers({
          "x-accepted-github-permissions": "metadata=read"
        }),
        json: vi.fn().mockResolvedValue({ message: "Resource not accessible by integration" }),
        ok: false,
        status: 403
      })
    );

    await expect(inspectRepositorySource("https://github.com/anthropics/skills")).rejects.toThrow(
      "GitHub token 权限不足，需要 Metadata read 权限后才能解析这个来源。"
    );
  });

  it("returns a network error and logs tree inspection failures in development", async () => {
    const logger = { warn: vi.fn() };
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({
        default_branch: "main",
        description: "Composable Claude skills from Anthropic."
      })
      .mockRejectedValueOnce(new Error("GitHub API rate limit"));

    await expect(
      inspectRepositorySource("https://github.com/anthropics/skills", {
        fetchJson,
        isDevelopment: true,
        logger
      })
    ).rejects.toThrow("网络连接中断，暂时无法解析这个 GitHub 来源。");
    expect(logger.warn).toHaveBeenCalledWith(
      "Failed to inspect GitHub repository tree.",
      expect.objectContaining({
        error: expect.any(Error),
        remoteUrl: "https://github.com/anthropics/skills"
      })
    );
  });

  it("returns GitHub retry-after guidance when repository tree inspection is temporarily limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({
            default_branch: "main",
            description: "Composable Claude skills from Anthropic."
          }),
          ok: true,
          status: 200
        })
        .mockResolvedValueOnce({
          headers: new Headers({
            "retry-after": "60"
          }),
          json: vi.fn().mockResolvedValue({ message: "You have exceeded a secondary rate limit" }),
          ok: false,
          status: 403
        })
    );

    await expect(inspectRepositorySource("https://github.com/anthropics/skills")).rejects.toThrow(
      "GitHub API 暂时限流，请约 60 秒后重试。"
    );
  });

  it("sends a bearer token to both GitHub metadata and tree requests when configured", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          default_branch: "main",
          description: "Composable Claude skills from Anthropic."
        }),
        ok: true,
        status: 200
      })
      .mockResolvedValueOnce({
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          tree: [{ path: "skills/pdf/SKILL.md", type: "blob" }]
        }),
        ok: true,
        status: 200
      });
    vi.stubGlobal("fetch", fetchMock);

    await inspectRepositorySource("https://github.com/anthropics/skills", {
      githubToken: "github_pat_test"
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/anthropics/skills",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer github_pat_test"
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/anthropics/skills/git/trees/main?recursive=1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer github_pat_test"
        })
      })
    );
  });

  it("omits discovery entries when no skill entry can be parsed from a repository tree", async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ default_branch: "main", description: "No skills here." })
      .mockResolvedValueOnce({
        tree: [
          { path: "README.md", type: "blob" },
          { path: "docs/guide.md", type: "blob" }
        ]
      });

    await expect(
      inspectRepositorySource("https://github.com/example/no-skills", { fetchJson })
    ).resolves.toMatchObject({
      name: "example/no-skills",
      patterns: [],
      provider: "GitHub"
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
