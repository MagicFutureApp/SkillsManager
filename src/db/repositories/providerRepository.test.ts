import { describe, expect, it } from "vitest";

import { createDbClient } from "../client";
import { providers } from "../schema";
import { createProviderRepository } from "./providerRepository";

describe("createProviderRepository", () => {
  it("returns real provider rows from SQLite without demo fallbacks", async () => {
    const db = createDbClient(":memory:");
    const createdAt = new Date("2026-06-08T00:00:00.000Z");

    await db.insert(providers).values({
      configJson: JSON.stringify({
        authMode: "Local filesystem",
        connected: true,
        diagnostic: "git worktree probe: reachable",
        discoveryPatterns: ["skills/*/SKILL.md"],
        discoveryStrategy: "convention scan",
        enabled: true,
        notes: "Real local source configured by the user.",
        priority: 1,
        status: "connected"
      }),
      createdAt,
      id: "local-git",
      name: "Local Git",
      type: "local_git",
      updatedAt: createdAt
    });

    await expect(createProviderRepository(db).list()).resolves.toEqual([
      {
        configJson: JSON.stringify({
          authMode: "Local filesystem",
          connected: true,
          diagnostic: "git worktree probe: reachable",
          discoveryPatterns: ["skills/*/SKILL.md"],
          discoveryStrategy: "convention scan",
          enabled: true,
          notes: "Real local source configured by the user.",
          priority: 1,
          status: "connected"
        }),
        createdAt: "2026-06-08T00:00:00.000Z",
        id: "local-git",
        name: "Local Git",
        type: "local_git",
        updatedAt: "2026-06-08T00:00:00.000Z"
      }
    ]);
  });

  it("returns an empty array when the providers table is empty", async () => {
    const db = createDbClient(":memory:");

    await expect(createProviderRepository(db).list()).resolves.toEqual([]);
  });
});
