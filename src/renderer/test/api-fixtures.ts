import type { ProviderApiRecord, ProviderConfig } from "../../core/providers/provider-api";
import type { RepositoryApiRecord, RepositoryConfig } from "../../core/repositories/repository-api";

const fixtureDate = "2026-04-28T00:00:00.000Z";

export const providerApiRecordsFixture: ProviderApiRecord[] = [
  {
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
    createdAt: fixtureDate,
    id: "github",
    name: "GitHub",
    type: "github",
    updatedAt: fixtureDate
  },
  {
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
    createdAt: fixtureDate,
    id: "gitlab",
    name: "GitLab",
    type: "gitlab",
    updatedAt: fixtureDate
  },
  {
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
    createdAt: fixtureDate,
    id: "local-git",
    name: "Local Git",
    type: "local_git",
    updatedAt: fixtureDate
  },
  {
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
    createdAt: fixtureDate,
    id: "skills-sh",
    name: "skills.sh",
    type: "skills_sh",
    updatedAt: fixtureDate
  },
  {
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
    createdAt: fixtureDate,
    id: "bitbucket",
    name: "Bitbucket",
    type: "bitbucket",
    updatedAt: fixtureDate
  },
  {
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
    createdAt: fixtureDate,
    id: "gitea",
    name: "Gitea",
    type: "gitea",
    updatedAt: fixtureDate
  }
];

export const repositoryApiRecordsFixture: RepositoryApiRecord[] = [
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
    updatedAt: fixtureDate
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
    updatedAt: fixtureDate
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
    updatedAt: fixtureDate
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
    updatedAt: fixtureDate
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
    updatedAt: fixtureDate
  }
];
