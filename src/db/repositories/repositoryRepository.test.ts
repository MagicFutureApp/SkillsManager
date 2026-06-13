import { describe, expect, it } from "vitest";

import type { CreateRepositoryInput } from "../../core/repositories/repository-api";
import { createDbClient } from "../client";
import { providers, repositories, skillUnits } from "../schema";
import { createRepositoryRepository } from "./repositoryRepository";

describe("createRepositoryRepository", () => {
  it("returns real repository rows from SQLite with derived display metadata", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-08T00:00:00.000Z");

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
      localCachePath: "D:/Users/andrewliang/.skills-manager/cache/skills-manager",
      name: "skills-manager",
      providerId: "local-git",
      remoteUrl: "D:/code/skills-manager",
      updatedAt: createdAt
    });
    await db.insert(skillUnits).values([
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/one/SKILL.md",
        id: "skill-1",
        name: "one",
        repositoryId: "repo-1",
        rootPath: "skills/one",
        status: "ready",
        updatedAt: createdAt
      },
      {
        createdAt,
        discoveryMethod: "convention",
        entryPath: "skills/two/SKILL.md",
        id: "skill-2",
        name: "two",
        repositoryId: "repo-1",
        rootPath: "skills/two",
        status: "ready",
        updatedAt: createdAt
      }
    ]);

    const result = await createRepositoryRepository(db).list();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      branch: "main",
      id: "repo-1",
      lastScannedCommitSha: "abcdef123456",
      localCachePath: "D:/Users/andrewliang/.skills-manager/cache/skills-manager",
      name: "skills-manager",
      providerId: "local-git",
      remoteUrl: "D:/code/skills-manager",
      updatedAt: "2026-06-08T00:00:00.000Z"
    });
    expect(JSON.parse(result[0]?.configJson ?? "{}")).toMatchObject({
      enabled: true,
      patterns: ["skills/*/SKILL.md"],
      providerName: "Local Git",
      skillUnits: 2,
      status: "ready"
    });
  });

  it("returns an empty array when the repositories table is empty", async () => {
    const db = createDbClient(":memory:");

    await expect(createRepositoryRepository(db).list()).resolves.toEqual([]);
  });

  it("creates a source row and reads the saved form values back from SQLite", async () => {
    const db = createDbClient(":memory:");
    const repositoryRepository = createRepositoryRepository(db);
    const input: CreateRepositoryInput = {
      branch: "main",
      name: "huashu-design",
      note: "GitHub 测试源",
      patterns: ["skills/*/SKILL.md", "SKILL.md"],
      provider: "GitHub",
      remoteUrl: "https://github.com/alchaincyf/huashu-design"
    };

    const created = await repositoryRepository.create(input);
    const result = await repositoryRepository.list();

    expect(created).toMatchObject({
      branch: "main",
      name: "huashu-design",
      providerId: "github",
      remoteUrl: "https://github.com/alchaincyf/huashu-design"
    });
    expect(created.id).toMatch(/^repo-/);
    expect(created.localCachePath).toBe("~/.skills-manager/cache/huashu-design");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      branch: "main",
      id: created.id,
      lastScannedCommitSha: null,
      localCachePath: "~/.skills-manager/cache/huashu-design",
      name: "huashu-design",
      providerId: "github",
      remoteUrl: "https://github.com/alchaincyf/huashu-design"
    });
    expect(JSON.parse(result[0]?.configJson ?? "{}")).toMatchObject({
      enabled: true,
      note: "GitHub 测试源",
      patterns: ["skills/*/SKILL.md", "SKILL.md"],
      providerName: "GitHub",
      skillUnits: 0,
      status: "review"
    });
  });
});
