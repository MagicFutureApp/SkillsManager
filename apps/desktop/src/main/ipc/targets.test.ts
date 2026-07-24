import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import type { SystemTargetRecord, TargetScanRecord } from "../../core/targets/target-api";
import { createDbClient } from "../../db/client";
import {
  agentTargets,
  installInstances,
  repositories,
  skillTargetPreferences,
  skillUnits
} from "../../db/schema";
import {
  addSkillDirectoryTarget,
  addCustomDirectoryTarget,
  deleteTargets,
  getTargets,
  resolveSelectedTargetDirectory,
  rescanTargets,
  selectTargetDirectory,
  updateCustomDirectoryTarget
} from "./targets";

const createExpectedTargetDirectoryAgentOptions = (basePath: string) => [
  {
    directoryName: ".codex",
    name: "Codex",
    targetPath: `${basePath}/.codex/skills`,
    type: "codex"
  },
  {
    directoryName: ".claude",
    name: "Claude Code",
    targetPath: `${basePath}/.claude/skills`,
    type: "claude-code"
  },
  {
    directoryName: ".gemini",
    name: "Gemini CLI",
    targetPath: `${basePath}/.gemini/skills`,
    type: "gemini-cli"
  }
];

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

  it("requires agent type confirmation for a selected known agent skills directory", async () => {
    const isDirectory = vi.fn();
    const readDirectory = vi.fn();

    await expect(
      resolveSelectedTargetDirectory("/Users/test/project/.claude/skills", {
        isDirectory,
        readDirectory
      })
    ).resolves.toEqual({
      basePath: "/Users/test/project",
      options: createExpectedTargetDirectoryAgentOptions("/Users/test/project"),
      selectedAgentType: "claude-code",
      status: "requires-agent-type",
      targetPath: "/Users/test/project/.claude/skills"
    });
    expect(isDirectory).not.toHaveBeenCalled();
    expect(readDirectory).not.toHaveBeenCalled();
  });

  it("requires agent type confirmation for a selected known agent config directory", async () => {
    const isDirectory = vi.fn();
    const readDirectory = vi.fn();

    await expect(
      resolveSelectedTargetDirectory("/Users/test/project/.claude", {
        isDirectory,
        readDirectory
      })
    ).resolves.toEqual({
      basePath: "/Users/test/project",
      options: createExpectedTargetDirectoryAgentOptions("/Users/test/project"),
      selectedAgentType: "claude-code",
      status: "requires-agent-type",
      targetPath: "/Users/test/project/.claude/skills"
    });
    expect(isDirectory).not.toHaveBeenCalled();
    expect(readDirectory).not.toHaveBeenCalled();
  });

  it("requires agent type confirmation for a known child agent skills directory", async () => {
    const isDirectory = vi.fn(async (candidatePath: string) => {
      return candidatePath === "/Users/test/project/.claude/skills";
    });
    const readDirectory = vi.fn().mockResolvedValue(["README.md", ".claude", ".codex"]);

    await expect(
      resolveSelectedTargetDirectory("/Users/test/project", {
        isDirectory,
        readDirectory
      })
    ).resolves.toEqual({
      basePath: "/Users/test/project",
      options: createExpectedTargetDirectoryAgentOptions("/Users/test/project"),
      selectedAgentType: "claude-code",
      status: "requires-agent-type",
      targetPath: "/Users/test/project/.claude/skills"
    });
    expect(isDirectory).toHaveBeenCalledWith("/Users/test/project/skills");
    expect(isDirectory).toHaveBeenCalledWith("/Users/test/project/.claude/skills");
    expect(readDirectory).toHaveBeenCalledWith("/Users/test/project");
  });

  it("returns agent options when the selected directory has no skills directory", async () => {
    const isDirectory = vi.fn().mockResolvedValue(false);
    const readDirectory = vi.fn().mockResolvedValue(["README.md"]);

    await expect(
      resolveSelectedTargetDirectory("/Users/test/project", {
        isDirectory,
        readDirectory
      })
    ).resolves.toEqual({
      basePath: "/Users/test/project",
      customDirectoryName: ".agents",
      options: createExpectedTargetDirectoryAgentOptions("/Users/test/project"),
      selectedAgentType: "custom",
      status: "requires-agent-type",
      targetPath: "/Users/test/project/.agents/skills"
    });
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

  it("adds a custom directory target with the submitted display name", async () => {
    const db = createDbClient(":memory:");

    await expect(
      addCustomDirectoryTarget(
        db,
        {
          name: "Review Skills Workspace",
          targetPath: "/Users/test/review-skills"
        },
        {
          now: () => new Date("2026-06-24T00:00:00.000Z")
        }
      )
    ).resolves.toMatchObject({
      registeredTargets: [
        {
          id: "target-custom-users-test-review-skills-16b7af9b49af",
          name: "Review Skills Workspace",
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

  it("adds an independent skill directory target with the submitted display name", async () => {
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
          name: "Review workspace",
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
          id: "target-custom-users-test-review-skills-16b7af9b49af",
          name: "Review workspace",
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
          status: "registered",
          type: "custom-directory"
        }
      ]
    });
  });

  it("deletes selected custom directory targets and returns refreshed targets", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-24T00:00:00.000Z");
    const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-manager-target-record-delete-"));
    const installedPath = path.join(workspace, "review-bot");

    await mkdir(installedPath, { recursive: true });
    await writeFile(path.join(installedPath, "SKILL.md"), "# Review Bot\n", "utf8");

    await db.insert(agentTargets).values([
      {
        createdAt,
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
        enabled: true,
        id: "target-keep",
        name: "Keep target",
        normalizedPath: "/Users/test/keep/.codex/skills",
        path: "/Users/test/keep/.codex/skills",
        type: "custom-directory",
        updatedAt: createdAt
      }
    ]);
    await db.insert(installInstances).values({
      agentTargetId: "target-project",
      id: "install-review",
      installedAt: createdAt,
      installedCommitSha: "abcdef123456",
      installedPath,
      skillUnitId: "skill-review",
      skillVersionId: "version-review",
      status: "installed",
      targetSnapshotJson: '{"name":"Project target"}',
      updatedAt: createdAt
    });

    await expect(deleteTargets(db, { targetIds: [" target-project ", ""] })).resolves.toEqual({
      registeredTargets: [
        {
          createdAt: "2026-06-24T00:00:00.000Z",
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
    await expect(readFile(path.join(installedPath, "SKILL.md"), "utf8")).resolves.toBe(
      "# Review Bot\n"
    );
    await expect(db.select().from(installInstances)).resolves.toEqual([]);
  });

  it("deletes installed skill files and install records when requested during target deletion", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-24T00:00:00.000Z");
    const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-manager-target-delete-"));
    const targetPath = path.join(workspace, "target");
    const installedPath = path.join(targetPath, "review-bot");
    const siblingPath = path.join(targetPath, "other-skill");

    await mkdir(installedPath, { recursive: true });
    await mkdir(siblingPath, { recursive: true });
    await writeFile(path.join(installedPath, "SKILL.md"), "# Review Bot\n", "utf8");
    await writeFile(path.join(siblingPath, "SKILL.md"), "# Other Skill\n", "utf8");
    await db.insert(agentTargets).values({
      createdAt,
      enabled: true,
      id: "target-project",
      name: "Project target",
      normalizedPath: targetPath,
      path: targetPath,
      type: "custom-directory",
      updatedAt: createdAt
    });
    await db.insert(installInstances).values({
      agentTargetId: "target-project",
      id: "install-review",
      installedAt: createdAt,
      installedCommitSha: "abcdef123456",
      installedPath,
      skillUnitId: "skill-review",
      skillVersionId: "version-review",
      status: "installed",
      targetSnapshotJson: '{"name":"Project target"}',
      updatedAt: createdAt
    });

    await expect(
      deleteTargets(db, {
        deleteInstalledFiles: true,
        targetIds: ["target-project"]
      } as Parameters<typeof deleteTargets>[1])
    ).resolves.toEqual({
      registeredTargets: []
    });

    await expect(readFile(path.join(installedPath, "SKILL.md"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(siblingPath, "SKILL.md"), "utf8")).resolves.toBe(
      "# Other Skill\n"
    );
    await expect(db.select().from(installInstances)).resolves.toEqual([]);
  });

  it("rejects target deletion when no target ids are provided", async () => {
    const db = createDbClient(":memory:");

    await expect(deleteTargets(db, { targetIds: [" "] })).rejects.toThrow(
      "At least one target is required."
    );
  });

  it("updates a selected custom directory target and returns refreshed targets", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-24T00:00:00.000Z");

    await db.insert(agentTargets).values({
      createdAt,
      enabled: true,
      id: "target-project",
      name: "Local project",
      normalizedPath: "/Users/test/project/.codex/skills",
      path: "/Users/test/project/.codex/skills",
      type: "custom-directory",
      updatedAt: createdAt
    });

    await expect(
      updateCustomDirectoryTarget(
        db,
        {
          name: "Edited target",
          targetId: "target-project",
          targetPath: "/Users/test/edited/.codex/skills"
        },
        {
          now: () => new Date("2026-06-25T00:00:00.000Z")
        }
      )
    ).resolves.toMatchObject({
      registeredTargets: [
        {
          id: "target-project",
          name: "Edited target",
          normalizedPath: "/Users/test/edited/.codex/skills",
          path: "/Users/test/edited/.codex/skills",
          type: "custom-directory",
          updatedAt: "2026-06-25T00:00:00.000Z"
        }
      ]
    });
  });

  it("rejects updates to system built-in targets", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-24T00:00:00.000Z");

    await db.insert(agentTargets).values({
      createdAt,
      enabled: true,
      id: "system-codex",
      name: "Codex",
      normalizedPath: "/Users/test/.codex/skills",
      path: "/Users/test/.codex/skills",
      type: "codex",
      updatedAt: createdAt
    });

    await expect(
      updateCustomDirectoryTarget(
        db,
        {
          name: "Edited Codex",
          targetId: "system-codex",
          targetPath: "/Users/test/other/.codex/skills"
        },
        {
          now: () => new Date("2026-06-25T00:00:00.000Z")
        }
      )
    ).rejects.toThrow("System built-in targets cannot be edited.");
  });

  it("lists targets from the database without mixing in system scan results", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-23T00:00:00.000Z");

    await db.insert(agentTargets).values({
      createdAt,
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
