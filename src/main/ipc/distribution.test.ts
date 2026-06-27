import { describe, expect, it } from "vitest";

import { createDbClient } from "../../db/client";
import {
  agentTargets,
  repositories,
  skillTargetPreferences,
  skillUnits,
  skillVersions
} from "../../db/schema";
import { previewDistributionPlan } from "./distribution";

describe("distribution IPC handlers", () => {
  it("normalizes preview input and returns a dry-run plan", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-27T00:00:00.000Z");

    await seedPreviewFixture(db, createdAt);

    const result = await previewDistributionPlan(
      db,
      {
        skillUnitIds: [" skill-review ", "skill-review"],
        triggerSource: "skill_detail"
      },
      { now: () => createdAt }
    );

    expect(result.summary).toMatchObject({
      actionCounts: { conflict: 0, install: 1, skip: 0, update: 0 },
      itemCount: 1
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        action: "install",
        agentTargetId: "target-codex",
        skillUnitId: "skill-review",
        targetPath: "/Users/test/.codex/skills/review-bot"
      })
    ]);
  });

  it("rejects preview requests without skill ids", async () => {
    const db = createDbClient(":memory:");

    await expect(
      previewDistributionPlan(
        db,
        {
          skillUnitIds: ["  "],
          triggerSource: "skill_detail"
        },
        { now: () => new Date("2026-06-27T00:00:00.000Z") }
      )
    ).rejects.toThrow("At least one skill is required.");
  });
});

const seedPreviewFixture = async (
  db: ReturnType<typeof createDbClient>,
  createdAt: Date
): Promise<void> => {
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
    metadataSnapshotJson: JSON.stringify({ skillKey: "review-bot" }),
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
};
