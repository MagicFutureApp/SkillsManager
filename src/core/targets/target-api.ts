export type AgentTargetType =
  | "codex"
  | "codex-cli"
  | "claude-code"
  | "gemini-cli"
  | "custom-directory";

export type TargetDetectionStatus = "detected" | "missing";
export type TargetRegistrationScope = "global" | "independent";
export type RegisteredTargetStatus = TargetDetectionStatus | "registered" | "disabled";

export type SystemTargetRecord = {
  defaultInstallStrategy: string;
  executablePath: string | null;
  id: string;
  installPath: string | null;
  name: string;
  normalizedPath: string;
  path: string;
  status: TargetDetectionStatus;
  type: AgentTargetType;
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
  defaultInstallStrategy: string;
  enabled: boolean;
  id: string;
  name: string;
  normalizedPath: string;
  path: string;
  selectedSkills: TargetSkillSelection[];
  skillPreferences: TargetSkillPreference[];
  skillCount: number;
  scope: TargetRegistrationScope;
  status: RegisteredTargetStatus;
  type: string;
  updatedAt: string;
};
