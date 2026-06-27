import { describe, expect, it, vi } from "vitest";

import type { SystemTargetRecord, TargetScanRecord } from "../../core/targets/target-api";
import { createDbClient } from "../../db/client";
import { agentTargets, repositories, skillTargetPreferences, skillUnits } from "../../db/schema";
import {
  addSkillDirectoryTarget,
  addCustomDirectoryTarget,
  deleteTargets,
  getTargets,
  rescanTargets,
  selectTargetDirectory
} from "./targets";

describe("target IPC handlers", () => {
  it("returns the selected target directory path", async () => {
    const showOpenDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: ["/Users/test/review-skills"]
    });

    await expect(selectTargetDirectory({ showOpenDialog })).resolves.toBe(
      "/Users/test/review-skills"
    );
    expect(showOpenDialog).toHaveBeenCalledWith({
      properties: ["openDirectory"]
    });
  });

  it("returns null when target directory selection is canceled", async () => {
    const showOpenDialog = vi.fn().mockResolvedValue({
      canceled: true,
      filePaths: []
    });

    await expect(selectTargetDirectory({ showOpenDialog })).resolves.toBeNull();
  });

  it("adds a selected custom directory target as global and returns refreshed targets", async () => {
    const db = createDbClient(":memory:");

    await expect(
      addCustomDirectoryTarget(db, "/Users/test/review-skills", {
        now: () => new Date("2026-06-24T00:00:00.000Z")
      })
    ).resolves.toMatchObject({
      registeredTargets: [
        {
          defaultInstallStrategy: "copy",
          enabled: true,
          id: "target-custom-users-test-review-skills-16b7af9b49af",
          name: "review-skills",
          normalizedPath: "/Users/test/review-skills",
          path: "/Users/test/review-skills",
          scope: "global",
          status: "registered",
          type: "custom-directory"
        }
      ]
    });
  });

  it("adds a selected directory target as independent and enables it for one skill", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-24T00:00:00.000Z");

    await db.insert(repositories).values({
      configJson: "{}",
      createdAt,
      id: "team-skills",
      localCachePath: "/tmp/team-skills",
      name: "Team skills repository",
      providerId: "local",
      remoteUrl: "/tmp/team-skills",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values({
      createdAt,
      description: "Reviews pull requests.",
      discoveryMethod: "manifest",
      entryPath: "skills/review-bot/SKILL.md",
      id: "team-skills__skills-review-bot",
      name: "Review Bot",
      repositoryId: "team-skills",
      rootPath: "skills/review-bot",
      status: "ready",
      updatedAt: createdAt
    });

    await expect(
      addSkillDirectoryTarget(
        db,
        {
          skillUnitId: "team-skills__skills-review-bot",
          targetPath: "/Users/test/review-skills"
        },
        {
          now: () => createdAt
        }
      )
    ).resolves.toMatchObject({
      registeredTargets: [
        {
          enabled: true,
          id: "target-custom-users-test-review-skills-16b7af9b49af",
          name: "review-skills",
          normalizedPath: "/Users/test/review-skills",
          path: "/Users/test/review-skills",
          scope: "independent",
          selectedSkills: [
            {
              id: "team-skills__skills-review-bot",
              name: "Review Bot",
              repository: "Team skills repository"
            }
          ],
          skillCount: 1,
          status: "registered",
          type: "custom-directory"
        }
      ]
    });

    await expect(db.select().from(skillTargetPreferences)).resolves.toMatchObject([
      {
        agentTargetId: "target-custom-users-test-review-skills-16b7af9b49af",
        enabled: true,
        skillUnitId: "team-skills__skills-review-bot"
      }
    ]);
  });

  it("deletes selected custom directory targets and returns refreshed targets", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-24T00:00:00.000Z");

    await db.insert(agentTargets).values([
      {
        createdAt,
        defaultInstallStrategy: "copy",
        enabled: true,
        id: "target-project",
        name: "Project target",
        normalizedPath: "/Users/test/project/.codex/skills",
        path: "/Users/test/project/.codex/skills",
        type: "custom-directory",
        updatedAt: createdAt
      },
      {
        createdAt,
        defaultInstallStrategy: "copy",
        enabled: true,
        id: "target-keep",
        name: "Keep target",
        normalizedPath: "/Users/test/keep/.codex/skills",
        path: "/Users/test/keep/.codex/skills",
        type: "custom-directory",
        updatedAt: createdAt
      }
    ]);

    await expect(deleteTargets(db, { targetIds: [" target-project ", ""] })).resolves.toEqual({
      registeredTargets: [
        {
          createdAt: "2026-06-24T00:00:00.000Z",
          defaultInstallStrategy: "copy",
          enabled: true,
          id: "target-keep",
          name: "Keep target",
          normalizedPath: "/Users/test/keep/.codex/skills",
          path: "/Users/test/keep/.codex/skills",
          scanMessage: null,
          scope: "global",
          selectedSkills: [],
          skillCount: 0,
          skillPreferences: [],
          status: "registered",
          type: "custom-directory",
          updatedAt: "2026-06-24T00:00:00.000Z"
        }
      ]
    });
  });

  it("rejects target deletion when no target ids are provided", async () => {
    const db = createDbClient(":memory:");

    await expect(deleteTargets(db, { targetIds: [" "] })).rejects.toThrow(
      "At least one target is required."
    );
  });

  it("lists targets from the database without mixing in system scan results", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-23T00:00:00.000Z");

    await db.insert(agentTargets).values({
      createdAt,
      defaultInstallStrategy: "copy",
      enabled: true,
      id: "target-project",
      name: "Local project",
      normalizedPath: "/Users/test/project/.codex/skills",
      path: "/Users/test/project/.codex/skills",
      type: "custom-directory",
      updatedAt: createdAt
    });

    await expect(getTargets(db)).resolves.toEqual({
      registeredTargets: [
        {
          createdAt: "2026-06-23T00:00:00.000Z",
          defaultInstallStrategy: "copy",
          enabled: true,
          id: "target-project",
          name: "Local project",
          normalizedPath: "/Users/test/project/.codex/skills",
          path: "/Users/test/project/.codex/skills",
          scanMessage: null,
          scope: "global",
          selectedSkills: [],
          skillCount: 0,
          skillPreferences: [],
          status: "registered",
          type: "custom-directory",
          updatedAt: "2026-06-23T00:00:00.000Z"
        }
      ]
    });
  });

  it("rescans system targets, persists them, and returns database-backed records", async () => {
    const db = createDbClient(":memory:");
    const scannedTargets: SystemTargetRecord[] = [
      {
        defaultInstallStrategy: "copy",
        detectionMessage: "Target directory exists and is writable.",
        id: "system-codex",
        name: "Codex",
        normalizedPath: "/Users/test/.codex/skills",
        path: "/Users/test/.codex/skills",
        status: "detected",
        type: "codex"
      }
    ];
    const scanSystemTargets = vi.fn().mockResolvedValue(scannedTargets);
    const scanRegisteredTargets = vi.fn().mockResolvedValue([]);

    const result = await rescanTargets(db, {
      now: () => new Date("2026-06-23T01:00:00.000Z"),
      scanRegisteredTargets,
      scanSystemTargets
    });

    expect(scanSystemTargets).toHaveBeenCalledOnce();
    expect(result).toEqual({
      registeredTargets: [
        {
          createdAt: "2026-06-23T01:00:00.000Z",
          defaultInstallStrategy: "copy",
          enabled: true,
          id: "system-codex",
          name: "Codex",
          normalizedPath: "/Users/test/.codex/skills",
          path: "/Users/test/.codex/skills",
          scanMessage: "Target directory exists and is writable.",
          scope: "global",
          selectedSkills: [],
          skillCount: 0,
          skillPreferences: [],
          status: "detected",
          type: "codex",
          updatedAt: "2026-06-23T01:00:00.000Z"
        }
      ],
      scanIssues: []
    });
  });

  it("rescans database targets after system targets and reports persisted issues", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-22T00:00:00.000Z");

    await db.insert(agentTargets).values([
      {
        createdAt,
        defaultInstallStrategy: "copy",
        enabled: true,
        id: "target-project",
        name: "Local project",
        normalizedPath: "/Users/test/project/.codex/skills",
        path: "/Users/test/project/.codex/skills",
        type: "custom-directory",
        updatedAt: createdAt
      },
      {
        createdAt,
        defaultInstallStrategy: "copy",
        enabled: true,
        id: "target-codex-duplicate",
        name: "Duplicate Codex",
        normalizedPath: "/Users/test/.codex/skills",
        path: "/Users/test/.codex/skills",
        type: "codex",
        updatedAt: createdAt
      }
    ]);

    const scannedTargets: SystemTargetRecord[] = [
      {
        defaultInstallStrategy: "copy",
        detectionMessage: "Target directory exists and is writable.",
        id: "system-codex",
        name: "Codex",
        normalizedPath: "/Users/test/.codex/skills",
        path: "/Users/test/.codex/skills",
        status: "detected",
        type: "codex"
      }
    ];
    const rescannedRegisteredTarget: TargetScanRecord = {
      defaultInstallStrategy: "copy",
      detectionMessage: "Target directory exists but is not writable.",
      id: "target-project",
      name: "Local project",
      normalizedPath: "/Users/test/project/.codex/skills",
      path: "/Users/test/project/.codex/skills",
      status: "not-writable",
      type: "custom-directory"
    };
    const scanSystemTargets = vi.fn().mockResolvedValue(scannedTargets);
    const scanRegisteredTargets = vi.fn().mockResolvedValue([rescannedRegisteredTarget]);

    const result = await rescanTargets(db, {
      now: () => new Date("2026-06-23T01:00:00.000Z"),
      scanRegisteredTargets,
      scanSystemTargets
    });

    expect(scanRegisteredTargets).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "target-project",
        normalizedPath: "/Users/test/project/.codex/skills",
        path: "/Users/test/project/.codex/skills",
        type: "custom-directory"
      })
    ]);
    expect(result.scanIssues).toEqual([
      {
        id: "target-project",
        message: "Target directory exists but is not writable.",
        name: "Local project",
        path: "/Users/test/project/.codex/skills",
        status: "not-writable",
        type: "custom-directory"
      }
    ]);
    await expect(getTargets(db)).resolves.toMatchObject({
      registeredTargets: [
        {
          id: "target-codex-duplicate",
          scanMessage: "Target directory exists and is writable.",
          status: "detected"
        },
        {
          enabled: false,
          id: "target-project",
          scanMessage: "Target directory exists but is not writable.",
          status: "not-writable"
        }
      ]
    });
  });
});
