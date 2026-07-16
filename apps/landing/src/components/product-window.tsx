import {
  Box,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Database,
  FolderGit2,
  Github,
  ListFilter,
  PackageCheck,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Target
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ProductScreen = "providers" | "sources" | "skills" | "targets" | "settings";

interface ProductWindowProps {
  screen: ProductScreen;
  compact?: boolean;
  className?: string;
}

const navItems: Array<{ id: ProductScreen; label: string; icon: LucideIcon }> = [
  { id: "providers", label: "提供方", icon: SlidersHorizontal },
  { id: "sources", label: "来源", icon: FolderGit2 },
  { id: "skills", label: "技能", icon: Box },
  { id: "targets", label: "目标", icon: Target },
  { id: "settings", label: "设置", icon: Settings }
];

const screenCopy = {
  providers: {
    title: "提供方与连接诊断",
    description: "管理预定义连接入口、认证状态和访问诊断。"
  },
  sources: {
    title: "来源管理",
    description: "管理 Git 和其他来源的 Skills。"
  },
  skills: {
    title: "技能分发",
    description: "浏览和分发 Skills。"
  },
  targets: {
    title: "目标管理",
    description: "扫描本机 agent 目录，并汇总 Skills 页面已选择的本地目标。"
  },
  settings: {
    title: "设置",
    description: "管理 GitHub 访问、本地存储和自动分发。"
  }
} satisfies Record<ProductScreen, { title: string; description: string }>;

export default function ProductWindow({
  screen,
  compact = false,
  className = ""
}: ProductWindowProps) {
  const copy = screenCopy[screen];

  return (
    <div
      className={`overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-[0_24px_80px_rgba(24,24,27,0.14)] ${className}`}
      aria-label={`Skills Manager ${copy.title}界面预览`}
    >
      <div className="flex h-10 items-center border-b border-zinc-200 bg-zinc-100 px-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-zinc-300" />
          <span className="size-2.5 rounded-full bg-zinc-300" />
          <span className="size-2.5 rounded-full bg-zinc-300" />
        </div>
        <span className="mx-auto pr-10 text-[11px] font-medium text-zinc-500">Skills Manager</span>
      </div>

      <div
        className={`grid ${compact ? "h-[500px]" : "h-[560px]"} grid-cols-[154px_minmax(0,1fr)]`}
      >
        <aside className="flex flex-col border-r border-zinc-200 bg-zinc-50 px-3 py-4">
          <div className="mb-5 px-2 text-[11px] font-semibold uppercase text-zinc-400">工作区</div>
          <nav className="grid gap-1" aria-label="产品预览导航">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === screen;
              return (
                <div
                  key={item.id}
                  className={`flex h-9 items-center gap-2 rounded-md px-2.5 text-xs font-medium ${
                    active ? "bg-zinc-900 text-white" : "text-zinc-500"
                  }`}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {item.label}
                </div>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-zinc-200 px-2 pt-3 text-[10px] text-zinc-400">
            版本 0.1.0
          </div>
        </aside>

        <main className="min-w-0 overflow-hidden bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">{copy.title}</h2>
              <p className="mt-1 text-[11px] text-zinc-500">{copy.description}</p>
            </div>
            <ScreenAction screen={screen} />
          </div>

          {screen === "settings" ? <SettingsScreen /> : <ListScreen screen={screen} />}
        </main>
      </div>
    </div>
  );
}

function ScreenAction({ screen }: { screen: ProductScreen }) {
  const action =
    screen === "providers"
      ? "诊断"
      : screen === "sources"
        ? "同步"
        : screen === "skills"
          ? "分发"
          : screen === "targets"
            ? "扫描"
            : "保存";
  return (
    <button
      type="button"
      tabIndex={-1}
      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-950 px-3 text-[11px] font-semibold text-white"
    >
      {screen === "providers" ? (
        <SlidersHorizontal className="size-3" />
      ) : screen === "sources" || screen === "targets" ? (
        <RefreshCw className="size-3" />
      ) : (
        <PackageCheck className="size-3" />
      )}
      {action}
    </button>
  );
}

function ListScreen({ screen }: { screen: Exclude<ProductScreen, "settings"> }) {
  const data = screenData[screen];
  return (
    <div className="mt-5 grid h-[445px] grid-cols-[minmax(0,1fr)_205px] overflow-hidden rounded-md border border-zinc-200">
      <section className="min-w-0 border-r border-zinc-200">
        <div className="flex h-11 items-center gap-2 border-b border-zinc-200 px-3">
          <div className="flex h-7 flex-1 items-center gap-2 rounded-md border border-zinc-200 px-2 text-[10px] text-zinc-400">
            <Search className="size-3" />
            {data.search}
          </div>
          <div className="flex size-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500">
            <ListFilter className="size-3" />
          </div>
        </div>
        <div className="grid h-9 grid-cols-[1.35fr_1fr_0.75fr] items-center border-b border-zinc-200 bg-zinc-50 px-3 text-[9px] font-semibold text-zinc-500">
          {data.columns.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
        {data.rows.map((row, index) => (
          <div
            key={row[0]}
            className={`grid h-14 grid-cols-[1.35fr_1fr_0.75fr] items-center border-b border-zinc-100 px-3 text-[10px] ${index === 0 ? "bg-zinc-50" : ""}`}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-zinc-800">{row[0]}</p>
              <p className="mt-1 truncate text-[9px] text-zinc-400">{row[1]}</p>
            </div>
            <span className="truncate text-zinc-500">{row[2]}</span>
            <Status label={row[3]} />
          </div>
        ))}
        <div className="flex h-10 items-center justify-between px-3 text-[9px] text-zinc-400">
          <span>1-4 / 4</span>
          <div className="flex gap-1">
            <ChevronLeft className="size-3" />
            <ChevronRight className="size-3" />
          </div>
        </div>
      </section>

      <aside className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-zinc-900 text-white">
            {screen === "providers" || screen === "sources" ? (
              <Github className="size-3.5" />
            ) : screen === "targets" ? (
              <Target className="size-3.5" />
            ) : (
              <Box className="size-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-zinc-900">{data.detailTitle}</p>
            <p className="text-[9px] text-zinc-400">{data.detailMeta}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {data.details.map(([label, value]) => (
            <div key={label} className="border-b border-zinc-100 pb-3">
              <p className="text-[9px] font-medium text-zinc-400">{label}</p>
              <p className="mt-1 break-all text-[10px] font-medium leading-4 text-zinc-700">
                {value}
              </p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function SettingsScreen() {
  return (
    <div className="mt-5 grid h-[445px] grid-cols-[160px_minmax(0,1fr)] overflow-hidden rounded-md border border-zinc-200">
      <aside className="border-r border-zinc-200 bg-zinc-50 p-3">
        {["GitHub API token", "技能分发", "本地存储", "关于"].map((item, index) => (
          <div
            key={item}
            className={`rounded-md px-2 py-2 text-[10px] font-medium ${index === 1 ? "bg-zinc-900 text-white" : "text-zinc-500"}`}
          >
            {item}
          </div>
        ))}
      </aside>
      <section className="p-4">
        <div className="rounded-md border border-zinc-200 p-4">
          <div className="flex items-center gap-2">
            <PackageCheck className="size-4 text-zinc-500" />
            <h3 className="text-xs font-semibold">技能分发</h3>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-zinc-500">
            控制来源同步完成后，是否自动 copy 到已经设置的目标目录。
          </p>
          <div className="mt-4 flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <div>
              <p className="text-[10px] font-semibold">同步后自动分发到已设置目标</p>
              <p className="mt-1 text-[9px] text-zinc-400">
                只覆盖已有 enabled target preference 的 skills。
              </p>
            </div>
            <span className="relative h-5 w-9 rounded-full bg-zinc-900">
              <span className="absolute right-0.5 top-0.5 size-4 rounded-full bg-white" />
            </span>
          </div>
        </div>
        <div className="mt-3 rounded-md border border-zinc-200 p-4">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-zinc-500" />
            <h3 className="text-xs font-semibold">本地存储</h3>
          </div>
          <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 font-mono text-[9px] text-zinc-500">
            ~/.skills-manager/cache
          </p>
        </div>
      </section>
    </div>
  );
}

function Status({ label }: { label: string }) {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-zinc-200 px-1.5 py-0.5 text-[8px] text-zinc-600">
      <CircleDot className="size-2" />
      {label}
    </span>
  );
}

const screenData = {
  providers: {
    search: "按类型或连接状态筛选",
    columns: ["提供方", "认证", "状态"],
    rows: [
      ["GitHub", "远程 Git 与 API", "系统 Git / Token", "已连接"],
      ["GitLab", "远程 Git 来源", "系统 Git", "可用"],
      ["Gitea", "自托管 Git 来源", "系统 Git", "可用"],
      ["Bitbucket", "远程 Git 来源", "系统 Git", "可用"]
    ],
    detailTitle: "GitHub",
    detailMeta: "远程 Git 提供方",
    details: [
      ["认证方式", "系统 Git / Fine-grained token"],
      ["发现策略", "Repository tree + SKILL.md"],
      ["最近诊断", "连接与内容读取正常"]
    ]
  },
  sources: {
    search: "搜索名称、URL 或备注",
    columns: ["来源", "类型", "状态"],
    rows: [
      ["OpenAI Skills", "github.com/openai/skills", "GitHub", "就绪"],
      ["Vercel Agent Skills", "github.com/vercel-labs/agent-skills", "GitHub", "就绪"],
      ["团队技能库", "本地 Git 仓库", "Local Git", "就绪"],
      ["skills.sh", "技能市场索引", "Marketplace", "待同步"]
    ],
    detailTitle: "OpenAI Skills",
    detailMeta: "GitHub 来源",
    details: [
      ["最后 commit", "8b21d61"],
      ["发现入口", "skills/*/SKILL.md"],
      ["同步影响", "+2 新增 / 1 更新 / 0 移除"]
    ]
  },
  skills: {
    search: "搜索名称、仓库或描述",
    columns: ["技能", "仓库", "状态"],
    rows: [
      ["react-best-practices", "React 性能实践", "Vercel Agent Skills", "可分发"],
      ["pdf", "读取、创建和验证 PDF", "OpenAI Skills", "已安装"],
      ["spreadsheets", "创建与分析工作簿", "OpenAI Skills", "已安装"],
      ["code-review", "项目代码审查规则", "团队技能库", "可分发"]
    ],
    detailTitle: "react-best-practices",
    detailMeta: "skill unit",
    details: [
      ["仓库", "Vercel Agent Skills"],
      ["入口文件", "skills/react-best-practices/SKILL.md"],
      ["分发目标", "Codex / Claude Code"]
    ]
  },
  targets: {
    search: "搜索名称、路径或已选择技能",
    columns: ["目标", "范围", "状态"],
    rows: [
      ["Codex", "~/.codex/skills", "全局", "已检测"],
      ["Claude Code", "~/.claude/skills", "全局", "已检测"],
      ["Gemini CLI", "~/.gemini/skills", "全局", "已检测"],
      ["项目技能目录", "./.agents/skills", "独立", "已登记"]
    ],
    detailTitle: "Codex",
    detailMeta: "全局目标",
    details: [
      ["路径", "~/.codex/skills"],
      ["扫描结果", "目录存在且可写"],
      ["已选择技能", "12 个 skills"]
    ]
  }
} satisfies Record<
  Exclude<ProductScreen, "settings">,
  {
    search: string;
    columns: string[];
    rows: string[][];
    detailTitle: string;
    detailMeta: string;
    details: string[][];
  }
>;
