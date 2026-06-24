import { describe, expect, it, vi } from "vitest";

import type { SystemTargetRecord, TargetScanRecord } from "../../core/targets/target-api";
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
