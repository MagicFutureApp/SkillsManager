import { useState } from "react";

import ProductWindow, { type ProductScreen } from "./product-window.tsx";

const screens: Array<{ id: ProductScreen; label: string; description: string }> = [
  { id: "providers", label: "提供方", description: "检查连接和访问诊断" },
  { id: "sources", label: "来源", description: "同步来源并检查扫描影响" },
  { id: "skills", label: "技能", description: "浏览 skill unit 并选择目标" },
  { id: "targets", label: "目标", description: "维护本机 agent 目录" },
  { id: "settings", label: "设置", description: "控制凭据、存储与自动分发" }
];

export default function ProductShowcase() {
  const [activeScreen, setActiveScreen] = useState<ProductScreen>("sources");

  return (
    <section id="product" className="scroll-mt-16 overflow-hidden bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl">
            一套安静、直接的桌面工作界面。
          </h2>
          <p className="mt-5 text-sm leading-7 text-zinc-500">
            页面沿用 desktop
            当前的信息架构：列表负责筛选与批量操作，右侧详情保留版本、路径、扫描结果和目标关系。
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
          <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 pb-3 lg:grid lg:content-start lg:border-b-0 lg:border-t lg:pt-3">
            {screens.map((screen) => {
              const active = screen.id === activeScreen;
              return (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => setActiveScreen(screen.id)}
                  className={`min-w-32 border-l-2 px-3 py-2 text-left transition-colors lg:min-w-0 ${
                    active
                      ? "border-zinc-950 text-zinc-950"
                      : "border-transparent text-zinc-400 hover:text-zinc-700"
                  }`}
                  aria-pressed={active}
                >
                  <span className="block text-sm font-semibold">{screen.label}</span>
                  <span className="mt-1 hidden text-xs leading-5 lg:block">
                    {screen.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="min-w-0 overflow-x-auto pb-4">
            <ProductWindow screen={activeScreen} className="min-w-[760px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
