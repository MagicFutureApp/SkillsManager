export type DistributionPreviewTriggerSource = "skill_detail" | "skills_bulk";
export type DistributionPlanAction = "install" | "update" | "skip" | "conflict";
export type DistributionPlanStatus = "draft" | "ready";
export type DistributionOperationType = "install" | "update" | "remove" | "mixed";

export type DistributionPreviewInput = {
  skillUnitIds: string[];
  triggerSource: DistributionPreviewTriggerSource;
};

export type DistributionPreviewSummary = {
  actionCounts: Record<DistributionPlanAction, number>;
  itemCount: number;
  skillCount: number;
  targetCount: number;
};

export type DistributionPreviewItem = {
  action: DistributionPlanAction;
  agentTargetId: string;
  commitSha: string;
  id: string;
  installStrategy: string;
  reason: string | null;
  skillName: string;
  skillUnitId: string;
  sourcePath: string;
  status: "pending" | "skipped";
  targetName: string;
  targetPath: string;
};

export type DistributionPreviewPlan = {
  createdAt: string;
  id: string;
  items: DistributionPreviewItem[];
  operationType: DistributionOperationType;
  status: DistributionPlanStatus;
  summary: DistributionPreviewSummary;
  triggerSource: DistributionPreviewTriggerSource;
};
