import { describe, expect, it } from "vitest";

import { createDbClient } from "../../db/client";
import { agentTargets, providers, repositories, skillUnits, skillVersions } from "../../db/schema";
import { getNavigationBadgeCounts } from "./navigation-badges";

describe("navigation badge IPC handlers", () => {
  it("returns aggregate badge counts without loading paged list results", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-22T00:00:00.000Z");

    await db.insert(providers).values({
      configJson: "{}",
      createdAt,
      id: "github",
      name: "GitHub",
      type: "github",
      updatedAt: createdAt
    });
    await db.insert(repositories).values([
      {
        configJson: JSON.stringify({ enabled: true }),
        createdAt,
        defaultBranch: "main",
        id: "repo-1",
        lastScannedCommitSha: "abcdef123456",
        localCachePath: "~/.skills-manager/cache/team-skills",
        name: "Team skills",
        providerId: "github",
        remoteUrl: "git@github.com:team/skills.git",
        updatedAt: createdAt
      },
      {
        configJson: JSON.stringify({ enabled: false }),
        createdAt,
        defaultBranch: "main",
        id: "repo-disabled",
        lastScannedCommitSha: "abcdef123456",
        localCachePath: "~/.skills-manager/cache/disabled",
        name: "Disabled skills",
        providerId: "github",
        remoteUrl: "git@github.com:team/disabled.git",
        updatedAt: createdAt
      }
    ]);
    await db.insert(skillUnits).values([
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/review-bot/SKILL.md",
        id: "skill-1",
        name: "Review Bot",
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
        name: "Release Notes",
        repositoryId: "repo-1",
        rootPath: "skills/release-notes",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/disabled/SKILL.md",
        id: "skill-disabled",
        name: "Disabled",
        repositoryId: "repo-disabled",
        rootPath: "skills/disabled",
        status: "ready",
        updatedAt: createdAt
      }
    ]);
    await db.insert(skillVersions).values([
      {
        commitSha: "abcdef123456",
        createdAt,
        id: "version-1",
        metadataSnapshotJson: JSON.stringify({ skillKey: "review-bot", tags: [] }),
        skillUnitId: "skill-1"
      },
      {
        commitSha: "fedcba654321",
        createdAt,
        id: "version-1-new",
        metadataSnapshotJson: JSON.stringify({ skillKey: "review-bot", tags: [] }),
        skillUnitId: "skill-1"
      },
      {
        commitSha: "abcdef123456",
        createdAt,
        id: "version-2",
        metadataSnapshotJson: JSON.stringify({ skillKey: "release-notes", tags: [] }),
        skillUnitId: "skill-2"
      },
      {
        commitSha: "abcdef123456",
        createdAt,
        id: "version-disabled",
        metadataSnapshotJson: JSON.stringify({ skillKey: "disabled", tags: [] }),
        skillUnitId: "skill-disabled"
      }
    ]);
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
    await expect(getNavigationBadgeCounts(db)).resolves.toEqual({
      counts: {
        repositories: 2,
        skills: 2,
        targets: 1
      }
    });
  });
});
