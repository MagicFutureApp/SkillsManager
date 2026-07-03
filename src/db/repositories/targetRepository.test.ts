import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDbClient } from "../client";
import {
  agentTargets,
  installInstances,
  providers,
  repositories,
  skillTargetPreferences,
  skillUnits,
  skillVersions
} from "../schema";
import { createTargetRepository } from "./targetRepository";

describe("createTargetRepository", () => {
  it("registers a selected custom directory target as global", async () => {
    const db = createDbClient(":memory:");
    const repository = createTargetRepository(db);
    const createdAt = new Date("2026-06-24T00:00:00.000Z");

    await repository.registerCustomDirectoryTarget(
      {
        id: "target-custom-review-skills",
        name: "review-skills",
        normalizedPath: "/Users/test/review-skills",
        path: "/Users/test/review-skills"
      },
      createdAt
    );

    const targets = await repository.list();

    expect(targets).toMatchObject([
      {
        createdAt: "2026-06-24T00:00:00.000Z",
        enabled: true,
        id: "target-custom-review-skills",
        name: "review-skills",
        normalizedPath: "/Users/test/review-skills",
        path: "/Users/test/review-skills",
        scanMessage: null,
        scope: "global",
        status: "registered",
        type: "custom-directory",
        updatedAt: "2026-06-24T00:00:00.000Z"
      }
    ]);
  });

  it("saves scanned system targets into database records and updates them by type and path", async () => {
    const db = createDbClient(":memory:");
    const repository = createTargetRepository(db);
    const firstScanAt = new Date("2026-06-23T00:00:00.000Z");
    const secondScanAt = new Date("2026-06-23T01:00:00.000Z");

    await repository.saveScannedTargets(
      [
        {
          detectionMessage: "Target directory exists and is writable.",
          id: "system-codex",
          name: "Codex",
          normalizedPath: "/Users/test/.codex/skills",
          path: "/Users/test/.codex/skills",
          status: "detected",
          type: "codex"
        },
        {
          detectionMessage: "Legacy missing target.",
          id: "system-claude-code",
          name: "Claude Code",
          normalizedPath: "/Users/test/.claude/skills",
          path: "/Users/test/.claude/skills",
          status: "missing",
          type: "claude-code"
        }
      ],
      firstScanAt
    );

    await repository.saveScannedTargets(
      [
        {
          detectionMessage: "Target directory exists and is writable.",
          id: "system-codex-renamed",
          name: "Codex",
          normalizedPath: "/Users/test/.codex/skills",
          path: "/Users/test/.codex/skills",
          status: "detected",
          type: "codex"
        }
      ],
      secondScanAt
    );

    await expect(repository.list()).resolves.toMatchObject([
      {
        createdAt: "2026-06-23T00:00:00.000Z",
        enabled: false,
        id: "system-claude-code",
        name: "Claude Code",
        scanMessage: "Legacy missing target.",
        status: "missing",
        updatedAt: "2026-06-23T00:00:00.000Z"
      },
      {
        createdAt: "2026-06-23T00:00:00.000Z",
        enabled: true,
        id: "system-codex",
        name: "Codex",
        scanMessage: "Target directory exists and is writable.",
        status: "detected",
        updatedAt: "2026-06-23T01:00:00.000Z"
      }
    ]);
    await expect(repository.count()).resolves.toBe(2);
  });

  it("lists registered targets with enabled skill preference counts", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-21T00:00:00.000Z");

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
      localCachePath: "/Users/test/.skills-manager/cache/project",
      name: "Project skills",
      providerId: "local-git",
      remoteUrl: "/Users/test/project",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values([
      {
        createdAt,
        description: "Review pull requests.",
        discoveryMethod: "convention",
        entryPath: "skills/review-bot/SKILL.md",
        id: "skill-1",
        license: "MIT",
        name: "Review Bot",
        repositoryId: "repo-1",
        rootPath: "skills/review-bot",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        description: "Write release notes.",
        discoveryMethod: "convention",
        entryPath: "skills/release-notes/SKILL.md",
        id: "skill-2",
        license: "MIT",
        name: "Release Notes",
        repositoryId: "repo-1",
        rootPath: "skills/release-notes",
        status: "ready",
        updatedAt: createdAt
      }
    ]);
    await db.insert(agentTargets).values([
      {
        createdAt,
        enabled: true,
        id: "target-codex",
        name: "Codex",
        normalizedPath: "/Users/test/.codex/skills",
        path: "/Users/test/.codex/skills",
        type: "codex",
        updatedAt: createdAt
      },
      {
        createdAt,
        enabled: true,
        id: "target-project",
        name: "Local project",
        normalizedPath: "/Users/test/project/.codex/skills",
        path: "/Users/test/project/.codex/skills",
        type: "custom-directory",
        updatedAt: createdAt
      }
    ]);
    await db.insert(skillTargetPreferences).values([
      {
        agentTargetId: "target-project",
        createdAt,
        enabled: true,
        id: "preference-1",
        skillUnitId: "skill-1",
        updatedAt: createdAt
      },
      {
        agentTargetId: "target-project",
        createdAt,
        enabled: true,
        id: "preference-2",
        skillUnitId: "skill-2",
        updatedAt: createdAt
      },
      {
        agentTargetId: "target-codex",
        createdAt,
        enabled: false,
        id: "preference-disabled",
        skillUnitId: "skill-2",
        updatedAt: createdAt
      }
    ]);

    await expect(createTargetRepository(db).list()).resolves.toEqual([
      {
        createdAt: "2026-06-21T00:00:00.000Z",
        enabled: true,
        id: "target-codex",
        name: "Codex",
        normalizedPath: "/Users/test/.codex/skills",
        path: "/Users/test/.codex/skills",
        scanMessage: null,
        selectedSkills: [],
        skillPreferences: [
          {
            enabled: false,
            id: "skill-2",
            name: "Release Notes",
            repository: "Project skills"
          }
        ],
        skillCount: 0,
        scope: "global",
        status: "registered",
        type: "codex",
        updatedAt: "2026-06-21T00:00:00.000Z"
      },
      {
        createdAt: "2026-06-21T00:00:00.000Z",
        enabled: true,
        id: "target-project",
        name: "Local project",
        normalizedPath: "/Users/test/project/.codex/skills",
        path: "/Users/test/project/.codex/skills",
        scanMessage: null,
        selectedSkills: [
          { id: "skill-2", name: "Release Notes", repository: "Project skills" },
          { id: "skill-1", name: "Review Bot", repository: "Project skills" }
        ],
        skillPreferences: [
          {
            enabled: true,
            id: "skill-2",
            name: "Release Notes",
            repository: "Project skills"
          },
          {
            enabled: true,
            id: "skill-1",
            name: "Review Bot",
            repository: "Project skills"
          }
        ],
        skillCount: 2,
        scope: "global",
        status: "registered",
        type: "custom-directory",
        updatedAt: "2026-06-21T00:00:00.000Z"
      }
    ]);
  });

  it("counts registered targets independently of list pagination", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-21T00:00:00.000Z");

    await db.insert(agentTargets).values(
      Array.from({ length: 4 }, (_, index) => ({
        createdAt,
        enabled: index !== 3,
        id: `target-${index}`,
        name: `Target ${index}`,
        normalizedPath: `/Users/test/.targets/${index}`,
        path: `/Users/test/.targets/${index}`,
        type: "custom-directory",
        updatedAt: createdAt
      }))
    );

    await expect(createTargetRepository(db).count()).resolves.toBe(4);
  });

  it("deletes custom directory targets and their skill preferences without deleting install history", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-21T00:00:00.000Z");

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
      id: "repo-1",
      localCachePath: "/tmp/team-skills",
      name: "Team skills repository",
      providerId: "local-git",
      remoteUrl: "/tmp/team-skills",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values({
      createdAt,
      description: "Reviews pull requests.",
      discoveryMethod: "manifest",
      entryPath: "skills/review-bot/SKILL.md",
      id: "skill-1",
      license: "MIT",
      name: "Review Bot",
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
    await db.insert(skillTargetPreferences).values([
      {
        agentTargetId: "target-project",
        createdAt,
        enabled: true,
        id: "preference-delete",
        skillUnitId: "skill-1",
        updatedAt: createdAt
      },
      {
        agentTargetId: "target-keep",
        createdAt,
        enabled: true,
        id: "preference-keep",
        skillUnitId: "skill-1",
        updatedAt: createdAt
      }
    ]);
    await db.insert(installInstances).values({
      agentTargetId: "target-project",
      installedAt: createdAt,
      installedCommitSha: "abcdef123456",
      installedPath: "/Users/test/project/.codex/skills/review-bot",
      skillUnitId: "skill-1",
      skillVersionId: "version-1",
      id: "install-1",
      status: "installed",
      targetSnapshotJson: '{"name":"Project target"}',
      updatedAt: createdAt
    });

    await createTargetRepository(db).deleteTargets(["target-project"]);

    await expect(db.select().from(agentTargets)).resolves.toMatchObject([{ id: "target-keep" }]);
    await expect(db.select().from(skillTargetPreferences)).resolves.toMatchObject([
      { agentTargetId: "target-keep", id: "preference-keep" }
    ]);
    await expect(db.select().from(installInstances)).resolves.toMatchObject([
      { agentTargetId: "target-project", id: "install-1" }
    ]);
  });

  it("rejects deletion when any target id resolves to a built-in system target", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-21T00:00:00.000Z");

    await db.insert(agentTargets).values([
      {
        createdAt,
        enabled: true,
        id: "system-codex",
        name: "Codex",
        normalizedPath: "/Users/test/.codex/skills",
        path: "/Users/test/.codex/skills",
        type: "codex",
        updatedAt: createdAt
      },
      {
        createdAt,
        enabled: true,
        id: "target-project",
        name: "Project target",
        normalizedPath: "/Users/test/project/.codex/skills",
        path: "/Users/test/project/.codex/skills",
        type: "custom-directory",
        updatedAt: createdAt
      }
    ]);

    await expect(
      createTargetRepository(db).deleteTargets(["system-codex", "target-project"])
    ).rejects.toThrow("System built-in targets cannot be deleted.");
    await expect(db.select().from(agentTargets)).resolves.toHaveLength(2);
  });

  it("ignores blank and unknown target ids when deleting targets", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-21T00:00:00.000Z");

    await db.insert(agentTargets).values({
      createdAt,
      enabled: true,
      id: "target-project",
      name: "Project target",
      normalizedPath: "/Users/test/project/.codex/skills",
      path: "/Users/test/project/.codex/skills",
      type: "custom-directory",
      updatedAt: createdAt
    });

    await createTargetRepository(db).deleteTargets(["", "missing-target"]);

    await expect(
      db.select().from(agentTargets).where(eq(agentTargets.id, "target-project"))
    ).resolves.toHaveLength(1);
  });

  it("preserves existing target scope when scan results update a registered target", async () => {
    const db = createDbClient(":memory:");
    const repository = createTargetRepository(db);
    const createdAt = new Date("2026-06-21T00:00:00.000Z");

    await db.insert(agentTargets).values({
      createdAt,
      enabled: true,
      id: "target-design-only",
      name: "Design scratch",
      normalizedPath: "/Users/test/design/.codex/skills",
      path: "/Users/test/design/.codex/skills",
      scope: "independent",
      type: "custom-directory",
      updatedAt: createdAt
    });

    await repository.saveScannedTargets(
      [
        {
          detectionMessage: "Target directory exists and is writable.",
          id: "target-design-only",
          name: "Design scratch",
          normalizedPath: "/Users/test/design/.codex/skills",
          path: "/Users/test/design/.codex/skills",
          status: "detected",
          type: "custom-directory"
        }
      ],
      new Date("2026-06-23T00:00:00.000Z")
    );

    await expect(repository.list()).resolves.toMatchObject([
      {
        id: "target-design-only",
        scanMessage: "Target directory exists and is writable.",
        scope: "independent",
        status: "detected"
      }
    ]);
  });
});
