import { describe, expect, it } from "vitest";

import { createDbClient } from "../client";
import { providers, repositories, syncRuns } from "../schema";
import { createSyncHistoryRepository } from "./syncHistoryRepository";

describe("createSyncHistoryRepository", () => {
  it("lists source sync runs with repository details and normalized scan summaries", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-20T00:00:00.000Z");

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
      lastScannedCommitSha: "after-sha",
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "Team skills",
      providerId: "github",
      remoteUrl: "git@github.com:team/skills.git",
      updatedAt: createdAt
    });
    await db.insert(syncRuns).values([
      {
        endCommitSha: "after-sha",
        errorMessage: null,
        finishedAt: new Date("2026-06-20T01:01:00.000Z"),
        id: "sync-success",
        logPath: null,
        repositoryId: "repo-1",
        startCommitSha: "before-sha",
        startedAt: new Date("2026-06-20T01:00:00.000Z"),
        status: "success",
        summaryJson: JSON.stringify({ added: 2, changed: 1, removed: 0, warnings: 0 })
      },
      {
        endCommitSha: null,
        errorMessage: "没有权限访问这个 Git 来源。",
        finishedAt: new Date("2026-06-20T02:01:00.000Z"),
        id: "sync-failed",
        logPath: "/tmp/skills-manager-sync/repo-1.log",
        repositoryId: "repo-1",
        startCommitSha: "after-sha",
        startedAt: new Date("2026-06-20T02:00:00.000Z"),
        status: "failed",
        summaryJson: JSON.stringify({
          category: "auth",
          scan: { added: 0, changed: 0, removed: 0, warnings: 1 }
        })
      }
    ]);

    await expect(createSyncHistoryRepository(db).list()).resolves.toEqual([
      {
        endCommitSha: null,
        errorMessage: "没有权限访问这个 Git 来源。",
        finishedAt: "2026-06-20T02:01:00.000Z",
        id: "sync-failed",
        logPath: "/tmp/skills-manager-sync/repo-1.log",
        repositoryId: "repo-1",
        repositoryName: "Team skills",
        repositoryRemoteUrl: "git@github.com:team/skills.git",
        scan: { added: 0, changed: 0, removed: 0, warnings: 1 },
        startCommitSha: "after-sha",
        startedAt: "2026-06-20T02:00:00.000Z",
        status: "failed",
        summaryJson: JSON.stringify({
          category: "auth",
          scan: { added: 0, changed: 0, removed: 0, warnings: 1 }
        })
      },
      {
        endCommitSha: "after-sha",
        errorMessage: null,
        finishedAt: "2026-06-20T01:01:00.000Z",
        id: "sync-success",
        logPath: null,
        repositoryId: "repo-1",
        repositoryName: "Team skills",
        repositoryRemoteUrl: "git@github.com:team/skills.git",
        scan: { added: 2, changed: 1, removed: 0, warnings: 0 },
        startCommitSha: "before-sha",
        startedAt: "2026-06-20T01:00:00.000Z",
        status: "success",
        summaryJson: JSON.stringify({ added: 2, changed: 1, removed: 0, warnings: 0 })
      }
    ]);
  });

  it("counts sync history rows with repository details available", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-20T00:00:00.000Z");

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
      lastScannedCommitSha: "after-sha",
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "Team skills",
      providerId: "github",
      remoteUrl: "git@github.com:team/skills.git",
      updatedAt: createdAt
    });
    await db.insert(syncRuns).values(
      Array.from({ length: 3 }, (_, index) => ({
        endCommitSha: "after-sha",
        errorMessage: null,
        finishedAt: new Date(`2026-06-20T0${index + 1}:01:00.000Z`),
        id: `sync-${index}`,
        logPath: null,
        repositoryId: "repo-1",
        startCommitSha: "before-sha",
        startedAt: new Date(`2026-06-20T0${index + 1}:00:00.000Z`),
        status: "success",
        summaryJson: "{}"
      }))
    );

    await expect(createSyncHistoryRepository(db).count()).resolves.toBe(3);
  });
});
