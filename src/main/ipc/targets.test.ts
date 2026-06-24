import { describe, expect, it, vi } from "vitest";

import type { SystemTargetRecord } from "../../core/targets/target-api";
import { createDbClient } from "../../db/client";
import { agentTargets } from "../../db/schema";
import { getTargets, rescanTargets } from "./targets";

describe("target IPC handlers", () => {
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
        executablePath: "/usr/local/bin/codex",
        id: "system-codex-cli",
        installPath: "/usr/local/bin/codex",
        name: "Codex CLI",
        normalizedPath: "/Users/test/.codex/skills",
        path: "/Users/test/.codex/skills",
        status: "detected",
        type: "codex-cli"
      }
    ];
    const scanSystemTargets = vi.fn().mockResolvedValue(scannedTargets);

    const result = await rescanTargets(db, {
      now: () => new Date("2026-06-23T01:00:00.000Z"),
      scanSystemTargets
    });

    expect(scanSystemTargets).toHaveBeenCalledOnce();
    expect(result).toEqual({
      registeredTargets: [
        {
          createdAt: "2026-06-23T01:00:00.000Z",
          defaultInstallStrategy: "copy",
          enabled: true,
          id: "system-codex-cli",
          name: "Codex CLI",
          normalizedPath: "/Users/test/.codex/skills",
          path: "/Users/test/.codex/skills",
          scope: "global",
          selectedSkills: [],
          skillCount: 0,
          skillPreferences: [],
          status: "detected",
          type: "codex-cli",
          updatedAt: "2026-06-23T01:00:00.000Z"
        }
      ]
    });
  });
});
