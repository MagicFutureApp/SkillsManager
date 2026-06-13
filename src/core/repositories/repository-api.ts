export type RepositoryScanStatus = "ready" | "review" | "failed";

export type RepositoryProviderName =
  | "Bitbucket"
  | "Gitea"
  | "GitHub"
  | "GitLab"
  | "Local Git"
  | "skills.sh";

export type RepositoryScanSummary = {
  added: number;
  changed: number;
  removed: number;
  warnings: number;
};

export type RepositoryConfig = {
  enabled: boolean;
  lastScanLabel: string;
  note: string;
  patterns: string[];
  priority: number;
  providerName: RepositoryProviderName;
  scan: RepositoryScanSummary;
  skillUnits: number;
  status: RepositoryScanStatus;
};

export type CreateRepositoryInput = {
  branch: string;
  name: string;
  note: string;
  patterns: string[];
  provider: RepositoryProviderName;
  remoteUrl: string;
};

export type RepositoryDeleteSkill = {
  entryPath: string;
  id: string;
  name: string;
};

export type RepositoryDeletePreview = {
  localCachePath: string;
  repositoryId: string;
  repositoryName: string;
  skills: RepositoryDeleteSkill[];
};

export type DeleteRepositoryResult = {
  deletedRepositoryId: string;
  deletedSkillUnitIds: string[];
  localCachePath: string;
};

export type RepositoryApiRecord = {
  branch: string;
  configJson: string;
  id: string;
  lastScannedCommitSha: string | null;
  localCachePath: string;
  name: string;
  providerId: string;
  remoteUrl: string;
  updatedAt: string;
};
