export type SkillApiStatus = "ready" | "review" | "installed";

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
