export type SkillApiStatus = "ready" | "review" | "installed";

export type UpdateSkillTargetPreferenceInput = {
  agentTargetId: string;
  enabled: boolean;
  skillUnitId: string;
};

export type UpdateSkillTargetPreferenceResult = {
  success: true;
};

export type RemoveSkillTargetPreferenceInput = {
  agentTargetId: string;
  deleteInstalledFiles: boolean;
  removeTargetPreference: boolean;
  skillUnitId: string;
};

export type RemoveSkillTargetPreferenceResult = {
  deletedInstalledPath: string | null;
  success: true;
};

export type SkillApiRecord = {
  description: string;
  enabled: boolean;
  entry: string;
  id: string;
  name: string;
  repository: string;
  repositoryId: string;
  skillId: string;
  status: SkillApiStatus;
  tags: string[];
  targets: string[];
  version: string;
};
