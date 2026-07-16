import { ArrowDown, Database, FolderSync, GitBranch } from "lucide-react";

import ProductWindow from "./product-window.tsx";

interface HeroProps {
  onScrollToProduct: () => void;
  onScrollToWorkflow: () => void;
}

export default function Hero({ onScrollToProduct, onScrollToWorkflow }: HeroProps) {
  return (
    <section id="hero" className="overflow-hidden border-b border-zinc-200 bg-white pt-20 sm:pt-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-end gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
          <div className="pb-4 lg:pb-20">
            <h1 className="text-5xl font-semibold leading-[1.02] text-zinc-950 sm:text-6xl">
              Skills Manager
            </h1>
            <p className="mt-7 max-w-xl text-2xl font-medium leading-snug text-zinc-800 sm:text-3xl">
              把 agent skills 收拢到一个本地工作台。
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-500">
              统一管理技能来源、版本和安装目标。从 Git 或本地目录扫描 SKILL.md，锁定到明确
              commit，再以 copy 方式分发到 Codex、Claude Code、Gemini CLI 或自定义目录。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onScrollToProduct}
                className="inline-flex h-11 items-center rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                查看产品界面
              </button>
              <button
                type="button"
                onClick={onScrollToWorkflow}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
              >
                了解工作流
                <ArrowDown className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 border-t border-zinc-200 pt-5 text-zinc-500">
              <HeroFact icon={Database} label="本地 SQLite 索引" />
              <HeroFact icon={GitBranch} label="精确 commit 版本" />
              <HeroFact icon={FolderSync} label="copy-only 分发" />
            </div>
          </div>

          <div className="relative min-w-0 self-end lg:translate-x-8">
            <ProductWindow
              screen="skills"
              compact
              className="min-w-[720px] origin-top-left scale-[0.62] sm:scale-[0.78] lg:scale-100"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroFact({ icon: Icon, label }: { icon: typeof Database; label: string }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-5">
      <Icon className="mt-0.5 size-4 shrink-0 text-zinc-900" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
