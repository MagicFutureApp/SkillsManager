import { mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createDbClient } from "../../db/client";
import {
  agentTargets,
  installInstances,
  repositories,
  skillTargetPreferences,
  skillUnits,
  skillVersions
} from "../../db/schema";
import { executeDistribution, previewDistribution } from "./distribution";

describe("distribution IPC handlers", () => {
  it("normalizes preview input and returns a one-time preview", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-27T00:00:00.000Z");

    await seedPreviewFixture(db, createdAt);

    const result = await previewDistribution(
      db,
      {
        skillUnitIds: [" skill-review ", "skill-review"],
        triggerSource: "skill_detail"
      },
      { now: () => createdAt }
    );

    expect(result.summary).toMatchObject({
      actionCounts: { blocked: 0, conflict: 0, install: 1, skip: 0, update: 0 },
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
      previewDistribution(
        db,
        {
          skillUnitIds: ["  "],
          triggerSource: "skill_detail"
        },
        { now: () => new Date("2026-06-27T00:00:00.000Z") }
      )
    ).rejects.toThrow("At least one skill is required.");
  });

  it("executes an install by copying the skill directory and recording the install instance", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-07-02T00:00:00.000Z");
    const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-manager-distribution-"));
    const cachePath = path.join(workspace, "cache");
    const targetPath = path.join(workspace, "target");

    await seedPreviewFixture(db, createdAt, { cachePath, targetPath });
    await mkdir(path.join(cachePath, "review-bot"), { recursive: true });
    await writeFile(path.join(cachePath, "review-bot", "SKILL.md"), "# Review Bot\n", "utf8");

    const result = await executeDistribution(
      db,
      {
        skillUnitIds: ["skill-review"]
      },
      { now: () => createdAt }
    );

    await expect(readFile(path.join(targetPath, "review-bot", "SKILL.md"), "utf8")).resolves.toBe(
      "# Review Bot\n"
    );
    expect(result.summary).toMatchObject({
      failed: 0,
      installed: 1,
      skipped: 0
    });
    await expect(db.select().from(installInstances)).resolves.toMatchObject([
      {
        agentTargetId: "target-codex",
        installedCommitSha: "abc123456789",
        installedPath: path.join(targetPath, "review-bot"),
        skillUnitId: "skill-review",
        skillVersionId: "version-review",
        status: "installed"
      }
    ]);
  });

  it("expands home-relative repository cache paths before copying", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-07-02T00:00:00.000Z");
    const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-manager-home-cache-"));
    const targetPath = path.join(workspace, "target");
    const expectedSourcePath = path.join(
      os.homedir(),
      ".skills-manager",
      "cache",
      "team-skills",
      "review-bot"
    );
    const copiedPaths: Array<{ sourcePath: string; targetPath: string }> = [];

    await seedPreviewFixture(db, createdAt, {
      cachePath: "~/.skills-manager/cache/team-skills",
      targetPath
    });

    const result = await executeDistribution(
      db,
      {
        skillUnitIds: ["skill-review"]
      },
      {
        async copyDirectory(sourcePath, nextTargetPath) {
          copiedPaths.push({ sourcePath, targetPath: nextTargetPath });
        },
        async ensureDirectory() {
          return undefined;
        },
        async isDirectory(candidatePath) {
          return candidatePath === expectedSourcePath;
        },
        now: () => createdAt,
        async pathExists(candidatePath) {
          return candidatePath === expectedSourcePath;
        },
        async removePath() {
          return undefined;
        }
      }
    );

    expect(result.summary).toMatchObject({
      blocked: 0,
      installed: 1
    });
    expect(copiedPaths).toEqual([
      {
        sourcePath: expectedSourcePath,
        targetPath: path.join(targetPath, "review-bot")
      }
    ]);
  });

  it("overwrites a filesystem conflict only when the submitted resolution requests overwrite", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-07-02T00:00:00.000Z");
    const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-manager-conflict-"));
    const cachePath = path.join(workspace, "cache");
    const targetPath = path.join(workspace, "target");
    const conflictingPath = path.join(targetPath, "review-bot");

    await seedPreviewFixture(db, createdAt, { cachePath, targetPath });
    await mkdir(path.join(cachePath, "review-bot"), { recursive: true });
    await writeFile(path.join(cachePath, "review-bot", "SKILL.md"), "# Review Bot\n", "utf8");
    await mkdir(conflictingPath, { recursive: true });
    await writeFile(path.join(conflictingPath, "SKILL.md"), "# Existing\n", "utf8");

    await executeDistribution(
      db,
      {
        conflictResolutions: [
          {
            agentTargetId: "target-codex",
            resolution: "skip",
            skillUnitId: "skill-review",
            targetPath: conflictingPath
          }
        ],
        skillUnitIds: ["skill-review"]
      },
      { now: () => createdAt }
    );
    await expect(readFile(path.join(conflictingPath, "SKILL.md"), "utf8")).resolves.toBe(
      "# Existing\n"
    );

    const overwriteResult = await executeDistribution(
      db,
      {
        conflictResolutions: [
          {
            agentTargetId: "target-codex",
            resolution: "overwrite",
            skillUnitId: "skill-review",
            targetPath: conflictingPath
          }
        ],
        skillUnitIds: ["skill-review"]
      },
      { now: () => createdAt }
    );

    await expect(readFile(path.join(conflictingPath, "SKILL.md"), "utf8")).resolves.toBe(
      "# Review Bot\n"
    );
    expect(overwriteResult.summary).toMatchObject({
      conflicts: 0,
      installed: 1
    });
  });
});

const seedPreviewFixture = async (
  db: ReturnType<typeof createDbClient>,
  createdAt: Date,
  paths: {
    cachePath?: string;
    targetPath?: string;
  } = {}
): Promise<void> => {
  const cachePath = paths.cachePath ?? "/Users/test/.skills-manager/cache/team-skills";
  const targetPath = paths.targetPath ?? "/Users/test/.codex/skills";

  await db.insert(repositories).values({
    configJson: "{}",
    createdAt,
    id: "repo-1",
    localCachePath: cachePath,
    name: "Team skills",
    providerId: "local",
    remoteUrl: "/Users/test/team-skills",
    updatedAt: createdAt
  });
  await db.insert(skillUnits).values({
    createdAt,
    description: "Reviews pull requests.",
    discoveryMethod: "convention",
    entryPath: "review-bot/SKILL.md",
    id: "skill-review",
    name: "Review Bot",
    repositoryId: "repo-1",
    rootPath: "review-bot",
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
    id: "preference-review-codex",
    skillUnitId: "skill-review",
    updatedAt: createdAt
  });
};
