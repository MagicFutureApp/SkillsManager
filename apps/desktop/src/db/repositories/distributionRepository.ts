import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import path from "node:path";

import type {
  DistributionAction,
  DistributionPreviewInput,
  DistributionPreviewItem,
  DistributionPreviewResult,
  DistributionPreviewSummary
} from "../../core/distribution/distribution-api";
import { resolveSkillKey } from "../../core/skills/skill-utils";
import type { createDbClient } from "../client";
import {
  agentTargets,
  installInstances,
  repositories,
  skillTargetPreferences,
  skillUnits,
  skillVersions
} from "../schema";

type DbClient = ReturnType<typeof createDbClient>;

type SkillVersionRow = {
  commitSha: string;
  metadataSnapshotJson: string;
  repositoryCachePath: string;
  skillEntryPath: string;
  skillName: string;
  skillRootPath: string;
  skillUnitId: string;
  skillVersionCreatedAt: Date;
  skillVersionId: string;
};

type TargetPreferenceRow = {
  agentTargetId: string;
  targetEnabled: boolean;
  targetName: string;
  targetNormalizedPath: string;
  targetPath: string;
  targetType: string;
};

type InstalledInstanceRow = {
  agentTargetId: string;
  installedCommitSha: string;
  installedPath: string;
  skillUnitId: string;
  skillVersionId: string;
  status: string;
  updatedAt: Date;
};

export const createDistributionRepository = (db: DbClient) => {
  return {
    async createPreview(input: DistributionPreviewInput, createdAt = new Date()) {
      const skillUnitIds = normalizeSkillUnitIds(input.skillUnitIds);

      if (!skillUnitIds.length) {
        throw new Error("At least one skill is required.");
      }

      const skillsById = await getLatestSkillVersionsBySkillId(db, skillUnitIds);
      const targetPreferencesBySkillId = await getTargetPreferencesBySkillId(db, skillUnitIds);
      const installedInstances = await getInstalledInstances(db);
      const installedBySkillTarget = buildInstalledBySkillTarget(installedInstances);
      const installedByTargetPath = buildInstalledByTargetPath(installedInstances);
      const items = buildPreviewItems({
        createdAt,
        installedBySkillTarget,
        installedByTargetPath,
        skillUnitIds,
        skillsById,
        targetPreferencesBySkillId
      });
      const summary = summarizePreviewItems(items);
      const operationType = resolveOperationType(items);
      const status =
        summary.actionCounts.blocked > 0
          ? "blocked"
          : summary.actionCounts.conflict > 0
            ? "conflict"
            : "ready";
      const previewId = randomUUID();
      const preview: DistributionPreviewResult = {
        createdAt: createdAt.toISOString(),
        id: previewId,
        items,
        operationType,
        status,
        summary,
        triggerSource: input.triggerSource
      };

      return preview;
    }
  };
};

const normalizeSkillUnitIds = (skillUnitIds: string[]): string[] => {
  return Array.from(new Set(skillUnitIds.map((id) => id.trim()).filter(Boolean)));
};

const getLatestSkillVersionsBySkillId = async (
  db: DbClient,
  skillUnitIds: string[]
): Promise<Map<string, SkillVersionRow>> => {
  const rows = await db
    .select({
      commitSha: skillVersions.commitSha,
      metadataSnapshotJson: skillVersions.metadataSnapshotJson,
      repositoryCachePath: repositories.localCachePath,
      skillEntryPath: skillUnits.entryPath,
      skillName: skillUnits.name,
      skillRootPath: skillUnits.rootPath,
      skillUnitId: skillUnits.id,
      skillVersionCreatedAt: skillVersions.createdAt,
      skillVersionId: skillVersions.id
    })
    .from(skillUnits)
    .innerJoin(repositories, eq(repositories.id, skillUnits.repositoryId))
    .innerJoin(skillVersions, eq(skillVersions.skillUnitId, skillUnits.id))
    .where(inArray(skillUnits.id, skillUnitIds))
    .orderBy(asc(skillVersions.createdAt));
  const rowsBySkillId = new Map<string, SkillVersionRow>();

  rows.forEach((row) => rowsBySkillId.set(row.skillUnitId, row));

  return rowsBySkillId;
};

const getTargetPreferencesBySkillId = async (
  db: DbClient,
  skillUnitIds: string[]
): Promise<Map<string, TargetPreferenceRow[]>> => {
  const rows = await db
    .select({
      agentTargetId: agentTargets.id,
      targetEnabled: agentTargets.enabled,
      skillUnitId: skillTargetPreferences.skillUnitId,
      targetName: agentTargets.name,
      targetNormalizedPath: agentTargets.normalizedPath,
      targetPath: agentTargets.path,
      targetType: agentTargets.type
    })
    .from(skillTargetPreferences)
    .innerJoin(agentTargets, eq(agentTargets.id, skillTargetPreferences.agentTargetId))
    .where(
      and(
        inArray(skillTargetPreferences.skillUnitId, skillUnitIds),
        eq(skillTargetPreferences.enabled, true)
      )
    )
    .orderBy(asc(agentTargets.name));
  const rowsBySkillId = new Map<string, TargetPreferenceRow[]>();

  rows.forEach((row) => {
    const targets = rowsBySkillId.get(row.skillUnitId) ?? [];

    targets.push(row);
    rowsBySkillId.set(row.skillUnitId, targets);
  });

  return rowsBySkillId;
};

const getInstalledInstances = async (db: DbClient): Promise<InstalledInstanceRow[]> => {
  return db
    .select({
      agentTargetId: installInstances.agentTargetId,
      installedCommitSha: installInstances.installedCommitSha,
      installedPath: installInstances.installedPath,
      skillUnitId: installInstances.skillUnitId,
      skillVersionId: installInstances.skillVersionId,
      status: installInstances.status,
      updatedAt: installInstances.updatedAt
    })
    .from(installInstances)
    .orderBy(asc(installInstances.updatedAt));
};

const buildInstalledBySkillTarget = (
  installedInstances: InstalledInstanceRow[]
): Map<string, InstalledInstanceRow> => {
  const installedBySkillTarget = new Map<string, InstalledInstanceRow>();

  installedInstances.forEach((instance) => {
    if (instance.status !== "installed") {
      return;
    }

    installedBySkillTarget.set(
      createSkillTargetKey(instance.skillUnitId, instance.agentTargetId),
      instance
    );
  });

  return installedBySkillTarget;
};

const buildInstalledByTargetPath = (
  installedInstances: InstalledInstanceRow[]
): Map<string, InstalledInstanceRow> => {
  const installedByTargetPath = new Map<string, InstalledInstanceRow>();

  installedInstances.forEach((instance) => {
    if (instance.status !== "installed") {
      return;
    }

    installedByTargetPath.set(
      createTargetPathKey(instance.agentTargetId, instance.installedPath),
      instance
    );
  });

  return installedByTargetPath;
};

const buildPreviewItems = ({
  installedBySkillTarget,
  installedByTargetPath,
  skillUnitIds,
  skillsById,
  targetPreferencesBySkillId
}: {
  createdAt: Date;
  installedBySkillTarget: Map<string, InstalledInstanceRow>;
  installedByTargetPath: Map<string, InstalledInstanceRow>;
  skillUnitIds: string[];
  skillsById: Map<string, SkillVersionRow>;
  targetPreferencesBySkillId: Map<string, TargetPreferenceRow[]>;
}): DistributionPreviewItem[] => {
  return skillUnitIds.flatMap((skillUnitId) => {
    const skill = skillsById.get(skillUnitId);

    if (!skill) {
      return [];
    }

    const targets = targetPreferencesBySkillId.get(skillUnitId) ?? [];
    const skillKey = resolveSkillKey(skill.metadataSnapshotJson, skill.skillRootPath);
    const sourcePath = joinStoredPath(skill.repositoryCachePath, skill.skillRootPath);

    return targets.map((target) => {
      const targetPath = joinStoredPath(target.targetPath, skillKey);
      const installedAtPath = installedByTargetPath.get(
        createTargetPathKey(target.agentTargetId, targetPath)
      );
      const installedForSkillTarget = installedBySkillTarget.get(
        createSkillTargetKey(skillUnitId, target.agentTargetId)
      );
      const classification = classifyPreviewItem({
        installedAtPath,
        installedForSkillTarget,
        skill,
        skillUnitId,
        target
      });

      return {
        action: classification.action,
        agentTargetId: target.agentTargetId,
        ...(classification.action === "conflict"
          ? {
              allowedResolutions: ["overwrite", "skip"] as const,
              defaultResolution: "overwrite" as const
            }
          : {}),
        commitSha: skill.commitSha,
        id: randomUUID(),
        reason: classification.reason,
        skillName: skill.skillName,
        skillUnitId,
        skillVersionId: skill.skillVersionId,
        sourcePath,
        status:
          classification.action === "blocked"
            ? "blocked"
            : classification.action === "skip"
              ? "skipped"
              : "pending",
        targetName: target.targetName,
        targetPath,
        targetSnapshot: {
          id: target.agentTargetId,
          name: target.targetName,
          normalizedPath: target.targetNormalizedPath,
          path: target.targetPath,
          type: target.targetType
        }
      };
    });
  });
};

const classifyPreviewItem = ({
  installedAtPath,
  installedForSkillTarget,
  skill,
  skillUnitId,
  target
}: {
  installedAtPath: InstalledInstanceRow | undefined;
  installedForSkillTarget: InstalledInstanceRow | undefined;
  skill: SkillVersionRow;
  skillUnitId: string;
  target: TargetPreferenceRow;
}): { action: DistributionAction; reason: string | null } => {
  if (!target.targetEnabled) {
    return {
      action: "blocked",
      reason: "Target is disabled."
    };
  }

  if (installedAtPath && installedAtPath.skillUnitId !== skillUnitId) {
    return {
      action: "conflict",
      reason: "Target path is already used by another skill."
    };
  }

  if (!installedForSkillTarget) {
    return {
      action: "install",
      reason: "Skill is not installed on this target."
    };
  }

  if (
    installedForSkillTarget.skillVersionId === skill.skillVersionId ||
    installedForSkillTarget.installedCommitSha === skill.commitSha
  ) {
    return {
      action: "skip",
      reason: "Selected skill version is already installed on this target."
    };
  }

  return {
    action: "update",
    reason: "Installed commit differs from selected skill version."
  };
};

const summarizePreviewItems = (items: DistributionPreviewItem[]): DistributionPreviewSummary => {
  const targetIds = new Set(items.map((item) => item.agentTargetId));
  const skillIds = new Set(items.map((item) => item.skillUnitId));

  return {
    actionCounts: {
      blocked: countActions(items, "blocked"),
      conflict: countActions(items, "conflict"),
      install: countActions(items, "install"),
      skip: countActions(items, "skip"),
      update: countActions(items, "update")
    },
    itemCount: items.length,
    skillCount: skillIds.size,
    targetCount: targetIds.size
  };
};

const countActions = (items: DistributionPreviewItem[], action: DistributionAction): number => {
  return items.filter((item) => item.action === action).length;
};

const resolveOperationType = (items: DistributionPreviewItem[]) => {
  const writingActions = new Set(
    items
      .map((item) => item.action)
      .filter(
        (action): action is "install" | "update" => action === "install" || action === "update"
      )
  );

  if (writingActions.size === 1) {
    return Array.from(writingActions)[0];
  }

  return "mixed";
};

const createSkillTargetKey = (skillUnitId: string, agentTargetId: string): string => {
  return `${skillUnitId}\u0000${agentTargetId}`;
};

const createTargetPathKey = (agentTargetId: string, targetPath: string): string => {
  return `${agentTargetId}\u0000${targetPath}`;
};

const joinStoredPath = (rootPath: string, childPath: string): string => {
  const childSegments = childPath === "." ? [] : childPath.split(/[\\/]+/).filter(Boolean);

  if (/^[A-Za-z]:[\\/]/.test(rootPath)) {
    return path.win32.join(rootPath, ...childSegments);
  }

  if (rootPath.startsWith("/")) {
    return path.posix.join(rootPath, ...childSegments);
  }

  return path.join(rootPath, ...childSegments);
};
