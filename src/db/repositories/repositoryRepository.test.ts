import { describe, expect, it } from "vitest";

import type { CreateRepositoryInput } from "../../core/repositories/repository-api";
import { createDbClient } from "../client";
import {
  distributionPlanItems,
  installInstances,
  providers,
  repositories,
  skillTargetPreferences,
  skillUnits,
  skillVersions,
  syncRuns
} from "../schema";
import { createRepositoryRepository } from "./repositoryRepository";

describe("createRepositoryRepository", () => {
  it("returns real repository rows from SQLite with derived display metadata", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-08T00:00:00.000Z");

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
      id: "repo-1",
      lastScannedCommitSha: "abcdef123456",
      localCachePath: "D:/Users/andrewliang/.skills-manager/cache/skills-manager",
      name: "skills-manager",
      providerId: "local-git",
      remoteUrl: "D:/code/skills-manager",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values([
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/one/SKILL.md",
        id: "skill-1",
        name: "one",
        repositoryId: "repo-1",
        rootPath: "skills/one",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/two/SKILL.md",
        id: "skill-2",
        name: "two",
        repositoryId: "repo-1",
        rootPath: "skills/two",
        status: "ready",
        updatedAt: createdAt
      }
    ]);

    const result = await createRepositoryRepository(db).list();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      branch: "main",
      id: "repo-1",
      lastScannedCommitSha: "abcdef123456",
      localCachePath: "D:/Users/andrewliang/.skills-manager/cache/skills-manager",
      name: "skills-manager",
      providerId: "local-git",
      remoteUrl: "D:/code/skills-manager",
      updatedAt: "2026-06-08T00:00:00.000Z"
    });
    expect(JSON.parse(result[0]?.configJson ?? "{}")).toMatchObject({
      enabled: true,
      patterns: ["skills/*/SKILL.md"],
      providerName: "Local Git",
      skillUnits: 2,
      status: "ready"
    });
  });

  it("returns an empty array when the repositories table is empty", async () => {
    const db = createDbClient(":memory:");

    await expect(createRepositoryRepository(db).list()).resolves.toEqual([]);
  });

  it("creates a source row and reads the saved form values back from SQLite", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);
    const input: CreateRepositoryInput = {
      branch: "main",
      name: "huashu-design",
      note: "GitHub 测试源",
      patterns: ["skills/*/SKILL.md", "SKILL.md"],
      provider: "GitHub",
      remoteUrl: "https://github.com/alchaincyf/huashu-design"
    };

    const created = await repositoryRepository.create(input);
    const result = await repositoryRepository.list();

    expect(created).toMatchObject({
      branch: "main",
      name: "huashu-design",
      providerId: "github",
      remoteUrl: "https://github.com/alchaincyf/huashu-design"
    });
    expect(created.id).toMatch(/^repo-/);
    expect(created.localCachePath).toBe("~/.skills-manager/cache/huashu-design");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      branch: "main",
      id: created.id,
      lastScannedCommitSha: null,
      localCachePath: "~/.skills-manager/cache/huashu-design",
      name: "huashu-design",
      providerId: "github",
      remoteUrl: "https://github.com/alchaincyf/huashu-design"
    });
    expect(JSON.parse(result[0]?.configJson ?? "{}")).toMatchObject({
      enabled: true,
      note: "GitHub 测试源",
      patterns: ["skills/*/SKILL.md", "SKILL.md"],
      providerName: "GitHub",
      skillUnits: 0,
      status: "review"
    });
  });

  it("previews and deletes a source with its indexed skill records", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);
    const createdAt = new Date("2026-06-08T00:00:00.000Z");

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
    await db.insert(skillUnits).values([
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/review-bot/SKILL.md",
        id: "skill-1",
        name: "review-bot",
        repositoryId: "repo-1",
        rootPath: "skills/review-bot",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/release-notes/SKILL.md",
        id: "skill-2",
        name: "release-notes",
        repositoryId: "repo-1",
        rootPath: "skills/release-notes",
        status: "ready",
        updatedAt: createdAt
      }
    ]);
    await db.insert(skillVersions).values([
      {
        commitSha: "abcdef123456",
        createdAt,
        id: "version-1",
        metadataSnapshotJson: "{}",
        skillUnitId: "skill-1"
      },
      {
        commitSha: "abcdef123456",
        createdAt,
        id: "version-2",
        metadataSnapshotJson: "{}",
        skillUnitId: "skill-2"
      }
    ]);
    await db.insert(skillTargetPreferences).values({
      agentTargetId: "target-1",
      createdAt,
      desiredCommitSha: null,
      desiredVersionMode: "latest",
      enabled: true,
      id: "preference-1",
      skillUnitId: "skill-1",
      updatedAt: createdAt
    });
    await db.insert(installInstances).values({
      agentTargetId: "target-1",
      id: "install-1",
      installStrategy: "copy",
      installedAt: createdAt,
      installedCommitSha: "abcdef123456",
      installedPath: "/Users/test/.codex/skills/review-bot",
      skillVersionId: "version-1",
      status: "installed",
      targetSnapshotJson: "{}",
      updatedAt: createdAt
    });
    await db.insert(distributionPlanItems).values({
      action: "install",
      agentTargetId: "target-1",
      createdAt,
      distributionPlanId: "plan-1",
      errorMessage: null,
      id: "plan-item-1",
      installStrategy: "copy",
      reason: null,
      resultJson: "{}",
      skillVersionId: "version-1",
      sourcePath: "~/.skills-manager/cache/team-skills/skills/review-bot",
      status: "executed",
      targetPath: "/Users/test/.codex/skills/review-bot",
      updatedAt: createdAt
    });
    await db.insert(syncRuns).values({
      endCommitSha: "abcdef123456",
      errorMessage: null,
      finishedAt: createdAt,
      id: "sync-1",
      logPath: null,
      repositoryId: "repo-1",
      startCommitSha: null,
      startedAt: createdAt,
      status: "success",
      summaryJson: "{}"
    });

    const preview = await repositoryRepository.getDeletePreview("repo-1");
    const deleted = await repositoryRepository.delete("repo-1");

    expect(preview).toEqual({
      localCachePath: "~/.skills-manager/cache/team-skills",
      repositoryId: "repo-1",
      repositoryName: "team-skills",
      skills: [
        { entryPath: "skills/release-notes/SKILL.md", id: "skill-2", name: "release-notes" },
        { entryPath: "skills/review-bot/SKILL.md", id: "skill-1", name: "review-bot" }
      ]
    });
    expect(deleted).toEqual({
      deletedRepositoryId: "repo-1",
      deletedSkillUnitIds: expect.arrayContaining(["skill-1", "skill-2"]),
      localCachePath: "~/.skills-manager/cache/team-skills"
    });
    expect(deleted.deletedSkillUnitIds).toHaveLength(2);
    await expect(db.select().from(repositories)).resolves.toEqual([]);
    await expect(db.select().from(skillUnits)).resolves.toEqual([]);
    await expect(db.select().from(skillVersions)).resolves.toEqual([]);
    await expect(db.select().from(skillTargetPreferences)).resolves.toEqual([]);
    await expect(db.select().from(installInstances)).resolves.toEqual([]);
    await expect(db.select().from(distributionPlanItems)).resolves.toEqual([]);
    await expect(db.select().from(syncRuns)).resolves.toEqual([]);
  });
});
