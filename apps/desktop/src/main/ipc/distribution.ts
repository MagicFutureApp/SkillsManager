import { ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import type {
  DistributionExecuteInput,
  DistributionExecuteConflictResolution,
  DistributionExecuteItemResult,
  DistributionExecuteResult,
  DistributionPreviewInput,
  DistributionPreviewResult,
  DistributionPreviewItem,
  DistributionPreviewTriggerSource
} from "../../core/distribution/distribution-api.js";
import { createDistributionRepository } from "../../db/repositories/distributionRepository.js";
import { installInstances } from "../../db/schema.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";
import { expandHomePath, isSameOrChildPath, normalizeFilesystemPath } from "../path-utils.js";

type DistributionPreviewOperations = {
  now: () => Date;
};
type DistributionExecuteOperations = DistributionPreviewOperations & {
  copyDirectory: (sourcePath: string, targetPath: string) => Promise<void>;
  ensureDirectory: (directoryPath: string) => Promise<void>;
  isDirectory: (candidatePath: string) => Promise<boolean>;
  pathExists: (candidatePath: string) => Promise<boolean>;
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
  operations: DistributionPreviewOperations = {
    now: () => new Date()
  }
): Promise<DistributionPreviewResult> => {
  const distributionRepository = createDistributionRepository(db);

  return distributionRepository.createPreview(
    normalizeDistributionPreviewInput(input),
    operations.now()
  );
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
    { now: executeOperations.now }
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
  const filesystemItem = resolvePreviewItemFilesystemPaths(item);

  if (item.action === "skip") {
    return createItemResult(filesystemItem, "skipped", null);
  }

  if (item.action === "blocked") {
    return createItemResult(
      filesystemItem,
      "blocked",
      item.reason ?? "Distribution item is blocked."
    );
  }

  const validation = await validateWritableItem(filesystemItem, operations, seenTargetPaths);

  if (validation.result === "blocked") {
    return createItemResult(filesystemItem, "blocked", validation.message);
  }

  const resolution = resolveConflictResolution(item, conflictResolutions);

  if (
    (item.action === "conflict" || validation.result === "conflict") &&
    resolution !== "overwrite"
  ) {
    return createItemResult(filesystemItem, "conflict", validation.message ?? item.reason);
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
      item.action === "update" ? "updated" : "installed",
      null
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Distribution failed.";

    await upsertInstallInstance(db, filesystemItem, now, "failed", message);

    return createItemResult(filesystemItem, "failed", message);
  }
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

const defaultExecuteOperations: DistributionExecuteOperations = {
  async copyDirectory(sourcePath, targetPath) {
    await cp(sourcePath, targetPath, { recursive: true });
  },
  async ensureDirectory(directoryPath) {
    await mkdir(directoryPath, { recursive: true });
  },
  async isDirectory(candidatePath) {
    try {
      return (await stat(candidatePath)).isDirectory();
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
  },
  async removePath(candidatePath) {
    await rm(candidatePath, { force: true, recursive: true });
  }
};
