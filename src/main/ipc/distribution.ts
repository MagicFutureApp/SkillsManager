import { ipcMain } from "electron";

import type {
  DistributionPreviewInput,
  DistributionPreviewPlan,
  DistributionPreviewTriggerSource
} from "../../core/distribution/distribution-api.js";
import { createDistributionRepository } from "../../db/repositories/distributionRepository.js";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider.js";

export type DistributionPreviewResult = DistributionPreviewPlan;

type DistributionPreviewOperations = {
  now: () => Date;
};

export type { DistributionPreviewInput };

export const previewDistributionPlan = async (
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

export const registerDistributionIpc = (db: DbProvider): void => {
  ipcMain.handle(
    "distribution:preview",
    (_event, input: DistributionPreviewInput): Promise<DistributionPreviewResult> => {
      return previewDistributionPlan(resolveDb(db), input);
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
  if (triggerSource === "skills_bulk") {
    return "skills_bulk";
  }

  return "skill_detail";
};
