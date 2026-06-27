import { describe, expect, it } from "vitest";

import { createDbClient } from "../client";
import {
  agentTargets,
  distributionPlanItems,
  distributionPlans,
  installInstances,
  repositories,
  skillTargetPreferences,
  skillUnits,
  skillVersions
} from "../schema";
import { createDistributionRepository } from "./distributionRepository";

describe("createDistributionRepository", () => {
  it("creates and stores an install dry-run preview for enabled skill targets", async () => {
    const db = createDbClient(":memory:");
    const repository = createDistributionRepository(db);
    const createdAt = new Date("2026-06-27T00:00:00.000Z");

    await db.insert(repositories).values({
      configJson: "{}",
      createdAt,
      id: "repo-1",
      localCachePath: "/Users/test/.skills-manager/cache/team-skills",
      name: "Team skills",
      providerId: "local",
      remoteUrl: "/Users/test/team-skills",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values({
      createdAt,
      description: "Reviews pull requests.",
      discoveryMethod: "convention",
      entryPath: "skills/review-bot/SKILL.md",
      id: "skill-review",
      name: "Review Bot",
      repositoryId: "repo-1",
      rootPath: "skills/review-bot",
      status: "ready",
      updatedAt: createdAt
    });
    await db.insert(skillVersions).values({
      commitSha: "abc123456789",
      createdAt,
      id: "version-review",
      metadataSnapshotJson: JSON.stringify({ skillKey: "review-bot", tags: ["review"] }),
      skillUnitId: "skill-review"
    });
    await db.insert(agentTargets).values({
      createdAt,
      defaultInstallStrategy: "copy",
      enabled: true,
      id: "target-codex",
      name: "Codex",
      normalizedPath: "/Users/test/.codex/skills",
      path: "/Users/test/.codex/skills",
      type: "codex",
      updatedAt: createdAt
    });
    await db.insert(skillTargetPreferences).values({
      agentTargetId: "target-codex",
      createdAt,
      enabled: true,
      id: "preference-review-codex",
      skillUnitId: "skill-review",
      updatedAt: createdAt
    });

    const preview = await repository.createPreview(
      {
        skillUnitIds: ["skill-review"],
        triggerSource: "skill_detail"
      },
      createdAt
    );

    expect(preview.summary).toEqual({
      actionCounts: { conflict: 0, install: 1, skip: 0, update: 0 },
      itemCount: 1,
      skillCount: 1,
      targetCount: 1
    });
    expect(preview.items).toEqual([
      expect.objectContaining({
        action: "install",
        agentTargetId: "target-codex",
        commitSha: "abc123456789",
        installStrategy: "copy",
        skillName: "Review Bot",
        skillUnitId: "skill-review",
        sourcePath: "/Users/test/.skills-manager/cache/team-skills/skills/review-bot",
        targetName: "Codex",
        targetPath: "/Users/test/.codex/skills/review-bot"
      })
    ]);
    await expect(db.select().from(distributionPlans)).resolves.toMatchObject([
      {
        createdAt,
        createdBy: "local-user",
        operationType: "install",
        status: "ready",
        triggerSource: "skill_detail",
        updatedAt: createdAt
      }
    ]);
    await expect(db.select().from(distributionPlanItems)).resolves.toMatchObject([
      {
        action: "install",
        agentTargetId: "target-codex",
        installStrategy: "copy",
        skillVersionId: "version-review",
        sourcePath: "/Users/test/.skills-manager/cache/team-skills/skills/review-bot",
        status: "pending",
        targetPath: "/Users/test/.codex/skills/review-bot"
      }
    ]);
  });

  it("classifies update, skip, and conflict preview items from installed records", async () => {
    const db = createDbClient(":memory:");
    const repository = createDistributionRepository(db);
    const createdAt = new Date("2026-06-27T00:00:00.000Z");
    const previousAt = new Date("2026-06-26T00:00:00.000Z");

    await db.insert(repositories).values({
      configJson: "{}",
      createdAt,
      id: "repo-1",
      localCachePath: "/Users/test/.skills-manager/cache/team-skills",
      name: "Team skills",
      providerId: "local",
      remoteUrl: "/Users/test/team-skills",
      updatedAt: createdAt
    });
    await db.insert(agentTargets).values({
      createdAt,
      defaultInstallStrategy: "copy",
      enabled: true,
      id: "target-codex",
      name: "Codex",
      normalizedPath: "/Users/test/.codex/skills",
      path: "/Users/test/.codex/skills",
      type: "codex",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values([
      {
        createdAt,
        description: "Needs an update.",
        discoveryMethod: "convention",
        entryPath: "skills/update-bot/SKILL.md",
        id: "skill-update",
        name: "Update Bot",
        repositoryId: "repo-1",
        rootPath: "skills/update-bot",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        description: "Already installed.",
        discoveryMethod: "convention",
        entryPath: "skills/skip-bot/SKILL.md",
        id: "skill-skip",
        name: "Skip Bot",
        repositoryId: "repo-1",
        rootPath: "skills/skip-bot",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        description: "Conflicts with another skill.",
        discoveryMethod: "convention",
        entryPath: "skills/conflict-bot/SKILL.md",
        id: "skill-conflict",
        name: "Conflict Bot",
        repositoryId: "repo-1",
        rootPath: "skills/conflict-bot",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        description: "Owns the conflicting path.",
        discoveryMethod: "convention",
        entryPath: "skills/other-bot/SKILL.md",
        id: "skill-other",
        name: "Other Bot",
        repositoryId: "repo-1",
        rootPath: "skills/other-bot",
        status: "ready",
        updatedAt: createdAt
      }
    ]);
    await db.insert(skillVersions).values([
      {
        commitSha: "1111111",
        createdAt: previousAt,
        id: "version-update-old",
        metadataSnapshotJson: JSON.stringify({ skillKey: "update-bot" }),
        skillUnitId: "skill-update"
      },
      {
        commitSha: "2222222",
        createdAt,
        id: "version-update-new",
        metadataSnapshotJson: JSON.stringify({ skillKey: "update-bot" }),
        skillUnitId: "skill-update"
      },
      {
        commitSha: "3333333",
        createdAt,
        id: "version-skip",
        metadataSnapshotJson: JSON.stringify({ skillKey: "skip-bot" }),
        skillUnitId: "skill-skip"
      },
      {
        commitSha: "4444444",
        createdAt,
        id: "version-conflict",
        metadataSnapshotJson: JSON.stringify({ skillKey: "conflict-bot" }),
        skillUnitId: "skill-conflict"
      },
      {
        commitSha: "5555555",
        createdAt,
        id: "version-other",
        metadataSnapshotJson: JSON.stringify({ skillKey: "other-bot" }),
        skillUnitId: "skill-other"
      }
    ]);
    await db.insert(skillTargetPreferences).values([
      {
        agentTargetId: "target-codex",
        createdAt,
        enabled: true,
        id: "preference-update",
        skillUnitId: "skill-update",
        updatedAt: createdAt
      },
      {
        agentTargetId: "target-codex",
        createdAt,
        enabled: true,
        id: "preference-skip",
        skillUnitId: "skill-skip",
        updatedAt: createdAt
      },
      {
        agentTargetId: "target-codex",
        createdAt,
        enabled: true,
        id: "preference-conflict",
        skillUnitId: "skill-conflict",
        updatedAt: createdAt
      }
    ]);
    await db.insert(installInstances).values([
      {
        agentTargetId: "target-codex",
        id: "install-update-old",
        installStrategy: "copy",
        installedAt: previousAt,
        installedCommitSha: "1111111",
        installedPath: "/Users/test/.codex/skills/update-bot",
        skillVersionId: "version-update-old",
        status: "installed",
        targetSnapshotJson: "{}",
        updatedAt: previousAt
      },
      {
        agentTargetId: "target-codex",
        id: "install-skip",
        installStrategy: "copy",
        installedAt: createdAt,
        installedCommitSha: "3333333",
        installedPath: "/Users/test/.codex/skills/skip-bot",
        skillVersionId: "version-skip",
        status: "installed",
        targetSnapshotJson: "{}",
        updatedAt: createdAt
      },
      {
        agentTargetId: "target-codex",
        id: "install-other",
        installStrategy: "copy",
        installedAt: createdAt,
        installedCommitSha: "5555555",
        installedPath: "/Users/test/.codex/skills/conflict-bot",
        skillVersionId: "version-other",
        status: "installed",
        targetSnapshotJson: "{}",
        updatedAt: createdAt
      }
    ]);

    const preview = await repository.createPreview(
      {
        skillUnitIds: ["skill-update", "skill-skip", "skill-conflict"],
        triggerSource: "skills_bulk"
      },
      createdAt
    );
    const actionBySkillId = new Map(preview.items.map((item) => [item.skillUnitId, item.action]));

    expect(preview.status).toBe("draft");
    expect(preview.operationType).toBe("update");
    expect(preview.summary.actionCounts).toEqual({
      conflict: 1,
      install: 0,
      skip: 1,
      update: 1
    });
    expect(actionBySkillId).toEqual(
      new Map([
        ["skill-conflict", "conflict"],
        ["skill-skip", "skip"],
        ["skill-update", "update"]
      ])
    );
  });
});
