import { describe, expect, it } from "vitest";

import { createDbClient } from "../client";
import {
  agentTargets,
  providers,
  repositories,
  skillTargetPreferences,
  skillUnits
} from "../schema";
import { createTargetRepository } from "./targetRepository";

describe("createTargetRepository", () => {
  it("saves scanned system targets into database records and updates them by type and path", async () => {
    const db = createDbClient(":memory:");
    const repository = createTargetRepository(db);
    const firstScanAt = new Date("2026-06-23T00:00:00.000Z");
    const secondScanAt = new Date("2026-06-23T01:00:00.000Z");

    await repository.saveScannedTargets(
      [
        {
          defaultInstallStrategy: "copy",
          executablePath: "/usr/local/bin/codex",
          id: "system-codex-cli",
          installPath: "/usr/local/bin/codex",
          name: "Codex CLI",
          normalizedPath: "/Users/test/.codex/skills",
          path: "/Users/test/.codex/skills",
          status: "detected",
          type: "codex-cli"
        },
        {
          defaultInstallStrategy: "copy",
          executablePath: null,
          id: "system-claude-code",
          installPath: null,
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
          defaultInstallStrategy: "copy",
          executablePath: "/opt/homebrew/bin/codex",
          id: "system-codex-cli-renamed",
          installPath: "/opt/homebrew/bin/codex",
          name: "Codex CLI",
          normalizedPath: "/Users/test/.codex/skills",
          path: "/Users/test/.codex/skills",
          status: "detected",
          type: "codex-cli"
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
        status: "missing",
        updatedAt: "2026-06-23T00:00:00.000Z"
      },
      {
        createdAt: "2026-06-23T00:00:00.000Z",
        enabled: true,
        id: "system-codex-cli",
        name: "Codex CLI",
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
        defaultInstallStrategy: "copy",
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
        defaultInstallStrategy: "copy",
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
        defaultInstallStrategy: "copy",
        enabled: true,
        id: "target-codex",
        name: "Codex",
        normalizedPath: "/Users/test/.codex/skills",
        path: "/Users/test/.codex/skills",
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
        defaultInstallStrategy: "copy",
        enabled: true,
        id: "target-project",
        name: "Local project",
        normalizedPath: "/Users/test/project/.codex/skills",
        path: "/Users/test/project/.codex/skills",
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
        defaultInstallStrategy: "copy",
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
});
