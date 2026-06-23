import { describe, expect, it } from "vitest";

import { createDbClient } from "../client";
import {
  agentTargets,
  providers,
  repositories,
  skillTargetPreferences,
  skillUnits,
  skillVersions
} from "../schema";
import { createSkillRepository } from "./skillRepository";

describe("createSkillRepository", () => {
  it("lists indexed skills with repository names and latest commit versions", async () => {
    const db = createDbClient(":memory:");
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
      lastScannedCommitSha: "abcdef123456",
      localCachePath: "~/.skills-manager/cache/team-skills",
      name: "Team skills",
      providerId: "github",
      remoteUrl: "git@github.com:team/skills.git",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values({
      createdAt,
      description: "Reviews pull requests from SKILL.md frontmatter.",
      discoveryMethod: "convention",
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
      metadataSnapshotJson: JSON.stringify({
        description: "Outdated snapshot description.",
        skillKey: "skills-review-bot",
        tags: ["review", "git"]
      }),
      skillUnitId: "skill-1"
    });
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
        id: "target-disabled",
        name: "Disabled target",
        normalizedPath: "/Users/test/.disabled/skills",
        path: "/Users/test/.disabled/skills",
        type: "custom-directory",
        updatedAt: createdAt
      }
    ]);
    await db.insert(skillTargetPreferences).values([
      {
        agentTargetId: "target-codex",
        createdAt,
        enabled: true,
        id: "preference-codex",
        skillUnitId: "skill-1",
        updatedAt: createdAt
      },
      {
        agentTargetId: "target-disabled",
        createdAt,
        enabled: false,
        id: "preference-disabled",
        skillUnitId: "skill-1",
        updatedAt: createdAt
      }
    ]);

    await expect(createSkillRepository(db).list()).resolves.toEqual([
      {
        description: "Reviews pull requests from SKILL.md frontmatter.",
        enabled: true,
        entry: "skills/review-bot/SKILL.md",
        id: "skill-1",
        name: "Review Bot",
        repository: "Team skills",
        repositoryId: "repo-1",
        skillId: "skills-review-bot",
        status: "ready",
        tags: ["review", "git"],
        targets: ["target-codex"],
        version: "abcdef1"
      }
    ]);
  });

  it("hides skills from disabled repositories", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-14T00:00:00.000Z");

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
        id: "repo-enabled",
        lastScannedCommitSha: "abcdef123456",
        localCachePath: "~/.skills-manager/cache/enabled",
        name: "Enabled source",
        providerId: "github",
        remoteUrl: "git@github.com:team/enabled.git",
        updatedAt: createdAt
      },
      {
        configJson: JSON.stringify({ enabled: false }),
        createdAt,
        defaultBranch: "main",
        id: "repo-disabled",
        lastScannedCommitSha: "abcdef123456",
        localCachePath: "~/.skills-manager/cache/disabled",
        name: "Disabled source",
        providerId: "github",
        remoteUrl: "git@github.com:team/disabled.git",
        updatedAt: createdAt
      }
    ]);
    await db.insert(skillUnits).values([
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/enabled/SKILL.md",
        id: "skill-enabled",
        name: "Enabled Skill",
        repositoryId: "repo-enabled",
        rootPath: "skills/enabled",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/disabled/SKILL.md",
        id: "skill-disabled",
        name: "Disabled Skill",
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
        id: "version-enabled",
        metadataSnapshotJson: JSON.stringify({ skillKey: "enabled-skill", tags: [] }),
        skillUnitId: "skill-enabled"
      },
      {
        commitSha: "abcdef123456",
        createdAt,
        id: "version-disabled",
        metadataSnapshotJson: JSON.stringify({ skillKey: "disabled-skill", tags: [] }),
        skillUnitId: "skill-disabled"
      }
    ]);

    const skills = await createSkillRepository(db).list();

    expect(skills.map((skill) => skill.id)).toEqual(["skill-enabled"]);
  });

  it("counts only skills from enabled repositories and deduplicates versions", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-14T00:00:00.000Z");

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
        id: "repo-enabled",
        lastScannedCommitSha: "abcdef123456",
        localCachePath: "~/.skills-manager/cache/enabled",
        name: "Enabled source",
        providerId: "github",
        remoteUrl: "git@github.com:team/enabled.git",
        updatedAt: createdAt
      },
      {
        configJson: JSON.stringify({ enabled: false }),
        createdAt,
        defaultBranch: "main",
        id: "repo-disabled",
        lastScannedCommitSha: "abcdef123456",
        localCachePath: "~/.skills-manager/cache/disabled",
        name: "Disabled source",
        providerId: "github",
        remoteUrl: "git@github.com:team/disabled.git",
        updatedAt: createdAt
      }
    ]);
    await db.insert(skillUnits).values([
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/one/SKILL.md",
        id: "skill-one",
        name: "One",
        repositoryId: "repo-enabled",
        rootPath: "skills/one",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/two/SKILL.md",
        id: "skill-two",
        name: "Two",
        repositoryId: "repo-enabled",
        rootPath: "skills/two",
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
        id: "version-one-old",
        metadataSnapshotJson: JSON.stringify({ skillKey: "one", tags: [] }),
        skillUnitId: "skill-one"
      },
      {
        commitSha: "fedcba654321",
        createdAt,
        id: "version-one-new",
        metadataSnapshotJson: JSON.stringify({ skillKey: "one", tags: [] }),
        skillUnitId: "skill-one"
      },
      {
        commitSha: "abcdef123456",
        createdAt,
        id: "version-two",
        metadataSnapshotJson: JSON.stringify({ skillKey: "two", tags: [] }),
        skillUnitId: "skill-two"
      },
      {
        commitSha: "abcdef123456",
        createdAt,
        id: "version-disabled",
        metadataSnapshotJson: JSON.stringify({ skillKey: "disabled", tags: [] }),
        skillUnitId: "skill-disabled"
      }
    ]);

    await expect(createSkillRepository(db).count()).resolves.toBe(2);
  });
});
