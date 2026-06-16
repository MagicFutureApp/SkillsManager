import { mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { createDbClient } from "../../db/client";
import { providers, repositories, skillUnits, skillVersions, syncRuns } from "../../db/schema";
import { deleteRepository, syncRepositories } from "./repositories";

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
    expect(result).toEqual({
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

  it("persists a running sync run before file work and updates it after success", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-14T00:00:00.000Z");
    const sourcePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-source-running-"));
    const cachePath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-cache-running-"));
    let syncRunIdDuringCopy: string | null = null;
    const copyLocalSource = vi.fn().mockImplementation(async () => {
      const runningRows = await db.select().from(syncRuns);
      syncRunIdDuringCopy = runningRows[0]?.id ?? null;

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

    expect(syncRunIdDuringCopy).toBeTruthy();
    await expect(db.select().from(syncRuns)).resolves.toMatchObject([
      {
        endCommitSha: "after-sha",
        id: syncRunIdDuringCopy,
        repositoryId: "repo-running",
        startCommitSha: "before-sha",
        status: "success"
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
    await expect(db.select().from(syncRuns)).resolves.toMatchObject([
      {
        errorMessage:
          "网络连接中断，暂时无法同步这个 Git 来源。请稍后重试，或检查代理/VPN 后再同步。",
        logPath,
        repositoryId: "repo-github",
        status: "failed"
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
