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

const updatedAt = "2026-04-28T00:00:00.000Z";

export const defaultRepositoryApiRecords: RepositoryApiRecord[] = [
  {
    branch: "main",
    configJson: JSON.stringify({
      enabled: true,
      lastScanLabel: "未执行",
      note: "团队共享技能来源，使用系统 Git 凭据读取。",
      patterns: ["skills/*/SKILL.md", ".codex/skills/*/SKILL.md"],
      priority: 1,
      providerName: "GitHub",
      scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
      skillUnits: 12,
      status: "ready"
    } satisfies RepositoryConfig),
    id: "team-skills",
    lastScannedCommitSha: "8f2c91a",
    localCachePath: "~/.skills-manager/cache/team-skills",
    name: "Team skills repository",
    providerId: "github",
    remoteUrl: "git@github.com:team/skills.git",
    updatedAt
  },
  {
    branch: "main",
    configJson: JSON.stringify({
      enabled: true,
      lastScanLabel: "未执行",
      note: "开发中的本机仓库，不需要 clone。",
      patterns: ["agents/skills/*/SKILL.md", "skills/*/SKILL.md"],
      priority: 2,
      providerName: "Local Git",
      scan: { added: 0, changed: 0, removed: 0, warnings: 0 },
      skillUnits: 5,
      status: "ready"
    } satisfies RepositoryConfig),
    id: "local-dev-skills",
    lastScannedCommitSha: "local",
    localCachePath: "D:/workspace/local-skills",
    name: "Local development skills",
    providerId: "local-git",
    remoteUrl: "D:/workspace/local-skills",
    updatedAt
  },
  {
    branch: "stable",
    configJson: JSON.stringify({
      enabled: true,
      lastScanLabel: "未执行",
      note: "部分目录没有 manifest，需要按 SKILL.md 路径回退发现。",
      patterns: ["skills/*/SKILL.md"],
      priority: 3,
      providerName: "GitLab",
      scan: { added: 2, changed: 1, removed: 0, warnings: 1 },
      skillUnits: 7,
      status: "review"
    } satisfies RepositoryConfig),
    id: "design-lab",
    lastScannedCommitSha: "21ab9d0",
    localCachePath: "~/.skills-manager/cache/design-lab",
    name: "Design lab prompts",
    providerId: "gitlab",
    remoteUrl: "git@gitlab.com:design/lab-skills.git",
    updatedAt
  },
  {
    branch: "index",
    configJson: JSON.stringify({
      enabled: false,
      lastScanLabel: "未执行",
      note: "市场索引默认休眠，启用后进入同步队列。",
      patterns: ["market-index.json"],
      priority: 6,
      providerName: "skills.sh",
      scan: { added: 0, changed: 0, removed: 0, warnings: 1 },
      skillUnits: 0,
      status: "review"
    } satisfies RepositoryConfig),
    id: "market-index",
    lastScannedCommitSha: "remote",
    localCachePath: "~/.skills-manager/cache/skills-market",
    name: "skills.sh market index",
    providerId: "skills-sh",
    remoteUrl: "https://skills.sh",
    updatedAt
  },
  {
    branch: "main",
    configJson: JSON.stringify({
      enabled: false,
      lastScanLabel: "认证失败",
      note: "系统 Git 凭据未通过，需要用户在终端修复凭据。",
      patterns: ["skills/*/SKILL.md"],
      priority: 8,
      providerName: "Bitbucket",
      scan: { added: 0, changed: 0, removed: 0, warnings: 1 },
      skillUnits: 0,
      status: "failed"
    } satisfies RepositoryConfig),
    id: "legacy-bitbucket",
    lastScannedCommitSha: null,
    localCachePath: "~/.skills-manager/cache/legacy-support",
    name: "Legacy support skills",
    providerId: "bitbucket",
    remoteUrl: "git@bitbucket.org:support/legacy-skills.git",
    updatedAt
  }
];
