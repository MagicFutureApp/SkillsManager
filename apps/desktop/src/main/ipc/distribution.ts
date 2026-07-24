import { ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import type {
  DistributionExecuteInput,
  DistributionExecuteConflictResolution,
  DistributionExecuteItemResult,
  DistributionExecuteResult,
  DistributionOperationType,
  DistributionPreviewInput,
  DistributionPreviewResult,
  DistributionPreviewItem,
  DistributionPreviewTriggerSource
} from "../../core/distribution/distribution-api.js";
import { createDistributionRepository } from "../../db/repositories/distributionRepository.js";
import { installInstances } from "../../db/schema.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";
import { expandHomePath, isSameOrChildPath, normalizeFilesystemPath } from "../path-utils.js";

type DistributionPathInspectionOperations = {
  isDirectory: (candidatePath: string) => Promise<boolean>;
  isFile: (candidatePath: string) => Promise<boolean>;
  pathExists: (candidatePath: string) => Promise<boolean>;
};
type DistributionPreviewOperations = DistributionPathInspectionOperations & {
  now: () => Date;
};
type DistributionExecuteOperations = DistributionPreviewOperations & {
  copyDirectory: (sourcePath: string, targetPath: string) => Promise<void>;
  ensureDirectory: (directoryPath: string) => Promise<void>;
  removePath: (candidatePath: string) => Promise<void>;
};

export type {
  DistributionExecuteInput,
  DistributionExecuteResult,
  DistributionPreviewInput,
  DistributionPreviewResult
};

export const previewDistribution = async (
  db: DbClient,
  input: DistributionPreviewInput,
  operations: Partial<DistributionPreviewOperations> = defaultPreviewOperations
): Promise<DistributionPreviewResult> => {
  const previewOperations: DistributionPreviewOperations = {
    ...defaultPreviewOperations,
    ...operations
  };
  const distributionRepository = createDistributionRepository(db);
  const preview = await distributionRepository.createPreview(
    normalizeDistributionPreviewInput(input),
    previewOperations.now()
  );

  return reconcileSkippedPreviewItems(preview, previewOperations);
};

export const executeDistribution = async (
  db: DbClient,
  input: DistributionExecuteInput,
  operations: Partial<DistributionExecuteOperations> = defaultExecuteOperations
): Promise<DistributionExecuteResult> => {
  const executeOperations: DistributionExecuteOperations = {
    ...defaultExecuteOperations,
    ...operations
  };
  const normalizedInput = normalizeDistributionExecuteInput(input);
  const preview = await previewDistribution(
    db,
    {
      skillUnitIds: normalizedInput.skillUnitIds,
      triggerSource: normalizedInput.triggerSource ?? "skills_bulk"
    },
    {
      isDirectory: executeOperations.isDirectory,
      isFile: executeOperations.isFile,
      now: executeOperations.now,
      pathExists: executeOperations.pathExists
    }
  );
  const conflictResolutions = buildConflictResolutionMap(normalizedInput.conflictResolutions ?? []);
  const seenTargetPaths = new Set<string>();
  const summary = createEmptyExecuteSummary();
  const results: DistributionExecuteItemResult[] = [];

  for (const item of preview.items) {
    const result = await executePreviewItem({
      conflictResolutions,
      db,
      item,
      now: executeOperations.now(),
      operations: executeOperations,
      seenTargetPaths
    });

    results.push(result);
    incrementExecuteSummary(summary, result.result);
  }

  return {
    items: results,
    preview,
    summary
  };
};

export const registerDistributionIpc = (db: DbProvider): void => {
  ipcMain.handle(
    "distribution:preview",
    (_event, input: DistributionPreviewInput): Promise<DistributionPreviewResult> => {
      return previewDistribution(resolveDb(db), input);
    }
  );

  ipcMain.handle(
    "distribution:execute",
    (_event, input: DistributionExecuteInput): Promise<DistributionExecuteResult> => {
      return executeDistribution(resolveDb(db), input);
    }
  );
};

const normalizeDistributionPreviewInput = (
  input: DistributionPreviewInput
): DistributionPreviewInput => {
  const skillUnitIds = Array.from(
    new Set((input.skillUnitIds ?? []).map((id) => id.trim()).filter(Boolean))
  );

  if (!skillUnitIds.length) {
    throw new Error("At least one skill is required.");
  }

  return {
    skillUnitIds,
    triggerSource: normalizeTriggerSource(input.triggerSource)
  };
};

const normalizeTriggerSource = (
  triggerSource: DistributionPreviewTriggerSource
): DistributionPreviewTriggerSource => {
  if (triggerSource === "post_sync" || triggerSource === "skills_bulk") {
    return triggerSource;
  }

  return "skill_detail";
};

const normalizeDistributionExecuteInput = (
  input: DistributionExecuteInput
): DistributionExecuteInput => {
  return {
    conflictResolutions: (input.conflictResolutions ?? [])
      .map(
        (resolution): DistributionExecuteConflictResolution => ({
          agentTargetId: resolution.agentTargetId.trim(),
          previewItemId: resolution.previewItemId?.trim(),
          resolution: resolution.resolution === "overwrite" ? "overwrite" : "skip",
          skillUnitId: resolution.skillUnitId.trim(),
          targetPath: resolution.targetPath.trim()
        })
      )
      .filter(
        (resolution) => resolution.skillUnitId && resolution.agentTargetId && resolution.targetPath
      ),
    skillUnitIds: normalizeDistributionPreviewInput({
      skillUnitIds: input.skillUnitIds,
      triggerSource: input.triggerSource ?? "skills_bulk"
    }).skillUnitIds,
    triggerSource: input.triggerSource ? normalizeTriggerSource(input.triggerSource) : "skills_bulk"
  };
};

const executePreviewItem = async ({
  conflictResolutions,
  db,
  item,
  now,
  operations,
  seenTargetPaths
}: {
  conflictResolutions: Map<string, "overwrite" | "skip">;
  db: DbClient;
  item: DistributionPreviewItem;
  now: Date;
  operations: DistributionExecuteOperations;
  seenTargetPaths: Set<string>;
}): Promise<DistributionExecuteItemResult> => {
  let filesystemItem = resolvePreviewItemFilesystemPaths(item);

  if (filesystemItem.action === "skip") {
    const missingFilesAction = await resolveMissingInstalledSkillAction(filesystemItem, operations);

    if (!missingFilesAction) {
      return createItemResult(filesystemItem, "skipped", null);
    }

    filesystemItem = createMissingInstalledSkillItem(filesystemItem, missingFilesAction);
  }

  if (filesystemItem.action === "blocked") {
    return createItemResult(
      filesystemItem,
      "blocked",
      filesystemItem.reason ?? "Distribution item is blocked."
    );
  }

  const validation = await validateWritableItem(filesystemItem, operations, seenTargetPaths);

  if (validation.result === "blocked") {
    return createItemResult(filesystemItem, "blocked", validation.message);
  }

  const resolution = resolveConflictResolution(filesystemItem, conflictResolutions);

  if (
    (filesystemItem.action === "conflict" || validation.result === "conflict") &&
    resolution !== "overwrite"
  ) {
    return createItemResult(
      filesystemItem,
      "conflict",
      validation.message ?? filesystemItem.reason
    );
  }

  try {
    await operations.ensureDirectory(path.dirname(filesystemItem.targetPath));

    if (await operations.pathExists(filesystemItem.targetPath)) {
      await operations.removePath(filesystemItem.targetPath);
    }

    await operations.copyDirectory(filesystemItem.sourcePath, filesystemItem.targetPath);
    await upsertInstallInstance(db, filesystemItem, now, "installed", null);

    return createItemResult(
      filesystemItem,
      filesystemItem.action === "update" ? "updated" : "installed",
      null
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Distribution failed.";

    await upsertInstallInstance(db, filesystemItem, now, "failed", message);

    return createItemResult(filesystemItem, "failed", message);
  }
};

const missingInstalledSkillReason = "Installed skill files are missing from the target.";

const reconcileSkippedPreviewItems = async (
  preview: DistributionPreviewResult,
  operations: DistributionPathInspectionOperations
): Promise<DistributionPreviewResult> => {
  const items = await Promise.all(
    preview.items.map(async (item) => {
      if (item.action !== "skip") {
        return item;
      }

      const filesystemItem = resolvePreviewItemFilesystemPaths(item);
      const missingFilesAction = await resolveMissingInstalledSkillAction(
        filesystemItem,
        operations
      );

      return missingFilesAction ? createMissingInstalledSkillItem(item, missingFilesAction) : item;
    })
  );

  if (items.every((item, index) => item === preview.items[index])) {
    return preview;
  }

  return rebuildPreviewDerivedState(preview, items);
};

const resolveMissingInstalledSkillAction = async (
  item: DistributionPreviewItem,
  operations: DistributionPathInspectionOperations
): Promise<"install" | "update" | null> => {
  if (!(await operations.pathExists(item.targetPath))) {
    return "install";
  }

  if (
    !(await operations.isDirectory(item.targetPath)) ||
    !(await operations.isFile(path.join(item.targetPath, "SKILL.md")))
  ) {
    return "update";
  }

  return null;
};

const createMissingInstalledSkillItem = (
  item: DistributionPreviewItem,
  action: "install" | "update"
): DistributionPreviewItem => ({
  ...item,
  action,
  reason: missingInstalledSkillReason,
  status: "pending"
});

const rebuildPreviewDerivedState = (
  preview: DistributionPreviewResult,
  items: DistributionPreviewItem[]
): DistributionPreviewResult => {
  const actionCounts = {
    blocked: countPreviewActions(items, "blocked"),
    conflict: countPreviewActions(items, "conflict"),
    install: countPreviewActions(items, "install"),
    skip: countPreviewActions(items, "skip"),
    update: countPreviewActions(items, "update")
  };

  return {
    ...preview,
    items,
    operationType: resolvePreviewOperationType(items),
    status: actionCounts.blocked > 0 ? "blocked" : actionCounts.conflict > 0 ? "conflict" : "ready",
    summary: {
      ...preview.summary,
      actionCounts
    }
  };
};

const countPreviewActions = (
  items: DistributionPreviewItem[],
  action: DistributionPreviewItem["action"]
): number => items.filter((item) => item.action === action).length;

const resolvePreviewOperationType = (
  items: DistributionPreviewItem[]
): DistributionOperationType => {
  const writingActions = new Set(
    items
      .map((item) => item.action)
      .filter(
        (action): action is "install" | "update" => action === "install" || action === "update"
      )
  );

  return writingActions.size === 1 ? Array.from(writingActions)[0] : "mixed";
};

const resolvePreviewItemFilesystemPaths = (
  item: DistributionPreviewItem
): DistributionPreviewItem => {
  return {
    ...item,
    sourcePath: expandHomePath(item.sourcePath),
    targetPath: expandHomePath(item.targetPath),
    targetSnapshot: {
      ...item.targetSnapshot,
      path: expandHomePath(item.targetSnapshot.path)
    }
  };
};

const validateWritableItem = async (
  item: DistributionPreviewItem,
  operations: DistributionExecuteOperations,
  seenTargetPaths: Set<string>
): Promise<{ message: string | null; result: "blocked" | "conflict" | "ready" }> => {
  if (!item.sourcePath || !item.targetPath || !item.targetSnapshot.path) {
    return { message: "Source and target paths are required.", result: "blocked" };
  }

  const normalizedTargetPath = normalizeFilesystemPath(item.targetPath);
  const normalizedTargetRoot = normalizeFilesystemPath(item.targetSnapshot.path);
  const normalizedSourcePath = normalizeFilesystemPath(item.sourcePath);

  if (normalizedTargetPath === normalizedTargetRoot) {
    return { message: "Target path cannot be the target root.", result: "blocked" };
  }

  if (
    isSameOrChildPath(normalizedSourcePath, normalizedTargetPath) ||
    isSameOrChildPath(normalizedTargetPath, normalizedSourcePath)
  ) {
    return { message: "Source and target paths cannot contain each other.", result: "blocked" };
  }

  if (seenTargetPaths.has(normalizedTargetPath)) {
    return { message: "Duplicate target path in this distribution.", result: "blocked" };
  }

  seenTargetPaths.add(normalizedTargetPath);

  if (
    !(await operations.pathExists(item.sourcePath)) ||
    !(await operations.isDirectory(item.sourcePath))
  ) {
    return { message: "Source skill directory is missing.", result: "blocked" };
  }

  if (item.action === "install" && (await operations.pathExists(item.targetPath))) {
    return {
      message: "Target path already exists and is not owned by this skill.",
      result: "conflict"
    };
  }

  return { message: null, result: "ready" };
};

const upsertInstallInstance = async (
  db: DbClient,
  item: DistributionPreviewItem,
  now: Date,
  status: "failed" | "installed",
  lastError: string | null
): Promise<void> => {
  await db
    .insert(installInstances)
    .values({
      agentTargetId: item.agentTargetId,
      id: randomUUID(),
      installedAt: now,
      installedCommitSha: item.commitSha,
      installedPath: item.targetPath,
      lastError,
      skillUnitId: item.skillUnitId,
      skillVersionId: item.skillVersionId,
      status,
      targetSnapshotJson: JSON.stringify(item.targetSnapshot),
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [installInstances.skillUnitId, installInstances.agentTargetId],
      set: {
        installedCommitSha: item.commitSha,
        installedPath: item.targetPath,
        lastError,
        skillVersionId: item.skillVersionId,
        status,
        targetSnapshotJson: JSON.stringify(item.targetSnapshot),
        updatedAt: now
      }
    });
};

const buildConflictResolutionMap = (
  resolutions: NonNullable<DistributionExecuteInput["conflictResolutions"]>
): Map<string, "overwrite" | "skip"> => {
  const resolutionsByKey = new Map<string, "overwrite" | "skip">();

  resolutions.forEach((resolution) => {
    const value = resolution.resolution === "overwrite" ? "overwrite" : "skip";

    if (resolution.previewItemId) {
      resolutionsByKey.set(`preview:${resolution.previewItemId}`, value);
    }

    resolutionsByKey.set(
      createResolutionKey(resolution.skillUnitId, resolution.agentTargetId, resolution.targetPath),
      value
    );
  });

  return resolutionsByKey;
};

const resolveConflictResolution = (
  item: DistributionPreviewItem,
  resolutions: Map<string, "overwrite" | "skip">
): "overwrite" | "skip" => {
  return (
    resolutions.get(`preview:${item.id}`) ??
    resolutions.get(createResolutionKey(item.skillUnitId, item.agentTargetId, item.targetPath)) ??
    "skip"
  );
};

const createResolutionKey = (
  skillUnitId: string,
  agentTargetId: string,
  targetPath: string
): string => {
  return `${skillUnitId}\u0000${agentTargetId}\u0000${normalizeFilesystemPath(targetPath)}`;
};

const createEmptyExecuteSummary = () => ({
  blocked: 0,
  conflicts: 0,
  failed: 0,
  installed: 0,
  skipped: 0,
  updated: 0
});

const incrementExecuteSummary = (
  summary: ReturnType<typeof createEmptyExecuteSummary>,
  result: DistributionExecuteItemResult["result"]
): void => {
  if (result === "blocked") {
    summary.blocked += 1;
  } else if (result === "conflict") {
    summary.conflicts += 1;
  } else if (result === "failed") {
    summary.failed += 1;
  } else if (result === "installed") {
    summary.installed += 1;
  } else if (result === "skipped") {
    summary.skipped += 1;
  } else if (result === "updated") {
    summary.updated += 1;
  }
};

const createItemResult = (
  item: DistributionPreviewItem,
  result: DistributionExecuteItemResult["result"],
  errorMessage: string | null
): DistributionExecuteItemResult => {
  return {
    action: item.action,
    agentTargetId: item.agentTargetId,
    errorMessage,
    result,
    skillUnitId: item.skillUnitId,
    targetPath: item.targetPath
  };
};

const defaultPreviewOperations: DistributionPreviewOperations = {
  async isDirectory(candidatePath) {
    try {
      return (await stat(candidatePath)).isDirectory();
    } catch {
      return false;
    }
  },
  async isFile(candidatePath) {
    try {
      return (await stat(candidatePath)).isFile();
    } catch {
      return false;
    }
  },
  now: () => new Date(),
  async pathExists(candidatePath) {
    try {
      await stat(candidatePath);
      return true;
    } catch {
      return false;
    }
  }
};

const defaultExecuteOperations: DistributionExecuteOperations = {
  ...defaultPreviewOperations,
  async copyDirectory(sourcePath, targetPath) {
    await cp(sourcePath, targetPath, { recursive: true });
  },
  async ensureDirectory(directoryPath) {
    await mkdir(directoryPath, { recursive: true });
  },
  async removePath(candidatePath) {
    await rm(candidatePath, { force: true, recursive: true });
  }
};
