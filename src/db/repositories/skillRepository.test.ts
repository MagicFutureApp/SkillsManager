import { describe, expect, it } from "vitest";

import { createDbClient } from "../client";
import { providers, repositories, skillUnits, skillVersions } from "../schema";
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
      discoveryMethod: "convention",
      entryPath: "skills/review-bot/SKILL.md",
      id: "skill-1",
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
        description: "Reviews pull requests.",
        skillKey: "skills-review-bot",
        tags: ["review", "git"]
      }),
      skillUnitId: "skill-1"
    });

    await expect(createSkillRepository(db).list()).resolves.toEqual([
      {
        description: "Reviews pull requests.",
        enabled: true,
        entry: "skills/review-bot/SKILL.md",
        id: "skill-1",
        name: "Review Bot",
        repository: "Team skills",
        repositoryId: "repo-1",
        skillId: "skills-review-bot",
        status: "ready",
        tags: ["review", "git"],
        targets: [],
        version: "abcdef1"
      }
    ]);
  });
});
