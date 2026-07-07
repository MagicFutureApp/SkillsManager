import { mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createDbClient } from "../../db/client";
import { agentTargets, installInstances, skillTargetPreferences } from "../../db/schema";
import { removeSkillTargetPreference } from "./skills";

describe("skills IPC handlers", () => {
  it("disables the preference without deleting files or install records by default", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-07-07T00:00:00.000Z");
    const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-manager-target-keep-"));
    const targetPath = path.join(workspace, "target");
    const installedPath = path.join(targetPath, "review-bot");

    await mkdir(installedPath, { recursive: true });
    await writeFile(path.join(installedPath, "SKILL.md"), "# Review Bot\n", "utf8");
    await seedInstalledSkillTarget(db, createdAt, { installedPath, targetPath });

    await expect(
      removeSkillTargetPreference(db, {
        agentTargetId: "target-codex",
        deleteInstalledFiles: false,
        removeTargetPreference: false,
        skillUnitId: "skill-review"
      })
    ).resolves.toEqual({
      deletedInstalledPath: null,
      success: true
    });

    await expect(readFile(path.join(installedPath, "SKILL.md"), "utf8")).resolves.toBe(
      "# Review Bot\n"
    );
    await expect(db.select().from(skillTargetPreferences)).resolves.toMatchObject([
      {
        agentTargetId: "target-codex",
        enabled: false,
        id: "preference-review",
        skillUnitId: "skill-review"
      }
    ]);
    await expect(db.select().from(installInstances)).resolves.toMatchObject([
      {
        agentTargetId: "target-codex",
        id: "install-review",
        installedPath,
        skillUnitId: "skill-review"
      }
    ]);
  });

  it("removes the preference record without deleting files or install records when requested", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-07-07T00:00:00.000Z");
    const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-manager-target-preference-"));
    const targetPath = path.join(workspace, "target");
    const installedPath = path.join(targetPath, "review-bot");

    await mkdir(installedPath, { recursive: true });
    await writeFile(path.join(installedPath, "SKILL.md"), "# Review Bot\n", "utf8");
    await seedInstalledSkillTarget(db, createdAt, { installedPath, targetPath });

    await expect(
      removeSkillTargetPreference(db, {
        agentTargetId: "target-codex",
        deleteInstalledFiles: false,
        removeTargetPreference: true,
        skillUnitId: "skill-review"
      })
    ).resolves.toEqual({
      deletedInstalledPath: null,
      success: true
    });

    await expect(readFile(path.join(installedPath, "SKILL.md"), "utf8")).resolves.toBe(
      "# Review Bot\n"
    );
    await expect(db.select().from(skillTargetPreferences)).resolves.toEqual([]);
    await expect(db.select().from(installInstances)).resolves.toMatchObject([
      {
        agentTargetId: "target-codex",
        id: "install-review",
        installedPath,
        skillUnitId: "skill-review"
      }
    ]);
  });

  it("deletes installed skill files while keeping a disabled preference when requested", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-07-07T00:00:00.000Z");
    const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-manager-target-files-"));
    const targetPath = path.join(workspace, "target");
    const installedPath = path.join(targetPath, "review-bot");

    await mkdir(installedPath, { recursive: true });
    await writeFile(path.join(installedPath, "SKILL.md"), "# Review Bot\n", "utf8");
    await seedInstalledSkillTarget(db, createdAt, { installedPath, targetPath });

    await expect(
      removeSkillTargetPreference(db, {
        agentTargetId: "target-codex",
        deleteInstalledFiles: true,
        removeTargetPreference: false,
        skillUnitId: "skill-review"
      })
    ).resolves.toEqual({
      deletedInstalledPath: installedPath,
      success: true
    });

    await expect(readFile(path.join(installedPath, "SKILL.md"), "utf8")).rejects.toThrow();
    await expect(db.select().from(skillTargetPreferences)).resolves.toMatchObject([
      {
        agentTargetId: "target-codex",
        enabled: false,
        id: "preference-review",
        skillUnitId: "skill-review"
      }
    ]);
    await expect(db.select().from(installInstances)).resolves.toEqual([]);
  });

  it("deletes only the exact installed skill directory and requested preference record", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-07-07T00:00:00.000Z");
    const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-manager-target-remove-"));
    const targetPath = path.join(workspace, "target");
    const installedPath = path.join(targetPath, "review-bot");
    const siblingPath = path.join(targetPath, "other-skill");

    await mkdir(installedPath, { recursive: true });
    await mkdir(siblingPath, { recursive: true });
    await writeFile(path.join(installedPath, "SKILL.md"), "# Review Bot\n", "utf8");
    await writeFile(path.join(siblingPath, "SKILL.md"), "# Other Skill\n", "utf8");
    await seedInstalledSkillTarget(db, createdAt, { installedPath, targetPath });
    await db.insert(skillTargetPreferences).values({
      agentTargetId: "target-codex",
      createdAt,
      enabled: true,
      id: "preference-other",
      skillUnitId: "skill-other",
      updatedAt: createdAt
    });
    await db.insert(installInstances).values({
      agentTargetId: "target-codex",
      installedAt: createdAt,
      installedCommitSha: "otherabcdef",
      installedPath: siblingPath,
      skillUnitId: "skill-other",
      skillVersionId: "version-other",
      id: "install-other",
      status: "installed",
      targetSnapshotJson: '{"name":"Codex"}',
      updatedAt: createdAt
    });

    await expect(
      removeSkillTargetPreference(db, {
        agentTargetId: " target-codex ",
        deleteInstalledFiles: true,
        removeTargetPreference: true,
        skillUnitId: " skill-review "
      })
    ).resolves.toEqual({
      deletedInstalledPath: installedPath,
      success: true
    });

    await expect(readFile(path.join(installedPath, "SKILL.md"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(siblingPath, "SKILL.md"), "utf8")).resolves.toBe(
      "# Other Skill\n"
    );
    await expect(db.select().from(skillTargetPreferences)).resolves.toMatchObject([
      {
        agentTargetId: "target-codex",
        enabled: true,
        id: "preference-other",
        skillUnitId: "skill-other"
      }
    ]);
    await expect(db.select().from(installInstances)).resolves.toMatchObject([
      {
        agentTargetId: "target-codex",
        id: "install-other",
        installedPath: siblingPath,
        skillUnitId: "skill-other"
      }
    ]);
  });

  it("rejects deleting an installed path that resolves to the target root", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-07-07T00:00:00.000Z");
    const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-manager-target-root-"));
    const targetPath = path.join(workspace, "target");

    await mkdir(targetPath, { recursive: true });
    await writeFile(path.join(targetPath, "keep.txt"), "keep root\n", "utf8");
    await seedInstalledSkillTarget(db, createdAt, { installedPath: targetPath, targetPath });

    await expect(
      removeSkillTargetPreference(db, {
        agentTargetId: "target-codex",
        deleteInstalledFiles: true,
        removeTargetPreference: false,
        skillUnitId: "skill-review"
      })
    ).rejects.toThrow("Installed skill path is not safe to delete.");

    await expect(readFile(path.join(targetPath, "keep.txt"), "utf8")).resolves.toBe("keep root\n");
    await expect(db.select().from(skillTargetPreferences)).resolves.toMatchObject([
      {
        enabled: true,
        id: "preference-review"
      }
    ]);
    await expect(db.select().from(installInstances)).resolves.toHaveLength(1);
  });
});

const seedInstalledSkillTarget = async (
  db: ReturnType<typeof createDbClient>,
  createdAt: Date,
  paths: {
    installedPath: string;
    targetPath: string;
  }
): Promise<void> => {
  await db.insert(agentTargets).values({
    createdAt,
    enabled: true,
    id: "target-codex",
    name: "Codex",
    normalizedPath: paths.targetPath,
    path: paths.targetPath,
    type: "codex",
    updatedAt: createdAt
  });
  await db.insert(skillTargetPreferences).values({
    agentTargetId: "target-codex",
    createdAt,
    enabled: true,
    id: "preference-review",
    skillUnitId: "skill-review",
    updatedAt: createdAt
  });
  await db.insert(installInstances).values({
    agentTargetId: "target-codex",
    installedAt: createdAt,
    installedCommitSha: "abcdef123456",
    installedPath: paths.installedPath,
    skillUnitId: "skill-review",
    skillVersionId: "version-review",
    id: "install-review",
    status: "installed",
    targetSnapshotJson: '{"name":"Codex"}',
    updatedAt: createdAt
  });
};
