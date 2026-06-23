export type AgentTargetType =
  | "codex"
  | "codex-cli"
  | "claude-code"
  | "gemini-cli"
  | "custom-directory";

export type TargetDetectionStatus = "detected" | "missing";
export type TargetRegistrationScope = "global" | "independent";

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

export type RegisteredTargetRecord = {
  createdAt: string;
  defaultInstallStrategy: string;
  enabled: boolean;
  id: string;
  name: string;
  normalizedPath: string;
  path: string;
  selectedSkills: TargetSkillSelection[];
  skillCount: number;
  scope: TargetRegistrationScope;
  type: string;
  updatedAt: string;
};
