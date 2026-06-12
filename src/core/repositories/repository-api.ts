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
