import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  LoaderCircle,
  Search,
  Sparkles
} from "lucide-react";
import { useMemo, useState } from "react";

type DemoStatus = "ready" | "review";
type DemoAction = "install" | "update" | "skip" | "conflict";

type DemoSkill = {
  id: string;
  name: string;
  repository: string;
  version: string;
  entry: string;
  description: string;
  status: DemoStatus;
  tags: string[];
};

type DemoTarget = {
  id: string;
  name: string;
  path: string;
  scope: "global" | "independent";
};

type PreviewItem = {
  target: DemoTarget;
  action: DemoAction;
  reason: string;
};

const DEMO_SKILLS: DemoSkill[] = [
  {
    id: "team-skills__skills-review-bot",
    name: "Review Bot",
    repository: "Team skills repository",
    version: "8f2c91a",
    entry: "skills/review-bot/SKILL.md",
    description: "Reviews pull requests with concise, actionable feedback.",
    status: "ready",
    tags: ["review", "git"]
  },
  {
    id: "team-skills__skills-release-notes",
    name: "Release Notes",
    repository: "Team skills repository",
    version: "8f2c91a",
    entry: "skills/release-notes/SKILL.md",
    description: "Turns merged changes into a clear release summary.",
    status: "ready",
    tags: ["release", "writing"]
  },
  {
    id: "design-lab__skills-design-helper",
    name: "Design Helper",
    repository: "Design lab prompts",
    version: "21ab9d0",
    entry: "skills/design-helper/SKILL.md",
    description: "Keeps interface decisions consistent with the product system.",
    status: "review",
    tags: ["design", "ui"]
  },
  {
    id: "local-dev-skills__skills-test-writer",
    name: "Test Writer",
    repository: "Local development skills",
    version: "local",
    entry: "agents/skills/test-writer/SKILL.md",
    description: "Creates focused tests from an existing implementation.",
    status: "ready",
    tags: ["testing", "vitest"]
  }
];

const DEMO_TARGETS: DemoTarget[] = [
  { id: "codex", name: "Codex", path: "~/.codex/skills", scope: "global" },
  { id: "claude", name: "Claude Code", path: "~/.claude/skills", scope: "global" },
  {
    id: "project",
    name: "项目目录",
    path: "/Users/Document/skills-manager/.agents/skills/",
    scope: "independent"
  }
];

const INITIAL_TARGET_PREFERENCES: Record<string, string[]> = {
  [DEMO_SKILLS[0].id]: ["codex"],
  [DEMO_SKILLS[1].id]: ["codex", "claude"],
  [DEMO_SKILLS[2].id]: [],
  [DEMO_SKILLS[3].id]: ["project"]
};

const actionCopy: Record<DemoAction, { label: string; className: string }> = {
  install: { label: "安装", className: "bg-zinc-100 text-zinc-700" },
  update: { label: "更新", className: "bg-blue-50 text-blue-700" },
  skip: { label: "跳过", className: "bg-zinc-100 text-zinc-500" },
  conflict: { label: "冲突", className: "bg-rose-50 text-rose-700" }
};

const distributionButtonClassName =
  "w-12 rounded-md bg-zinc-900 px-2 py-1.5 text-[11px] font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400";

const getPreviewAction = (skill: DemoSkill, target: DemoTarget): PreviewItem => {
  if (skill.id === DEMO_SKILLS[0].id && target.id === "codex") {
    return { target, action: "install", reason: "Skill is not installed on this target." };
  }

  if (skill.id === DEMO_SKILLS[1].id && target.id === "codex") {
    return { target, action: "update", reason: "A newer commit is available for this target." };
  }

  if (skill.id === DEMO_SKILLS[1].id && target.id === "claude") {
    return { target, action: "skip", reason: "The target is already at the current version." };
  }

  return { target, action: "install", reason: "Skill is not installed on this target." };
};

export default function InteractiveSandbox() {
  const [query, setQuery] = useState("");
  const [repository, setRepository] = useState("all");
  const [sort, setSort] = useState<"name" | "repository">("name");
  const [selectedSkillId, setSelectedSkillId] = useState(DEMO_SKILLS[0].id);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [targetPreferences, setTargetPreferences] = useState(INITIAL_TARGET_PREFERENCES);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [distributionResult, setDistributionResult] = useState<string | null>(null);

  const repositories = useMemo(
    () => ["all", ...new Set(DEMO_SKILLS.map((skill) => skill.repository))],
    []
  );

  const visibleSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = DEMO_SKILLS.filter((skill) => {
      const searchable = [skill.name, skill.repository, skill.description, ...skill.tags]
        .join(" ")
        .toLowerCase();
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (repository === "all" || skill.repository === repository)
      );
    });

    return [...filtered].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : a.repository.localeCompare(b.repository) || a.name.localeCompare(b.name)
    );
  }, [query, repository, sort]);

  const selectedSkill = DEMO_SKILLS.find((skill) => skill.id === selectedSkillId) ?? null;
  const selectedTargets = selectedSkill
    ? DEMO_TARGETS.filter((target) => targetPreferences[selectedSkill.id]?.includes(target.id))
    : [];
  const selectedCheckedSkills = DEMO_SKILLS.filter((skill) => checkedIds.includes(skill.id));
  const canBulkDistribute =
    selectedCheckedSkills.length > 0 &&
    selectedCheckedSkills.every((skill) => (targetPreferences[skill.id] ?? []).length > 0);

  const toggleChecked = (skillId: string) => {
    setCheckedIds((current) =>
      current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId]
    );
  };

  const toggleTarget = (targetId: string) => {
    if (!selectedSkill) return;
    setDistributionResult(null);
    setPreview(null);
    setTargetPreferences((current) => {
      const currentTargets = current[selectedSkill.id] ?? [];
      const nextTargets = currentTargets.includes(targetId)
        ? currentTargets.filter((id) => id !== targetId)
        : [...currentTargets, targetId];
      return { ...current, [selectedSkill.id]: nextTargets };
    });
  };

  const startPreview = (skill: DemoSkill | null = selectedSkill) => {
    if (!skill) return;

    const targetIds = targetPreferences[skill.id] ?? [];
    if (!targetIds.length) return;

    setSelectedSkillId(skill.id);
    setDistributionResult(null);
    setPreview(null);
    setIsPreviewing(true);
    window.setTimeout(() => {
      setPreview(
        DEMO_TARGETS.filter((target) => targetIds.includes(target.id)).map((target) =>
          getPreviewAction(skill, target)
        )
      );
      setIsPreviewing(false);
    }, 450);
  };

  const confirmDistribution = () => {
    if (!preview || isExecuting) return;
    setIsExecuting(true);
    window.setTimeout(() => {
      const summary = preview.reduce(
        (result, item) => {
          result[item.action] += 1;
          return result;
        },
        { install: 0, update: 0, skip: 0, conflict: 0 } as Record<DemoAction, number>
      );
      setDistributionResult(
        `分发完成：安装 ${summary.install}，更新 ${summary.update}，跳过 ${summary.skip}，冲突 ${summary.conflict}。`
      );
      setPreview(null);
      setIsExecuting(false);
    }, 650);
  };

  const resetDemo = () => {
    setQuery("");
    setRepository("all");
    setSort("name");
    setSelectedSkillId(DEMO_SKILLS[0].id);
    setCheckedIds([]);
    setTargetPreferences(INITIAL_TARGET_PREFERENCES);
    setPreview(null);
    setDistributionResult(null);
    setIsPreviewing(false);
    setIsExecuting(false);
  };

  return (
    <section className="border-t border-zinc-200 bg-zinc-100 py-16 sm:py-24" id="sandbox">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-800 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>交互演示</span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            体验 desktop 的技能分发流程
          </h2>
          <p className="mt-4 text-base text-zinc-600">
            按照 desktop App 的 Skills 页面操作：筛选 skill、设置分发目标、预览 copy-only 操作，再确认执行。
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl" id="sandbox-workspace">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-display text-sm font-bold text-zinc-800">Skills Manager</span>
            </div>
            <button onClick={resetDemo} className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900">
              重置演示
            </button>
          </div>

          <div className="grid grid-cols-1 divide-y divide-zinc-200 lg:grid-cols-[minmax(0,1fr)_360px] lg:divide-x lg:divide-y-0">
            <main className="min-w-0 p-6 lg:p-7">
              <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold leading-tight text-zinc-900">技能分发</h3>
                </div>
                <button
                  type="button"
                  disabled={!canBulkDistribute}
                  onClick={() => selectedCheckedSkills[0] && startPreview(selectedCheckedSkills[0])}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
                  title={!selectedCheckedSkills.length ? "请先选择要分发的技能" : !canBulkDistribute ? "选中的技能没有分发目标" : "准备分发"}
                >
                  分发
                </button>
              </header>

              <section className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(150px,1fr))]" aria-label="技能筛选">
                <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                  搜索
                  <span className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、来源或说明" className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm font-normal text-zinc-800 outline-none transition focus:border-zinc-400" />
                  </span>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                  排序
                  <span className="relative">
                    <select value={sort} onChange={(event) => setSort(event.target.value as "name" | "repository")} className="h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-sm font-normal text-zinc-800 outline-none focus:border-zinc-400">
                      <option value="name">名称</option>
                      <option value="repository">来源</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  </span>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                  来源
                  <span className="relative">
                    <select value={repository} onChange={(event) => setRepository(event.target.value)} className="h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-8 text-sm font-normal text-zinc-800 outline-none focus:border-zinc-400">
                      {repositories.map((item) => <option key={item} value={item}>{item === "all" ? "全部来源" : item}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  </span>
                </label>
              </section>

              <div className="mt-5 max-w-full overflow-x-auto rounded-xl border border-zinc-200">
                <div className="min-w-[620px]">
                <div className="grid grid-cols-[32px_minmax(0,1.2fr)_minmax(130px,1fr)_58px_74px] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  <span aria-hidden="true" />
                  <span>技能</span><span>来源</span><span>目标</span><span>操作</span>
                </div>
                <div className="divide-y divide-zinc-100">
                  <AnimatePresence initial={false} mode="popLayout">
                    {visibleSkills.length ? visibleSkills.map((skill) => {
                      const targetCount = targetPreferences[skill.id]?.length ?? 0;
                      const checked = checkedIds.includes(skill.id);
                      const ready = skill.status === "ready" && targetCount > 0;
                      return (
                        <motion.div key={skill.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSkillId(skill.id)} className={`grid cursor-pointer grid-cols-[32px_minmax(0,1.2fr)_minmax(130px,1fr)_58px_74px] items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 ${selectedSkillId === skill.id ? "bg-violet-50/60" : ""}`}>
                          <input type="checkbox" aria-label={`选择 ${skill.name}`} checked={checked} onChange={() => toggleChecked(skill.id)} onClick={(event) => event.stopPropagation()} className="h-4 w-4 accent-violet-600" />
                          <div className="min-w-0"><strong className="block truncate text-sm text-zinc-900">{skill.name}</strong></div>
                          <span className="truncate text-xs text-zinc-600">{skill.repository}</span>
                          <span className="font-mono text-xs text-zinc-500">{targetCount}</span>
                          <button type="button" disabled={!ready} onClick={(event) => { event.stopPropagation(); startPreview(skill); }} className={distributionButtonClassName} title={!targetCount ? "请先添加分发目标" : skill.status !== "ready" ? "当前技能需要复核" : "准备分发"}>分发</button>
                        </motion.div>
                      );
                    }) : <div className="p-10 text-center text-sm text-zinc-500">没有匹配的技能。调整搜索或筛选条件。</div>}
                  </AnimatePresence>
                </div>
                <div className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-400">{visibleSkills.length}/{DEMO_SKILLS.length}</div>
                </div>
              </div>
            </main>

            <aside className="grid content-start gap-3 bg-zinc-50/40 p-5 lg:p-6" aria-label="技能分发设置">
              {selectedSkill ? <>
                <section className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div><h3 className="text-xl font-semibold text-zinc-900">{selectedSkill.name}</h3><p className="mt-2 text-sm leading-5 text-zinc-500">{selectedSkill.description}</p></div>
                  <button type="button" disabled={selectedSkill.status !== "ready" || selectedTargets.length === 0 || isPreviewing} onClick={() => startPreview()} className={`mt-4 ${distributionButtonClassName}`}>分发</button>
                </section>

                <section className="rounded-xl border border-zinc-200 bg-white p-4">
                  <h4 className="font-semibold text-zinc-900">分发目标</h4>
                  <div className="mt-3 grid gap-2">
                    {DEMO_TARGETS.map((target) => { const checked = targetPreferences[selectedSkill.id]?.includes(target.id); return <label key={target.id} className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 transition ${checked ? "border-violet-300 bg-violet-50/60" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}><span className="min-w-0"><strong className="block text-sm text-zinc-800">{target.name}</strong><span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500">{target.path}</span></span><input type="checkbox" checked={Boolean(checked)} onChange={() => toggleTarget(target.id)} className="h-4 w-4 accent-violet-600" aria-label={`选择 ${target.name}`} /></label>; })}
                  </div>
                </section>
              </> : null}
            </aside>
          </div>

        </div>

        <DistributionConfirmationDialog
          isExecuting={isExecuting}
          items={preview}
          onClose={() => setPreview(null)}
          onConfirm={confirmDistribution}
          skill={selectedSkill}
        />

        <AnimatePresence>
          {distributionResult ? (
            <motion.div
              role="status"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="fixed right-4 top-20 z-[70] flex max-w-sm items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg sm:right-6"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{distributionResult}</span>
              <button
                type="button"
                onClick={() => setDistributionResult(null)}
                className="ml-2 text-xs font-semibold underline underline-offset-2"
              >
                关闭
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <p className="mx-auto mt-4 flex max-w-2xl items-center justify-center gap-1.5 text-center text-xs text-zinc-500"><ExternalLink className="h-3.5 w-3.5" />演示数据对应 desktop 的 Skills 页面结构；实际应用通过类型化 preload / IPC 访问 Git、SQLite 和文件系统。</p>
      </div>
    </section>
  );
}

function DistributionConfirmationDialog({
  isExecuting,
  items,
  onClose,
  onConfirm,
  skill
}: {
  isExecuting: boolean;
  items: PreviewItem[] | null;
  onClose: () => void;
  onConfirm: () => void;
  skill: DemoSkill | null;
}) {
  if (!items || !skill) return null;

  const skillDirectory = skill.entry.split(/[\\/]/).at(-2) ?? skill.name;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-[1px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (!isExecuting) onClose();
        }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="distribution-dialog-title"
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.16 }}
          onClick={(event) => event.stopPropagation()}
          className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3
                id="distribution-dialog-title"
                className="text-2xl font-bold tracking-tight text-zinc-950"
              >
                确认分发
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                确认后会将 {items.length} 个项目分发到目标目录。
              </p>
            </div>
            <button
              type="button"
              disabled={isExecuting}
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              关闭
            </button>
          </div>

          <div className="mt-6 grid gap-2">
            {items.map((item) => {
              const action = actionCopy[item.action];
              const targetPath = `${item.target.path.replace(/[\\/]+$/, "")}/${skillDirectory}`;

              return (
                <div
                  key={item.target.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <strong className="min-w-0 truncate text-sm text-zinc-900">
                    {item.target.name}
                  </strong>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${action.className}`}
                  >
                    {action.label}
                  </span>
                  <p className="col-start-1 min-w-0 truncate font-mono text-xs leading-5 text-zinc-500">
                    {targetPath}
                  </p>
                  <p className="col-span-2 text-xs leading-5 text-zinc-500">{item.reason}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={isExecuting}
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              disabled={isExecuting}
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExecuting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isExecuting ? "分发中" : "确认分发"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
