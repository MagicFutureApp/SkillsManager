export type ProviderType = "github" | "gitlab" | "gitea" | "bitbucket" | "local_git" | "skills_sh";

export type ProviderConnectionStatus = "connected" | "review" | "error";

export type ProviderConfig = {
  authMode: string;
  connected: boolean;
  diagnostic: string;
  discoveryPatterns: string[];
  discoveryStrategy: string;
  enabled: boolean;
  notes: string;
  priority: number;
  status: ProviderConnectionStatus;
};

export type ProviderApiRecord = {
  configJson: string;
  createdAt: string;
  id: string;
  name: string;
  type: ProviderType;
  updatedAt: string;
};
