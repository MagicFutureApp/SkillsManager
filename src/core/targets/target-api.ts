export type AgentTargetType = "codex" | "claude-code" | "gemini-cli" | "custom-directory";

export type TargetDetectionStatus =
  | "detected"
  | "app-missing"
  | "path-missing"
  | "not-writable"
  | "not-directory"
  | "scan-error"
  | "missing";
export type TargetRegistrationScope = "global" | "independent";
export type RegisteredTargetStatus = TargetDetectionStatus | "registered" | "disabled";

export type SystemTargetRecord = {
  detectionMessage: string;
  id: string;
  name: string;
  normalizedPath: string;
  path: string;
  status: TargetDetectionStatus;
  type: AgentTargetType;
};

export type TargetScanCandidate = {
  id: string;
  name: string;
  normalizedPath: string;
  path: string;
  type: string;
};

export type TargetScanRecord = TargetScanCandidate & {
  detectionMessage: string;
  status: TargetDetectionStatus;
};

export type TargetScanIssue = {
  id: string;
  message: string;
  name: string;
  path: string;
  status: Exclude<TargetDetectionStatus, "detected">;
  type: string;
};

export type TargetSkillSelection = {
  id: string;
  name: string;
  repository: string;
};

export type TargetSkillPreference = TargetSkillSelection & {
  enabled: boolean;
};

export type RegisteredTargetRecord = {
  createdAt: string;
  enabled: boolean;
  id: string;
  name: string;
  normalizedPath: string;
  path: string;
  scanMessage: string | null;
  selectedSkills: TargetSkillSelection[];
  skillPreferences: TargetSkillPreference[];
  skillCount: number;
  scope: TargetRegistrationScope;
  status: RegisteredTargetStatus;
  type: string;
  updatedAt: string;
};

export const isBuiltInTargetType = (
  type: string
): type is Exclude<AgentTargetType, "custom-directory"> => {
  return type === "codex" || type === "claude-code" || type === "gemini-cli";
};
