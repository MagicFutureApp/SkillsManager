import Features from "./components/features";
import Footer from "./components/footer";
import Header from "./components/header";
import Hero from "./components/hero";
import ProductShowcase from "./components/interactive-sandbox";

export default function App() {
  const scrollTo = (id: string) => {
    if (id === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950 selection:bg-zinc-950 selection:text-white">
      <Header onScrollTo={scrollTo} />
      <main>
        <Hero
          onScrollToProduct={() => scrollTo("product")}
          onScrollToWorkflow={() => scrollTo("workflow")}
        />
        <Features />
        <ProductShowcase />
        <Workflow />
      </main>
      <Footer onScrollToTop={() => scrollTo("hero")} />
    </div>
  );
}

function Workflow() {
  const steps = [
    ["01", "登记来源", "添加 GitHub、GitLab、本地 Git 或本地目录来源。"],
    ["02", "同步与扫描", "把来源同步到统一缓存，按约定发现 SKILL.md。"],
    ["03", "选择目标", "为每个 skill unit 选择 Codex、Claude Code、Gemini CLI 或自定义目录。"],
    ["04", "确认分发", "预览冲突和变更后，以 copy 方式写入目标并记录安装事实。"]
  ];

  return (
    <section
      id="workflow"
      className="scroll-mt-16 border-t border-zinc-200 bg-zinc-950 py-20 text-white sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div>
            <h2 className="text-3xl font-semibold sm:text-4xl">从来源到目标，路径始终清楚。</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">
              来源、skill unit、版本、目标偏好和实际安装分别记录，不把“想安装”误当成“已安装”。
            </p>
          </div>
          <ol className="grid border-t border-zinc-700 sm:grid-cols-2">
            {steps.map(([number, title, description]) => (
              <li key={number} className="border-b border-zinc-700 py-6 sm:px-6 sm:odd:border-r">
                <span className="font-mono text-xs text-zinc-500">{number}</span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
