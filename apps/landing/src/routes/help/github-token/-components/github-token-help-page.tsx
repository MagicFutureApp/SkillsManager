import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Github,
  KeyRound,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";
import React from "react";

import Footer from "../../../../components/footer";
import Header from "../../../../components/header";
import { useDownloadPlatform } from "../../../../hooks/use-download-platform";
import { useReleaseManifest } from "../../../../hooks/use-release-manifest";

const GITHUB_TOKEN_CREATION_URL =
  "https://github.com/settings/personal-access-tokens/new?name=Skills+Manager&description=Read+repository+metadata+and+SKILL.md+files&contents=read";

const creationSteps = [
  {
    title: "打开 Fine-grained token 创建页",
    description: "登录 GitHub 后打开创建页面。Skills Manager 已为 token 名称和用途填入建议值。"
  },
  {
    title: "设置有效期",
    description: "选择符合你使用周期的 Expiration。建议使用有限有效期，并在到期后按需更新。"
  },
  {
    title: "选择资源所有者",
    description: "在 Resource owner 中选择个人账号，或选择允许你创建 token 的组织。"
  },
  {
    title: "限制仓库范围",
    description:
      "公开仓库无需单独选择，Fine-grained token 默认包含对所有公开仓库的只读访问。仅在需要访问私有仓库时，在 Repository access 中选择 Only select repositories，并只勾选需要由 Skills Manager 扫描的仓库。"
  },
  {
    title: "确认只读权限",
    description:
      "在 Repository permissions 中将 Contents 设为 Read-only。Metadata 会保持必需的 Read-only。"
  },
  {
    title: "生成并保存",
    description:
      "点击 Generate token，立即复制生成的值，然后打开 Skills Manager 的“设置 > 凭证管理”，在 GitHub token 区块中保存。"
  }
] as const;

const tableOfContents = [
  { href: "#before-you-start", label: "开始前" },
  { href: "#create-token", label: "创建步骤" },
  { href: "#permissions", label: "所需权限" },
  { href: "#save-token", label: "保存到应用" },
  { href: "#security", label: "安全建议" }
] as const;

export default function GitHubTokenHelpPage() {
  const release = useReleaseManifest();
  const [downloadPlatform, setDownloadPlatform] = useDownloadPlatform();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-zinc-900 selection:text-zinc-50">
      <Header
        release={release}
        downloadPlatform={downloadPlatform}
        onDownloadPlatformChange={setDownloadPlatform}
      />

      <main>
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              返回首页
            </Link>

            <div className="mt-10 max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600">
                <Github className="size-5" aria-hidden="true" />
                Skills Manager 帮助
              </div>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">
                如何创建 GitHub token
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                使用 Fine-grained personal access token 为 Skills Manager
                提供最小范围的仓库只读访问， 用于读取 repository metadata、目录结构和 SKILL.md
                文件。
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-16">
          <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="本页目录">
            <p className="text-xs font-semibold uppercase text-zinc-500">本页目录</p>
            <nav className="mt-4 grid gap-1 border-l border-zinc-200">
              {tableOfContents.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="border-l-2 border-transparent py-1.5 pl-4 text-sm text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 max-w-3xl">
            <section id="before-you-start" className="scroll-mt-24">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-zinc-500" aria-hidden="true" />
                <h2 className="font-display text-2xl font-semibold">开始前</h2>
              </div>
              <p className="mt-4 text-base leading-7 text-zinc-600">
                优先创建 Fine-grained personal access
                token。它可以精确限制资源所有者、仓库范围和权限， 比 classic token 更适合 Skills
                Manager 的只读扫描场景。
              </p>
              <div className="mt-6 border-l-2 border-emerald-600 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-950">
                不需要授予写入权限。Skills Manager 只通过 GitHub API 读取仓库元数据和文件目录。
              </div>
              <a
                href={GITHUB_TOKEN_CREATION_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-zinc-400/50"
              >
                打开 GitHub token 创建页面
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </section>

            <section
              id="create-token"
              className="mt-14 scroll-mt-24 border-t border-zinc-200 pt-14"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="size-5 text-zinc-500" aria-hidden="true" />
                <h2 className="font-display text-2xl font-semibold">创建步骤</h2>
              </div>
              <ol className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
                {creationSteps.map((step, index) => (
                  <li
                    key={step.title}
                    className="grid gap-4 py-6 sm:grid-cols-[40px_minmax(0,1fr)]"
                  >
                    <span className="flex size-9 items-center justify-center rounded-md bg-zinc-900 font-mono text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-zinc-950">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section id="permissions" className="mt-14 scroll-mt-24 border-t border-zinc-200 pt-14">
              <h2 className="font-display text-2xl font-semibold">所需权限</h2>
              <p className="mt-4 text-base leading-7 text-zinc-600">
                Repository permissions 只需要以下两个只读权限。不要额外开启写入权限。
              </p>
              <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-zinc-200 bg-zinc-100 px-4 py-3 text-xs font-semibold text-zinc-600">
                  <span>权限</span>
                  <span>访问级别</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-zinc-200 px-4 py-4 text-sm">
                  <span className="font-medium">Contents</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <Check className="size-4" aria-hidden="true" />
                    Read-only
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 text-sm">
                  <span className="font-medium">Metadata</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <Check className="size-4" aria-hidden="true" />
                    Read-only
                  </span>
                </div>
              </div>
            </section>

            <section id="save-token" className="mt-14 scroll-mt-24 border-t border-zinc-200 pt-14">
              <h2 className="font-display text-2xl font-semibold">保存到 Skills Manager</h2>
              <p className="mt-4 text-base leading-7 text-zinc-600">
                GitHub 只会显示新 token 一次。生成后立即复制它，打开桌面应用的
                <strong className="font-semibold text-zinc-900">
                  {" "}
                  设置 &gt; 凭证管理
                </strong>
                ，在 GitHub token 区块中粘贴并点击“保存”。
              </p>
              <div className="mt-6 flex items-start gap-3 border-l-2 border-zinc-300 bg-white px-5 py-4">
                <LockKeyhole className="mt-0.5 size-5 shrink-0 text-zinc-500" aria-hidden="true" />
                <p className="text-sm leading-6 text-zinc-600">
                  保存后的 token 不会在界面中回显。需要替换时，输入新 token 并再次保存即可。
                </p>
              </div>
            </section>

            <section id="security" className="mt-14 scroll-mt-24 border-t border-zinc-200 pt-14">
              <h2 className="font-display text-2xl font-semibold">安全建议</h2>
              <ul className="mt-5 grid gap-3 text-sm leading-6 text-zinc-600">
                <li className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  仅在需要访问私有仓库时选择必要仓库，不要选择 All
                  repositories；只访问公开仓库时，无需选择任何私有仓库。
                </li>
                <li className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  使用有限有效期，并在不再使用时从 GitHub 撤销 token。
                </li>
                <li className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  不要把 token 粘贴到聊天、issue、日志、截图或版本控制文件中。
                </li>
              </ul>
            </section>
          </article>
        </div>
      </main>

      <Footer
        onScrollToTop={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        release={release}
      />
    </div>
  );
}
