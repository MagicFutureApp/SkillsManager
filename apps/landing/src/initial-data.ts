import type { DistributionPreview, Skill, SkillCategory } from "./types";

export const CATEGORIES: SkillCategory[] = [
  {
    id: "providers",
    name: "提供方",
    color: "#8b5cf6",
    borderColor: "border-violet-200",
    bgColor: "bg-violet-50",
    textColor: "text-violet-700",
    description: "GitHub、GitLab、Gitea 和 Bitbucket 的连接与访问诊断。"
  },
  {
    id: "sources",
    name: "来源",
    color: "#f43f5e",
    borderColor: "border-rose-200",
    bgColor: "bg-rose-50",
    textColor: "text-rose-700",
    description: "远程 Git、本地 Git、本地目录和技能市场来源。"
  },
  {
    id: "skills",
    name: "技能",
    color: "#f59e0b",
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    description: "由 SKILL.md 扫描得到并锁定 commit 的 skill unit。"
  },
  {
    id: "targets",
    name: "目标",
    color: "#10b981",
    borderColor: "border-emerald-200",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    description: "Codex、Claude Code、Gemini CLI 和自定义目录。"
  },
  {
    id: "settings",
    name: "设置",
    color: "#6366f1",
    borderColor: "border-indigo-200",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-700",
    description: "GitHub token、本地存储和同步后自动分发。"
  }
];

export const INITIAL_SKILLS: Skill[] = [
  {
    id: "1",
    name: "react-best-practices",
    category: "skills",
    level: "已安装",
    progress: 100,
    notes: "来自 Vercel Agent Skills，已选择 Codex 与 Claude Code 目标。",
    updatedAt: "8b21d61"
  },
  {
    id: "2",
    name: "OpenAI Skills",
    category: "sources",
    level: "可分发",
    progress: 75,
    notes: "GitHub 来源，扫描入口为 skills/*/SKILL.md。",
    updatedAt: "f42c901"
  },
  {
    id: "3",
    name: "Codex",
    category: "targets",
    level: "已安装",
    progress: 100,
    notes: "全局目标目录 ~/.codex/skills，目录存在且可写。",
    updatedAt: "刚刚扫描"
  },
  {
    id: "4",
    name: "GitHub",
    category: "providers",
    level: "已安装",
    progress: 100,
    notes: "系统 Git 认证可用，Metadata 与 Contents 读取正常。",
    updatedAt: "刚刚诊断"
  },
  {
    id: "5",
    name: "同步后自动分发",
    category: "settings",
    level: "可分发",
    progress: 75,
    notes: "只覆盖已有 enabled target preference 的 skills。",
    updatedAt: "本地设置"
  }
];

export const SAMPLE_DISTRIBUTIONS: Record<string, DistributionPreview> = {
  "react-best-practices": {
    skillName: "react-best-practices",
    level: "已安装",
    overview: "预览会把锁定到 commit 8b21d61 的 skill unit copy 到已选择目标，并保留当前安装事实。",
    steps: [
      {
        title: "解析版本与入口",
        duration: "8b21d61",
        topics: [
          "确认 repository 与 commit_sha",
          "读取 skills/react-best-practices/SKILL.md",
          "校验源目录存在"
        ],
        resources: ["Vercel Agent Skills 本地缓存"]
      },
      {
        title: "检查目标与冲突",
        duration: "2 个目标",
        topics: ["Codex：update", "Claude Code：skip", "检查目标路径不与源目录嵌套"],
        resources: ["skill_target_preferences"]
      },
      {
        title: "执行 copy 分发",
        duration: "确认后",
        topics: [
          "由 Electron main process 写入文件",
          "更新 install_instances",
          "返回 installed / updated / skipped 摘要"
        ],
        resources: ["copy-only distribution"]
      }
    ],
    tips: [
      "分发预览是一次性计算结果，不写入持久化 plan 表。",
      "安装事实以 install_instances 为准。",
      "冲突目标需要明确选择跳过或覆盖。"
    ]
  },
  "openai skills": {
    skillName: "OpenAI Skills",
    level: "可分发",
    overview: "来源同步会先写入统一缓存，扫描多个 SKILL.md，再把变化后的 skill unit 交给分发预览。",
    steps: [
      {
        title: "同步来源",
        duration: "手动触发",
        topics: ["使用系统 Git 拉取来源", "解析默认分支和 commit", "写入本地缓存"],
        resources: ["repositories.last_sync_*"]
      },
      {
        title: "扫描 skill unit",
        duration: "当前 commit",
        topics: ["发现 skills/*/SKILL.md", "生成稳定 skill key", "记录 added / changed / removed"],
        resources: ["skill_units / skill_versions"]
      },
      {
        title: "准备分发",
        duration: "按目标偏好",
        topics: ["读取 enabled target preference", "计算 copy 操作", "汇总冲突与阻塞项"],
        resources: ["distribution preview"]
      }
    ],
    tips: [
      "v1 来源同步默认手动。",
      "自动分发不会为未设置目标的 skills 猜测目录。",
      "Git 凭据继续交给用户系统 Git。"
    ]
  }
};
