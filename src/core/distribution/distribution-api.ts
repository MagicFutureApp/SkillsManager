export type DistributionPreviewTriggerSource = "post_sync" | "skill_detail" | "skills_bulk";
export type DistributionAction = "blocked" | "conflict" | "install" | "skip" | "update";
export type DistributionConflictResolution = "overwrite" | "skip";
export type DistributionOperationType = "install" | "mixed" | "remove" | "update";

export type DistributionPreviewInput = {
  skillUnitIds: string[];
  triggerSource: DistributionPreviewTriggerSource;
};

export type DistributionPreviewSummary = {
  actionCounts: Record<DistributionAction, number>;
  itemCount: number;
  skillCount: number;
  targetCount: number;
};

export type DistributionTargetSnapshot = {
  id: string;
  name: string;
  normalizedPath: string;
  path: string;
  type: string;
};

export type DistributionPreviewItem = {
  action: DistributionAction;
  agentTargetId: string;
  allowedResolutions?: DistributionConflictResolution[];
  commitSha: string;
  defaultResolution?: DistributionConflictResolution;
  id: string;
  reason: string | null;
  skillName: string;
  skillUnitId: string;
  skillVersionId: string;
  sourcePath: string;
  status: "blocked" | "pending" | "skipped";
  targetName: string;
  targetPath: string;
  targetSnapshot: DistributionTargetSnapshot;
};

export type DistributionPreviewResult = {
  createdAt: string;
  id: string;
  items: DistributionPreviewItem[];
  operationType: DistributionOperationType;
  status: "blocked" | "conflict" | "ready";
  summary: DistributionPreviewSummary;
  triggerSource: DistributionPreviewTriggerSource;
};

export type DistributionExecuteConflictResolution = {
  agentTargetId: string;
  previewItemId?: string;
  resolution: DistributionConflictResolution;
  skillUnitId: string;
  targetPath: string;
};

export type DistributionExecuteInput = {
  conflictResolutions?: DistributionExecuteConflictResolution[];
  skillUnitIds: string[];
  triggerSource?: DistributionPreviewTriggerSource;
};

export type DistributionExecuteSummary = {
  blocked: number;
  conflicts: number;
  failed: number;
  installed: number;
  skipped: number;
  updated: number;
};

export type DistributionExecuteItemResult = {
  action: DistributionAction;
  agentTargetId: string;
  errorMessage: string | null;
  result: "blocked" | "conflict" | "failed" | "installed" | "skipped" | "updated";
  skillUnitId: string;
  targetPath: string;
};

export type DistributionExecuteResult = {
  items: DistributionExecuteItemResult[];
  preview: DistributionPreviewResult;
  summary: DistributionExecuteSummary;
};
