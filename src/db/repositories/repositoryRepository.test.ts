import { describe, expect, it } from "vitest";

import type { CreateRepositoryInput } from "../../core/repositories/repository-api";
import type { DiscoveredSkill } from "../../core/skills/skill-scanner";
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
      providerName: "Local",
      skillUnits: 2,
      status: "ready"
    });
  });

  it("returns an empty array when the repositories table is empty", async () => {
    const db = createDbClient(":memory:");

    await expect(createRepositoryRepository(db).list()).resolves.toEqual([]);
  });

  it("returns the latest sync run separately from repository scan status", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);
    const createdAt = new Date("2026-06-08T00:00:00.000Z");
    const firstSyncAt = new Date("2026-06-08T01:00:00.000Z");
    const latestSyncAt = new Date("2026-06-08T02:00:00.000Z");

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
        enabled: true,
        lastScanLabel: "刚刚同步",
        note: "Team source",
        patterns: ["skills/*/SKILL.md"],
        priority: 1,
        providerName: "GitHub",
        scan: { added: 1, changed: 0, removed: 0, warnings: 0 },
        skillUnits: 1,
        status: "ready"
      }),
      createdAt,
      defaultBranch: "main",
      id: "repo-1",
      lastScannedCommitSha: "success-sha",
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "Team skills",
      providerId: "github",
      remoteUrl: "git@github.com:team/skills.git",
      updatedAt: createdAt
    });
    await db.insert(syncRuns).values([
      {
        endCommitSha: "success-sha",
        errorMessage: null,
        finishedAt: firstSyncAt,
        id: "sync-success",
        logPath: null,
        repositoryId: "repo-1",
        startCommitSha: null,
        startedAt: firstSyncAt,
        status: "success",
        summaryJson: JSON.stringify({ added: 1, changed: 0, removed: 0, warnings: 0 })
      },
      {
        endCommitSha: null,
        errorMessage: "没有权限访问这个 Git 来源。",
        finishedAt: latestSyncAt,
        id: "sync-failed",
        logPath: "/tmp/sync.log",
        repositoryId: "repo-1",
        startCommitSha: "success-sha",
        startedAt: latestSyncAt,
        status: "failed",
        summaryJson: JSON.stringify({
          category: "auth",
          scan: { added: 0, changed: 0, removed: 0, warnings: 1 }
        })
      }
    ]);

    const result = await repositoryRepository.list();

    expect(result[0]).toMatchObject({
      id: "repo-1",
      lastSync: {
        errorMessage: "没有权限访问这个 Git 来源。",
        finishedAt: "2026-06-08T02:00:00.000Z",
        status: "failed"
      }
    });
    expect(JSON.parse(result[0]?.configJson ?? "{}")).toMatchObject({
      status: "ready"
    });
  });

  it("uses the latest persisted sync summary for repository scan impact", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);
    const createdAt = new Date("2026-06-08T00:00:00.000Z");
    const latestSyncAt = new Date("2026-06-08T02:00:00.000Z");

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
        enabled: true,
        note: "Team source",
        patterns: ["skills/*/SKILL.md"],
        priority: 1,
        providerName: "GitHub",
        scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
        skillUnits: 3,
        status: "ready"
      }),
      createdAt,
      defaultBranch: "main",
      id: "repo-1",
      lastScannedCommitSha: "success-sha",
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "Team skills",
      providerId: "github",
      remoteUrl: "git@github.com:team/skills.git",
      updatedAt: createdAt
    });
    await db.insert(syncRuns).values({
      endCommitSha: "success-sha",
      errorMessage: null,
      finishedAt: latestSyncAt,
      id: "sync-success",
      logPath: null,
      repositoryId: "repo-1",
      startCommitSha: "previous-sha",
      startedAt: latestSyncAt,
      status: "success",
      summaryJson: JSON.stringify({ added: 2, changed: 0, removed: 1, warnings: 0 })
    });

    const result = await repositoryRepository.list();

    expect(JSON.parse(result[0]?.configJson ?? "{}")).toMatchObject({
      scan: { added: 2, changed: 0, removed: 1, warnings: 0 }
    });
  });

  it("creates a source row and reads the saved form values back from SQLite", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);
    const input: CreateRepositoryInput = {
      branch: "main",
      name: "huashu-design",
      note: "GitHub 测试源",
      patterns: "skills/*/SKILL.md",
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
      patterns: ["skills/*/SKILL.md"],
      providerName: "GitHub",
      skillUnits: 0,
      status: "review"
    });
  });

  it("updates an existing source row and preserves sync metadata", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);
    const createdAt = new Date("2026-06-08T00:00:00.000Z");

    await db.insert(providers).values([
      {
        configJson: "{}",
        createdAt,
        id: "github",
        name: "GitHub",
        type: "github",
        updatedAt: createdAt
      },
      {
        configJson: "{}",
        createdAt,
        id: "gitlab",
        name: "GitLab",
        type: "gitlab",
        updatedAt: createdAt
      }
    ]);
    await db.insert(repositories).values({
      configJson: JSON.stringify({
        enabled: false,
        lastScanLabel: "刚刚同步",
        note: "Team source",
        patterns: ["skills/*/SKILL.md"],
        priority: 4,
        providerName: "GitHub",
        scan: { added: 2, changed: 1, removed: 0, warnings: 0 },
        skillUnits: 3,
        status: "ready"
      }),
      createdAt,
      defaultBranch: "main",
      id: "repo-1",
      lastScannedCommitSha: "abcdef123456",
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "Team skills",
      providerId: "github",
      remoteUrl: "git@github.com:team/skills.git",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values([
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/one/SKILL.md",
        id: "repo-1__one",
        name: "One",
        repositoryId: "repo-1",
        rootPath: "skills/one",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/two/SKILL.md",
        id: "repo-1__two",
        name: "Two",
        repositoryId: "repo-1",
        rootPath: "skills/two",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/three/SKILL.md",
        id: "repo-1__three",
        name: "Three",
        repositoryId: "repo-1",
        rootPath: "skills/three",
        status: "ready",
        updatedAt: createdAt
      }
    ]);

    await repositoryRepository.update("repo-1", {
      branch: "",
      name: "Design lab",
      note: "迁移到 GitLab 后继续手动同步。",
      patterns: "skills/*/SKILL.md, template/SKILL.md",
      provider: "GitLab",
      remoteUrl: "git@gitlab.com:design/lab-skills.git"
    });

    const result = await repositoryRepository.list();

    expect(result[0]).toMatchObject({
      branch: "",
      id: "repo-1",
      lastScannedCommitSha: "abcdef123456",
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "Design lab",
      providerId: "gitlab",
      remoteUrl: "git@gitlab.com:design/lab-skills.git"
    });
    expect(JSON.parse(result[0]?.configJson ?? "{}")).toMatchObject({
      enabled: false,
      lastScanLabel: "刚刚同步",
      note: "迁移到 GitLab 后继续手动同步。",
      patterns: ["skills/*/SKILL.md", "template/SKILL.md"],
      priority: 4,
      providerName: "GitLab",
      scan: { added: 2, changed: 1, removed: 0, warnings: 0 },
      skillUnits: 3,
      status: "ready"
    });
  });

  it("keeps branch empty when creating a local source", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);

    const created = await repositoryRepository.create({
      branch: "",
      name: "local-skills",
      note: "",
      patterns: "skills/*/SKILL.md",
      provider: "Local",
      remoteUrl: "D:/workspace/local-skills"
    });
    const result = await repositoryRepository.list();

    expect(created.branch).toBe("");
    expect(result[0]).toMatchObject({
      branch: ""
    });
    expect(JSON.parse(result[0]?.configJson ?? "{}")).toMatchObject({
      note: ""
    });
  });

  it("splits multiple discovery entries from the saved form value", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);

    await repositoryRepository.create({
      branch: "main",
      name: "anthropics-skills",
      note: "",
      patterns: "*/SKILL.md, skills/*/SKILL.md",
      provider: "GitHub",
      remoteUrl: "https://github.com/anthropics/skills"
    });

    const result = await repositoryRepository.list();

    expect(JSON.parse(result[0]?.configJson ?? "{}")).toMatchObject({
      patterns: ["*/SKILL.md", "skills/*/SKILL.md"]
    });
  });

  it("keeps discovery entries empty when the create input is empty", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);

    await repositoryRepository.create({
      branch: "main",
      name: "no-skills",
      note: "",
      patterns: "",
      provider: "GitHub",
      remoteUrl: "https://github.com/example/no-skills"
    });

    const result = await repositoryRepository.list();

    expect(JSON.parse(result[0]?.configJson ?? "{}")).toMatchObject({
      patterns: []
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

  it("persists sync results as indexed skills, versions, and sync run history", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);
    const createdAt = new Date("2026-06-14T00:00:00.000Z");
    const discoveredSkills: DiscoveredSkill[] = [
      {
        description: "Reviews pull requests.",
        discoveryMethod: "convention",
        entryPath: "skills/review-bot/SKILL.md",
        license: "MIT",
        name: "Review Bot",
        rootPath: "skills/review-bot",
        skillKey: "skills-review-bot",
        status: "ready",
        tags: []
      },
      {
        description: "Writes release notes.",
        discoveryMethod: "convention",
        entryPath: "skills/release-notes/SKILL.md",
        license: "Proprietary",
        name: "Release Notes",
        rootPath: "skills/release-notes",
        skillKey: "skills-release-notes",
        status: "ready",
        tags: []
      }
    ];

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
        enabled: true,
        lastScanLabel: "未执行",
        note: "Team source",
        patterns: ["skills/*/SKILL.md"],
        priority: 1,
        providerName: "GitHub",
        scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
        skillUnits: 0,
        status: "review"
      }),
      createdAt,
      defaultBranch: "main",
      id: "repo-1",
      lastScannedCommitSha: null,
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "Team skills",
      providerId: "github",
      remoteUrl: "git@github.com:team/skills.git",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values({
      createdAt,
      discoveryMethod: "convention",
      entryPath: "old/SKILL.md",
      id: "repo-1__old",
      name: "Old Skill",
      repositoryId: "repo-1",
      rootPath: "old",
      status: "ready",
      updatedAt: createdAt
    });

    const syncRunId = await repositoryRepository.startSyncRun({
      repositoryId: "repo-1",
      startedAt: createdAt
    });
    await expect(db.select().from(syncRuns)).resolves.toMatchObject([
      {
        id: syncRunId,
        repositoryId: "repo-1",
        startedAt: createdAt,
        status: "running"
      }
    ]);

    const result = await repositoryRepository.recordSyncResult({
      commitSha: "abcdef123456",
      discoveredSkills,
      repositoryId: "repo-1",
      startedAt: createdAt,
      syncRunId
    });

    expect(result).toEqual({
      commitSha: "abcdef123456",
      repositoryId: "repo-1",
      scan: { added: 2, changed: 0, removed: 1, warnings: 0 },
      skillUnits: 2,
      status: "ready"
    });
    await expect(db.select().from(skillUnits).orderBy(skillUnits.entryPath)).resolves.toMatchObject(
      [
        {
          description: "Writes release notes.",
          entryPath: "skills/release-notes/SKILL.md",
          id: "repo-1__skills-release-notes",
          license: "Proprietary",
          name: "Release Notes",
          repositoryId: "repo-1"
        },
        {
          description: "Reviews pull requests.",
          entryPath: "skills/review-bot/SKILL.md",
          id: "repo-1__skills-review-bot",
          license: "MIT",
          name: "Review Bot",
          repositoryId: "repo-1"
        }
      ]
    );
    await expect(db.select().from(skillVersions).orderBy(skillVersions.id)).resolves.toMatchObject([
      {
        commitSha: "abcdef123456",
        id: "repo-1__skills-release-notes__abcdef123456",
        skillUnitId: "repo-1__skills-release-notes"
      },
      {
        commitSha: "abcdef123456",
        id: "repo-1__skills-review-bot__abcdef123456",
        skillUnitId: "repo-1__skills-review-bot"
      }
    ]);
    const repositoryRows = await repositoryRepository.list();
    expect(repositoryRows[0]?.lastScannedCommitSha).toBe("abcdef123456");
    expect(JSON.parse(repositoryRows[0]?.configJson ?? "{}")).toMatchObject({
      lastScanLabel: "刚刚同步",
      scan: { added: 2, changed: 0, removed: 1, warnings: 0 },
      skillUnits: 2,
      status: "ready"
    });
    await expect(db.select().from(syncRuns)).resolves.toMatchObject([
      {
        endCommitSha: "abcdef123456",
        errorMessage: null,
        id: syncRunId,
        repositoryId: "repo-1",
        startCommitSha: null,
        status: "success"
      }
    ]);
  });

  it("updates the running sync run when sync fails", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);
    const createdAt = new Date("2026-06-14T00:00:00.000Z");

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
      lastScannedCommitSha: "before-sha",
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "Team skills",
      providerId: "github",
      remoteUrl: "git@github.com:team/skills.git",
      updatedAt: createdAt
    });

    const syncRunId = await repositoryRepository.startSyncRun({
      repositoryId: "repo-1",
      startedAt: createdAt
    });
    const result = await repositoryRepository.recordSyncFailure({
      error: {
        category: "network",
        logPath: "/tmp/sync.log",
        message: "网络连接中断，暂时无法同步这个 Git 来源。请稍后重试，或检查代理/VPN 后再同步。"
      },
      repositoryId: "repo-1",
      startedAt: createdAt,
      syncRunId
    });

    expect(result).toMatchObject({
      error: {
        category: "network"
      },
      repositoryId: "repo-1",
      status: "failed"
    });
    await expect(db.select().from(syncRuns)).resolves.toMatchObject([
      {
        endCommitSha: null,
        errorMessage:
          "网络连接中断，暂时无法同步这个 Git 来源。请稍后重试，或检查代理/VPN 后再同步。",
        id: syncRunId,
        logPath: "/tmp/sync.log",
        repositoryId: "repo-1",
        startCommitSha: "before-sha",
        status: "failed"
      }
    ]);
  });

  it("marks stale running sync runs as interrupted on startup recovery", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);
    const createdAt = new Date("2026-06-14T00:00:00.000Z");

    await db.insert(syncRuns).values([
      {
        endCommitSha: null,
        errorMessage: null,
        finishedAt: null,
        id: "sync-running",
        logPath: null,
        repositoryId: "repo-1",
        startCommitSha: "before-sha",
        startedAt: createdAt,
        status: "running",
        summaryJson: "{}"
      },
      {
        endCommitSha: "after-sha",
        errorMessage: null,
        finishedAt: createdAt,
        id: "sync-success",
        logPath: null,
        repositoryId: "repo-1",
        startCommitSha: "before-sha",
        startedAt: createdAt,
        status: "success",
        summaryJson: "{}"
      }
    ]);

    const interrupted = await repositoryRepository.markInterruptedSyncRuns();

    expect(interrupted).toBe(1);
    await expect(db.select().from(syncRuns).orderBy(syncRuns.id)).resolves.toMatchObject([
      {
        errorMessage: "上次同步被中断，可能是应用异常退出。",
        id: "sync-running",
        status: "interrupted"
      },
      {
        errorMessage: null,
        id: "sync-success",
        status: "success"
      }
    ]);
  });
});
