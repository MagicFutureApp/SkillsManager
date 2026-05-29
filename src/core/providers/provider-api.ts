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

const createdAt = "2026-04-28T00:00:00.000Z";

export const defaultProviderApiRecords: ProviderApiRecord[] = [
  {
    id: "github",
    type: "github",
    name: "GitHub",
    configJson: JSON.stringify({
      authMode: "系统 Git 凭据",
      connected: true,
      diagnostic: "credential helper: reachable\nrepo access probe: ready\nlast result: connected",
      discoveryPatterns: ["skills/*/SKILL.md", ".codex/skills/*/SKILL.md"],
      discoveryStrategy: "manifest first",
      enabled: true,
      notes:
        "通过系统 Git、SSH key、HTTPS credential helper 或现有 CLI 登录状态访问 GitHub 仓库。应用不保存 token 明文。",
      priority: 1,
      status: "connected"
    } satisfies ProviderConfig),
    createdAt,
    updatedAt: createdAt
  },
  {
    id: "gitlab",
    type: "gitlab",
    name: "GitLab",
    configJson: JSON.stringify({
      authMode: "系统 Git 凭据",
      connected: true,
      diagnostic:
        "credential helper: reachable\nnamespace probe: one namespace requires review\nlast result: needs review",
      discoveryPatterns: ["skills/*/SKILL.md"],
      discoveryStrategy: "manifest first",
      enabled: true,
      notes: "使用系统 Git 凭据访问 GitLab 命名空间。首次同步前需要确认可访问范围。",
      priority: 2,
      status: "review"
    } satisfies ProviderConfig),
    createdAt,
    updatedAt: createdAt
  },
  {
    id: "local-git",
    type: "local_git",
    name: "Local Git",
    configJson: JSON.stringify({
      authMode: "Local filesystem",
      connected: true,
      diagnostic:
        "folder permission: granted\ngit worktree probe: reachable\nlast result: connected",
      discoveryPatterns: ["agents/skills/*/SKILL.md", "skills/*/SKILL.md"],
      discoveryStrategy: "convention scan",
      enabled: true,
      notes: "读取本机已授权的开发目录。连接时选择本地根目录，扫描结果默认进入 review。",
      priority: 3,
      status: "connected"
    } satisfies ProviderConfig),
    createdAt,
    updatedAt: createdAt
  },
  {
    id: "skills-sh",
    type: "skills_sh",
    name: "skills.sh",
    configJson: JSON.stringify({
      authMode: "Marketplace account",
      connected: true,
      diagnostic: "account session: active\ncatalog schema: compatible\nlast result: connected",
      discoveryPatterns: ["market index manifest"],
      discoveryStrategy: "market index",
      enabled: true,
      notes: "公共市场 Provider。安装仍需解析到 commit sha，并在 dry-run 计划中确认目标。",
      priority: 4,
      status: "connected"
    } satisfies ProviderConfig),
    createdAt,
    updatedAt: createdAt
  },
  {
    id: "bitbucket",
    type: "bitbucket",
    name: "Bitbucket",
    configJson: JSON.stringify({
      authMode: "系统 Git 凭据",
      connected: false,
      diagnostic:
        "credential helper: expired\nsuggestion: reconnect with system Git environment\nlast result: error",
      discoveryPatterns: ["skills/*/SKILL.md"],
      discoveryStrategy: "convention scan",
      enabled: false,
      notes: "可选 Provider。连接后才能读取团队空间，当前需要重新验证系统 Git 访问。",
      priority: 5,
      status: "error"
    } satisfies ProviderConfig),
    createdAt,
    updatedAt: createdAt
  },
  {
    id: "gitea",
    type: "gitea",
    name: "Gitea",
    configJson: JSON.stringify({
      authMode: "系统 Git 凭据",
      connected: false,
      diagnostic:
        "instance access: not connected\nhost verification: pending\nlast result: needs review",
      discoveryPatterns: ["skills/*/SKILL.md"],
      discoveryStrategy: "manifest first",
      enabled: false,
      notes: "自托管 Provider。连接时先验证实例地址和 Git 访问，再进入仓库发现。",
      priority: 6,
      status: "review"
    } satisfies ProviderConfig),
    createdAt,
    updatedAt: createdAt
  }
];
