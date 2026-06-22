export type RepositoryScanStatus = "ready" | "review" | "failed";
export type RepositoryLastSyncStatus = "failed" | "interrupted" | "running" | "success";
export type RepositorySyncItemStatus = RepositoryScanStatus | "skipped";

export type RepositoryProviderName =
  | "Bitbucket"
  | "Gitea"
  | "GitHub"
  | "GitLab"
  | "Local"
  | "skills.sh";

export type RepositoryScanSummary = {
  added: number;
  changed: number;
  removed: number;
  warnings: number;
};

export type RepositorySyncFailureCategory =
  | "auth"
  | "filesystem"
  | "git"
  | "network"
  | "not-a-skill"
  | "source-not-found"
  | "unknown";

export type RepositorySyncFailure = {
  category: RepositorySyncFailureCategory;
  logPath: string | null;
  message: string;
};

export type RepositorySyncResultItem = {
  commitSha?: string;
  error?: RepositorySyncFailure;
  repositoryId: string;
  scan: RepositoryScanSummary;
  skillUnits: number;
  status: RepositorySyncItemStatus;
};

export type RepositoryLastSync = {
  endCommitSha: string | null;
  errorMessage: string | null;
  finishedAt: string | null;
  logPath: string | null;
  startedAt: string;
  startCommitSha: string | null;
  status: RepositoryLastSyncStatus;
  summaryJson: string;
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
  patterns: string;
  provider: RepositoryProviderName;
  remoteUrl: string;
};

export type UpdateRepositoryInput = CreateRepositoryInput & {
  enabled?: boolean;
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
  lastSync: RepositoryLastSync | null;
  lastScannedCommitSha: string | null;
  localCachePath: string;
  name: string;
  providerId: string;
  remoteUrl: string;
  updatedAt: string;
};
