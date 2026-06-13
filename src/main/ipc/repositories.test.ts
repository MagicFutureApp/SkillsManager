import { describe, expect, it, vi } from "vitest";

import { createDbClient } from "../../db/client";
import { providers, repositories, skillUnits, skillVersions } from "../../db/schema";
import { deleteRepository } from "./repositories";

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
});
