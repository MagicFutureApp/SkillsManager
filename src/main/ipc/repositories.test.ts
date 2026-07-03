import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { createDbClient } from "../../db/client";
import {
  agentTargets,
  appSettings,
  installInstances,
  providers,
  repositories,
  skillTargetPreferences,
  skillUnits,
  skillVersions
} from "../../db/schema";
import {
  deleteRepository,
  inspectRepositorySourceWithSettings,
  syncRepositories
} from "./repositories";

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

describe("repository IPC handlers", () => {
  it("removes the local source cache before deleting source records", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-08T00:00:00.000Z");
    const removeLocalCache = vi.fn().mockResolvedValue(undefined);

    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "github",
      name: "GitHub",
      type: "github",
      updatedAt: createdAt
    });
    await db.insert(repositories).values({
      configJson: "{}",
      createdAt,
      defaultBranch: "main",
      id: "repo-1",
      lastScannedCommitSha: "abcdef123456",
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "team-skills",
      providerId: "github",
      remoteUrl: "git@github.com:team/skills.git",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values({
      createdAt,
      discoveryMethod: "convention",
      entryPath: "skills/review-bot/SKILL.md",
      id: "skill-1",
      name: "review-bot",
      repositoryId: "repo-1",
      rootPath: "skills/review-bot",
      status: "ready",
      updatedAt: createdAt
    });
    await db.insert(skillVersions).values({
      commitSha: "abcdef123456",
      createdAt,
      id: "version-1",
      metadataSnapshotJson: "{}",
      skillUnitId: "skill-1"
    });

    await deleteRepository(db, "repo-1", { removeLocalCache });

    expect(removeLocalCache).toHaveBeenCalledWith("~/.skills-manager/cache/team-skills");
  });

  it("infers local discovery entries from the selected project root", async () => {
    const db = createDbClient(":memory:");
    const projectPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-local-project-"));

    await mkdir(path.join(projectPath, ".agents", "skills", "kanji-helper"), { recursive: true });
    await writeFile(
      path.join(projectPath, ".agents", "skills", "kanji-helper", "SKILL.md"),
      "# Kanji Helper\n\nPractices kanji.\n",
      "utf8"
    );

    await expect(inspectRepositorySourceWithSettings(db, projectPath)).resolves.toEqual({
      name: path.basename(projectPath),
      patterns: [".agents/skills/*/SKILL.md"],
      provider: "Local"
    });
  });

  it("infers local discovery entries from the selected agent directory", async () => {
    const db = createDbClient(":memory:");
    const projectPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-local-agent-"));
    const agentPath = path.join(projectPath, ".agents");

    await mkdir(path.join(agentPath, "skills", "kanji-helper"), { recursive: true });
    await writeFile(
      path.join(agentPath, "skills", "kanji-helper", "SKILL.md"),
      "# Kanji Helper\n\nPractices kanji.\n",
      "utf8"
    );

    await expect(inspectRepositorySourceWithSettings(db, agentPath)).resolves.toEqual({
      name: ".agents",
      patterns: ["skills/*/SKILL.md"],
      provider: "Local"
    });
  });

  it("infers a wildcard discovery entry from a selected skills container", async () => {
    const db = createDbClient(":memory:");
    const projectPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-local-skills-"));
    const skillsPath = path.join(projectPath, ".agents", "skills");

    await mkdir(path.join(skillsPath, "kanji-helper"), { recursive: true });
    await writeFile(
      path.join(skillsPath, "kanji-helper", "SKILL.md"),
      "# Kanji Helper\n\nPractices kanji.\n",
      "utf8"
    );

    await expect(inspectRepositorySourceWithSettings(db, skillsPath)).resolves.toEqual({
      name: "skills",
      patterns: ["*/SKILL.md"],
      provider: "Local"
    });
  });

  it("copies a local source into the unified cache before scanning skills", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-14T00:00:00.000Z");
    const sourcePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-local-source-"));
    const cachePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-cache-"));
    const copyLocalSource = vi.fn().mockImplementation(async () => {
      await mkdir(path.join(cachePath, "skills", "review-bot"), { recursive: true });
      await writeFile(
        path.join(cachePath, "skills", "review-bot", "SKILL.md"),
        "# Review Bot\n\nReviews pull requests.\n",
        "utf8"
      );
    });

    await mkdir(path.join(sourcePath, "skills", "review-bot"), { recursive: true });
    await writeFile(
      path.join(sourcePath, "skills", "review-bot", "SKILL.md"),
      "# Review Bot\n\nReviews pull requests.\n",
      "utf8"
    );
    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "local-git",
      name: "Local Git",
      type: "local_git",
      updatedAt: createdAt
    });
    await db.insert(repositories).values({
      configJson: "{}",
      createdAt,
      defaultBranch: "main",
      id: "repo-local",
      lastScannedCommitSha: null,
      localCachePath: cachePath,
      name: "Local skills",
      providerId: "local-git",
      remoteUrl: sourcePath,
      updatedAt: createdAt
    });

    const result = await syncRepositories(db, ["repo-local"], {
      copyLocalSource,
      ensureGitRepository: vi.fn(),
      resolveCommitSha: vi.fn().mockResolvedValue("local")
    });

    expect(copyLocalSource).toHaveBeenCalledWith(sourcePath, cachePath);
    expect(result).toMatchObject({
      results: [
        {
          commitSha: "local",
          repositoryId: "repo-local",
          scan: { added: 1, changed: 0, removed: 0, warnings: 0 },
          skillUnits: 1,
          status: "ready"
        }
      ]
    });
    await expect(db.select().from(skillUnits)).resolves.toMatchObject([
      {
        entryPath: "skills/review-bot/SKILL.md",
        id: "repo-local__skills-review-bot",
        name: "Review Bot"
      }
    ]);
  });

  it("returns eligible distribution count when automatic distribution is disabled", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-07-02T00:00:00.000Z");
    const sourcePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-auto-off-source-"));
    const cachePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-auto-off-cache-"));
    const targetPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-auto-off-target-"));

    await seedSyncRepositoryWithPreference(db, {
      cachePath,
      createdAt,
      repositoryId: "repo-auto-off",
      sourcePath,
      targetPath
    });

    const copyLocalSource = vi.fn().mockImplementation(async () => {
      await mkdir(path.join(cachePath, "review-bot"), { recursive: true });
      await writeFile(
        path.join(cachePath, "review-bot", "SKILL.md"),
        "# Review Bot\n\nReviews pull requests.\n",
        "utf8"
      );
    });

    const result = await syncRepositories(db, ["repo-auto-off"], {
      copyLocalSource,
      ensureGitRepository: vi.fn(),
      resolveCommitSha: vi.fn().mockResolvedValue("after-sha")
    });

    expect(result.results[0]).toMatchObject({
      distribution: {
        autoDistributionEnabled: false,
        eligible: 1,
        installed: 0
      },
      repositoryId: "repo-auto-off",
      status: "ready"
    });
  });

  it("copies updated skills to selected targets when automatic distribution is enabled", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-07-02T00:00:00.000Z");
    const sourcePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-auto-on-source-"));
    const cachePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-auto-on-cache-"));
    const targetPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-auto-on-target-"));

    await seedSyncRepositoryWithPreference(db, {
      cachePath,
      createdAt,
      repositoryId: "repo-auto-on",
      sourcePath,
      targetPath
    });
    await db.insert(appSettings).values({
      key: "distribution",
      updatedAt: createdAt,
      valueJson: JSON.stringify({ autoDistributeOnSync: true })
    });

    const copyLocalSource = vi.fn().mockImplementation(async () => {
      await mkdir(path.join(cachePath, "review-bot"), { recursive: true });
      await writeFile(
        path.join(cachePath, "review-bot", "SKILL.md"),
        "# Review Bot\n\nUpdated.\n",
        "utf8"
      );
    });

    const result = await syncRepositories(db, ["repo-auto-on"], {
      copyLocalSource,
      ensureGitRepository: vi.fn(),
      resolveCommitSha: vi.fn().mockResolvedValue("after-sha")
    });

    await expect(readFile(path.join(targetPath, "review-bot", "SKILL.md"), "utf8")).resolves.toBe(
      "# Review Bot\n\nUpdated.\n"
    );
    expect(result.results[0]).toMatchObject({
      distribution: {
        autoDistributionEnabled: true,
        installed: 1
      },
      repositoryId: "repo-auto-on",
      status: "ready"
    });
    await expect(db.select().from(installInstances)).resolves.toMatchObject([
      {
        agentTargetId: "target-codex",
        installedCommitSha: "after-sha",
        skillUnitId: "repo-auto-on__review-bot",
        status: "installed"
      }
    ]);
  });

  it("scans the saved discovery entry pattern into multiple skills during sync", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-14T00:00:00.000Z");
    const sourcePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-pattern-source-"));
    const cachePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-pattern-cache-"));
    const copyLocalSource = vi.fn().mockImplementation(async () => {
      await mkdir(path.join(cachePath, "skills", "review-bot"), { recursive: true });
      await mkdir(path.join(cachePath, "skills", "release-notes"), { recursive: true });
      await mkdir(path.join(cachePath, "docs", "ignored"), { recursive: true });
      await writeFile(
        path.join(cachePath, "skills", "review-bot", "SKILL.md"),
        "# Review Bot\n\nReviews pull requests.\n",
        "utf8"
      );
      await writeFile(
        path.join(cachePath, "skills", "release-notes", "SKILL.md"),
        "# Release Notes\n\nWrites release notes.\n",
        "utf8"
      );
      await writeFile(
        path.join(cachePath, "docs", "ignored", "SKILL.md"),
        "# Ignored\n\nOutside the configured discovery entry.\n",
        "utf8"
      );
    });

    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "local-git",
      name: "Local Git",
      type: "local_git",
      updatedAt: createdAt
    });
    await db.insert(repositories).values({
      configJson: JSON.stringify({
        patterns: ["skills/*/SKILL.md"]
      }),
      createdAt,
      defaultBranch: "main",
      id: "repo-pattern",
      lastScannedCommitSha: null,
      localCachePath: cachePath,
      name: "Pattern skills",
      providerId: "local-git",
      remoteUrl: sourcePath,
      updatedAt: createdAt
    });

    const result = await syncRepositories(db, ["repo-pattern"], {
      copyLocalSource,
      ensureGitRepository: vi.fn(),
      resolveCommitSha: vi.fn().mockResolvedValue("local")
    });

    expect(result).toMatchObject({
      results: [
        {
          repositoryId: "repo-pattern",
          skillUnits: 2,
          status: "ready"
        }
      ]
    });
    await expect(db.select().from(skillUnits)).resolves.toMatchObject([
      {
        entryPath: "skills/release-notes/SKILL.md",
        id: "repo-pattern__skills-release-notes",
        name: "Release Notes"
      },
      {
        entryPath: "skills/review-bot/SKILL.md",
        id: "repo-pattern__skills-review-bot",
        name: "Review Bot"
      }
    ]);
  });

  it("copies only wildcard-level skill folders into the source cache during local sync", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-24T00:00:00.000Z");
    const sourcePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-wildcard-source-"));
    const cacheParentPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-wildcard-cache-"));
    const cachePath = path.join(cacheParentPath, "conardli-garden-skills");

    await mkdir(path.join(sourcePath, "skills", "news-reader", "assets"), { recursive: true });
    await mkdir(path.join(sourcePath, "skills", "writing-helper"), { recursive: true });
    await mkdir(path.join(sourcePath, "docs", "ignored"), { recursive: true });
    await writeFile(
      path.join(sourcePath, "skills", "news-reader", "SKILL.md"),
      "# News Reader\n\nReads news.\n",
      "utf8"
    );
    await writeFile(
      path.join(sourcePath, "skills", "news-reader", "assets", "prompt.md"),
      "Asset copied with the skill root.\n",
      "utf8"
    );
    await writeFile(
      path.join(sourcePath, "skills", "writing-helper", "SKILL.md"),
      "# Writing Helper\n\nWrites drafts.\n",
      "utf8"
    );
    await writeFile(
      path.join(sourcePath, "docs", "ignored", "SKILL.md"),
      "# Ignored\n\nOutside the configured discovery entry.\n",
      "utf8"
    );
    await writeFile(path.join(sourcePath, "README.md"), "# Source readme\n", "utf8");
    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "local-git",
      name: "Local Git",
      type: "local_git",
      updatedAt: createdAt
    });
    await db.insert(repositories).values({
      configJson: JSON.stringify({
        patterns: ["skills/*/SKILL.md"]
      }),
      createdAt,
      defaultBranch: "",
      id: "repo-wildcard-cache",
      lastScannedCommitSha: null,
      localCachePath: cachePath,
      name: "ConardLi/garden-skills",
      providerId: "local-git",
      remoteUrl: sourcePath,
      updatedAt: createdAt
    });

    const result = await syncRepositories(db, ["repo-wildcard-cache"]);

    expect(result).toMatchObject({
      results: [
        {
          repositoryId: "repo-wildcard-cache",
          skillUnits: 2,
          status: "ready"
        }
      ]
    });

    await expect(
      readFile(path.join(cachePath, "news-reader", "SKILL.md"), "utf8")
    ).resolves.toContain("News Reader");
    await expect(
      readFile(path.join(cachePath, "news-reader", "assets", "prompt.md"), "utf8")
    ).resolves.toContain("Asset copied with the skill root.");
    await expect(
      readFile(path.join(cachePath, "writing-helper", "SKILL.md"), "utf8")
    ).resolves.toContain("Writing Helper");
    await expect(pathExists(path.join(cachePath, "skills"))).resolves.toBe(false);
    await expect(pathExists(path.join(cachePath, "docs"))).resolves.toBe(false);
    await expect(pathExists(path.join(cachePath, "README.md"))).resolves.toBe(false);
    await expect(db.select().from(skillUnits).orderBy(skillUnits.entryPath)).resolves.toMatchObject(
      [
        {
          entryPath: "news-reader/SKILL.md",
          name: "News Reader",
          rootPath: "news-reader"
        },
        {
          entryPath: "writing-helper/SKILL.md",
          name: "Writing Helper",
          rootPath: "writing-helper"
        }
      ]
    );
  });

  it("copies a root SKILL.md source as one repository folder inside the source cache", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-24T00:00:00.000Z");
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-root-workspace-"));
    const sourcePath = path.join(workspacePath, "the-news");
    const cachePath = path.join(workspacePath, "sfkislev-the-news");

    await mkdir(path.join(sourcePath, "examples", "ignored"), { recursive: true });
    await writeFile(path.join(sourcePath, "SKILL.md"), "# The News\n\nSummarizes news.\n", "utf8");
    await writeFile(path.join(sourcePath, "README.md"), "# The News readme\n", "utf8");
    await writeFile(
      path.join(sourcePath, "examples", "ignored", "SKILL.md"),
      "# Ignored\n\nNot part of the configured root entry.\n",
      "utf8"
    );
    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "local-git",
      name: "Local Git",
      type: "local_git",
      updatedAt: createdAt
    });
    await db.insert(repositories).values({
      configJson: JSON.stringify({
        patterns: ["SKILL.md"]
      }),
      createdAt,
      defaultBranch: "",
      id: "repo-root-cache",
      lastScannedCommitSha: null,
      localCachePath: cachePath,
      name: "sfkislev/the-news",
      providerId: "local-git",
      remoteUrl: sourcePath,
      updatedAt: createdAt
    });

    const result = await syncRepositories(db, ["repo-root-cache"]);

    expect(result).toMatchObject({
      results: [
        {
          repositoryId: "repo-root-cache",
          skillUnits: 1,
          status: "ready"
        }
      ]
    });

    await expect(readFile(path.join(cachePath, "the-news", "SKILL.md"), "utf8")).resolves.toContain(
      "The News"
    );
    await expect(
      readFile(path.join(cachePath, "the-news", "README.md"), "utf8")
    ).resolves.toContain("The News readme");
    await expect(pathExists(path.join(cachePath, "SKILL.md"))).resolves.toBe(false);
    await expect(db.select().from(skillUnits)).resolves.toMatchObject([
      {
        entryPath: "the-news/SKILL.md",
        name: "The News",
        rootPath: "the-news"
      }
    ]);
  });

  it("keeps git worktree state outside the materialized source cache during remote sync", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-24T00:00:00.000Z");
    const cacheParentPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-remote-cache-"));
    const cachePath = path.join(cacheParentPath, "conardli-garden-skills");
    let materializedSourcePath = "";
    const ensureGitRepository = vi.fn(async (_remoteUrl: string, sourcePath: string) => {
      await mkdir(path.join(sourcePath, ".git"), { recursive: true });
      await mkdir(path.join(sourcePath, "skills", "browser"), { recursive: true });
      await writeFile(
        path.join(sourcePath, "skills", "browser", "SKILL.md"),
        "# Browser\n\nControls browser tasks.\n",
        "utf8"
      );
    });
    const materializeSourceCache = vi.fn(
      async ({
        cachePath,
        sourcePath
      }: {
        cachePath: string;
        discoveryEntries: string[];
        sourceFolderName: string;
        sourcePath: string;
      }) => {
        materializedSourcePath = sourcePath;
        await mkdir(path.join(cachePath, "browser"), { recursive: true });
        await writeFile(
          path.join(cachePath, "browser", "SKILL.md"),
          await readFile(path.join(sourcePath, "skills", "browser", "SKILL.md"), "utf8"),
          "utf8"
        );

        return { scanDiscoveryEntries: ["browser/SKILL.md"] };
      }
    );
    const resolveCommitSha = vi.fn().mockResolvedValue("abcdef123456");

    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "github",
      name: "GitHub",
      type: "github",
      updatedAt: createdAt
    });
    await db.insert(repositories).values({
      configJson: JSON.stringify({
        patterns: ["skills/*/SKILL.md"]
      }),
      createdAt,
      defaultBranch: "main",
      id: "repo-remote-cache",
      lastScannedCommitSha: null,
      localCachePath: cachePath,
      name: "ConardLi/garden-skills",
      providerId: "github",
      remoteUrl: "https://github.com/ConardLi/garden-skills",
      updatedAt: createdAt
    });

    const result = await syncRepositories(db, ["repo-remote-cache"], {
      copyLocalSource: vi.fn(),
      ensureGitRepository,
      materializeSourceCache,
      resolveCommitSha
    });

    expect(result).toMatchObject({
      results: [
        {
          commitSha: "abcdef123456",
          repositoryId: "repo-remote-cache",
          skillUnits: 1,
          status: "ready"
        }
      ]
    });
    expect(ensureGitRepository).toHaveBeenCalledWith(
      "https://github.com/ConardLi/garden-skills",
      path.join(cacheParentPath, ".source-repositories", "conardli-garden-skills"),
      "main"
    );
    expect(materializedSourcePath).toBe(
      path.join(cacheParentPath, ".source-repositories", "conardli-garden-skills")
    );
    expect(resolveCommitSha).toHaveBeenCalledWith(
      path.join(cacheParentPath, ".source-repositories", "conardli-garden-skills")
    );
    await expect(readFile(path.join(cachePath, "browser", "SKILL.md"), "utf8")).resolves.toContain(
      "Browser"
    );
    await expect(pathExists(path.join(cachePath, ".git"))).resolves.toBe(false);
  });

  it("persists a running sync run before file work and updates it after success", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-14T00:00:00.000Z");
    const sourcePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-source-running-"));
    const cachePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-cache-running-"));
    let runningStatusDuringCopy: string | null = null;
    const copyLocalSource = vi.fn().mockImplementation(async () => {
      const runningRows = await db.select().from(repositories);
      runningStatusDuringCopy = runningRows[0]?.lastSyncStatus ?? null;

      await mkdir(path.join(cachePath, "skills", "review-bot"), { recursive: true });
      await writeFile(
        path.join(cachePath, "skills", "review-bot", "SKILL.md"),
        "# Review Bot\n\nReviews pull requests.\n",
        "utf8"
      );
    });

    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "local-git",
      name: "Local Git",
      type: "local_git",
      updatedAt: createdAt
    });
    await db.insert(repositories).values({
      configJson: "{}",
      createdAt,
      defaultBranch: "main",
      id: "repo-running",
      lastScannedCommitSha: "before-sha",
      localCachePath: cachePath,
      name: "Running source",
      providerId: "local-git",
      remoteUrl: sourcePath,
      updatedAt: createdAt
    });

    await syncRepositories(db, ["repo-running"], {
      copyLocalSource,
      ensureGitRepository: vi.fn(),
      resolveCommitSha: vi.fn().mockResolvedValue("after-sha")
    });

    expect(runningStatusDuringCopy).toBe("running");
    await expect(db.select().from(repositories)).resolves.toMatchObject([
      {
        id: "repo-running",
        lastSyncEndCommitSha: "after-sha",
        lastSyncStartCommitSha: "before-sha",
        lastSyncStatus: "success"
      }
    ]);
  });

  it("returns a friendly network failure and logs the raw git error", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-14T00:00:00.000Z");
    const logDirectory = await mkdtemp(path.join(os.tmpdir(), "skills-manager-sync-logs-"));
    const rawGitError = [
      "Cloning into '/Users/yimity/.skills-manager/cache/alchaincyf-huashu-design'...",
      "error: RPC failed; curl 56 Recv failure: Connection reset by peer",
      "fatal: early EOF"
    ].join("\n");

    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "github",
      name: "GitHub",
      type: "github",
      updatedAt: createdAt
    });
    await db.insert(repositories).values({
      configJson: "{}",
      createdAt,
      defaultBranch: "main",
      id: "repo-github",
      lastScannedCommitSha: null,
      localCachePath: "~/.skills-manager/cache/alchaincyf-huashu-design",
      name: "huashu-design",
      providerId: "github",
      remoteUrl: "https://github.com/alchaincyf/huashu-design",
      updatedAt: createdAt
    });

    const result = await syncRepositories(db, ["repo-github"], {
      copyLocalSource: vi.fn(),
      ensureGitRepository: vi.fn().mockRejectedValue(new Error(rawGitError)),
      logDirectory,
      resolveCommitSha: vi.fn()
    });

    expect(result.results[0]).toMatchObject({
      error: {
        category: "network",
        message: "网络连接中断，暂时无法同步这个 Git 来源。请稍后重试，或检查代理/VPN 后再同步。"
      },
      repositoryId: "repo-github",
      scan: { added: 0, changed: 0, removed: 0, warnings: 1 },
      skillUnits: 0,
      status: "failed"
    });
    const logPath = result.results[0]?.error?.logPath;
    expect(logPath).toContain(logDirectory);
    await expect(readFile(logPath ?? "", "utf8")).resolves.toContain(rawGitError);
    await expect(db.select().from(repositories)).resolves.toMatchObject([
      {
        id: "repo-github",
        lastSyncErrorMessage:
          "网络连接中断，暂时无法同步这个 Git 来源。请稍后重试，或检查代理/VPN 后再同步。",
        lastSyncLogPath: logPath,
        lastSyncStatus: "failed"
      }
    ]);
  });

  it("returns a friendly non-skill failure when no SKILL.md files are discovered", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-14T00:00:00.000Z");
    const cachePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-empty-cache-"));
    const logDirectory = await mkdtemp(path.join(os.tmpdir(), "skills-manager-sync-logs-"));

    await writeFile(path.join(cachePath, "README.md"), "# Not a skill source\n", "utf8");
    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "local-git",
      name: "Local Git",
      type: "local_git",
      updatedAt: createdAt
    });
    await db.insert(repositories).values({
      configJson: "{}",
      createdAt,
      defaultBranch: "main",
      id: "repo-empty",
      lastScannedCommitSha: null,
      localCachePath: cachePath,
      name: "Empty source",
      providerId: "local-git",
      remoteUrl: cachePath,
      updatedAt: createdAt
    });

    const result = await syncRepositories(db, ["repo-empty"], {
      copyLocalSource: vi.fn(),
      ensureGitRepository: vi.fn(),
      logDirectory,
      resolveCommitSha: vi.fn().mockResolvedValue("local")
    });

    expect(result.results[0]).toMatchObject({
      error: {
        category: "not-a-skill",
        message: "没有找到可识别的 Skills。请确认来源目录里包含 SKILL.md。"
      },
      repositoryId: "repo-empty",
      status: "failed"
    });
    const logPath = result.results[0]?.error?.logPath;
    await expect(readFile(logPath ?? "", "utf8")).resolves.toContain("No SKILL.md files found");
  });

  it("skips repository ids that are already syncing in another request", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-14T00:00:00.000Z");
    const firstSourcePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-source-one-"));
    const secondSourcePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-source-two-"));
    const firstCachePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-cache-one-"));
    const secondCachePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-cache-two-"));
    let resolveFirstCopy: () => void = () => undefined;
    let notifyFirstCopyStarted: () => void = () => undefined;
    const firstCopyStartedSignal = new Promise<void>((resolve) => {
      notifyFirstCopyStarted = resolve;
    });
    const copyLocalSource = vi.fn(async (sourcePath: string, cachePath: string) => {
      if (sourcePath === firstSourcePath) {
        notifyFirstCopyStarted();
        await new Promise<void>((copyResolve) => {
          resolveFirstCopy = copyResolve;
        });
      }

      await mkdir(path.join(cachePath, "skills", "review-bot"), { recursive: true });
      await writeFile(
        path.join(cachePath, "skills", "review-bot", "SKILL.md"),
        "# Review Bot\n\nReviews pull requests.\n",
        "utf8"
      );
    });

    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "local-git",
      name: "Local Git",
      type: "local_git",
      updatedAt: createdAt
    });
    await db.insert(repositories).values([
      {
        configJson: "{}",
        createdAt,
        defaultBranch: "main",
        id: "repo-one",
        lastScannedCommitSha: null,
        localCachePath: firstCachePath,
        name: "Source one",
        providerId: "local-git",
        remoteUrl: firstSourcePath,
        updatedAt: createdAt
      },
      {
        configJson: "{}",
        createdAt,
        defaultBranch: "main",
        id: "repo-two",
        lastScannedCommitSha: null,
        localCachePath: secondCachePath,
        name: "Source two",
        providerId: "local-git",
        remoteUrl: secondSourcePath,
        updatedAt: createdAt
      }
    ]);

    const firstSync = syncRepositories(db, ["repo-one"], {
      copyLocalSource,
      ensureGitRepository: vi.fn(),
      resolveCommitSha: vi.fn().mockResolvedValue("local")
    });

    await firstCopyStartedSignal;
    const secondSync = await syncRepositories(db, ["repo-one", "repo-two"], {
      copyLocalSource,
      ensureGitRepository: vi.fn(),
      resolveCommitSha: vi.fn().mockResolvedValue("local")
    });

    expect(secondSync.results).toMatchObject([
      {
        repositoryId: "repo-one",
        status: "skipped"
      },
      {
        repositoryId: "repo-two",
        status: "ready"
      }
    ]);
    expect(copyLocalSource).toHaveBeenCalledTimes(2);

    resolveFirstCopy();
    await expect(firstSync).resolves.toMatchObject({
      results: [{ repositoryId: "repo-one", status: "ready" }]
    });
  });
});

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const seedSyncRepositoryWithPreference = async (
  db: ReturnType<typeof createDbClient>,
  {
    cachePath,
    createdAt,
    repositoryId,
    sourcePath,
    targetPath
  }: {
    cachePath: string;
    createdAt: Date;
    repositoryId: string;
    sourcePath: string;
    targetPath: string;
  }
): Promise<void> => {
  await db.insert(providers).values({
    configJson: "{}",
    createdAt,
    id: "local-git",
    name: "Local Git",
    type: "local_git",
    updatedAt: createdAt
  });
  await db.insert(repositories).values({
    configJson: JSON.stringify({ patterns: ["*/SKILL.md"] }),
    createdAt,
    defaultBranch: "",
    id: repositoryId,
    lastScannedCommitSha: "before-sha",
    localCachePath: cachePath,
    name: "Local skills",
    providerId: "local-git",
    remoteUrl: sourcePath,
    updatedAt: createdAt
  });
  await db.insert(skillUnits).values({
    createdAt,
    discoveryMethod: "convention",
    entryPath: "review-bot/SKILL.md",
    id: `${repositoryId}__review-bot`,
    name: "Review Bot",
    repositoryId,
    rootPath: "review-bot",
    status: "ready",
    updatedAt: createdAt
  });
  await db.insert(skillVersions).values({
    commitSha: "before-sha",
    createdAt,
    id: `${repositoryId}__review-bot__before-sha`,
    metadataSnapshotJson: JSON.stringify({ skillKey: "review-bot", tags: [] }),
    skillUnitId: `${repositoryId}__review-bot`
  });
  await db.insert(agentTargets).values({
    createdAt,
    enabled: true,
    id: "target-codex",
    name: "Codex",
    normalizedPath: targetPath,
    path: targetPath,
    type: "codex",
    updatedAt: createdAt
  });
  await db.insert(skillTargetPreferences).values({
    agentTargetId: "target-codex",
    createdAt,
    enabled: true,
    id: `preference-${repositoryId}`,
    skillUnitId: `${repositoryId}__review-bot`,
    updatedAt: createdAt
  });
};
