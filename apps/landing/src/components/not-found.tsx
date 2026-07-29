import { Link } from "@tanstack/react-router";
import { ArrowRight, FileQuestion } from "lucide-react";
import React from "react";

import Footer from "../components/footer";
import Header from "../components/header";
import { useDownloadPlatform } from "../hooks/use-download-platform";
import { useReleaseManifest } from "../hooks/use-release-manifest";

export default function NotFound() {
  const release = useReleaseManifest();
  const [downloadPlatform, setDownloadPlatform] = useDownloadPlatform();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-zinc-900 selection:text-zinc-50">
      <Header
        release={release}
        downloadPlatform={downloadPlatform}
        onDownloadPlatformChange={setDownloadPlatform}
      />

      <main className="bg-white">
        <section className="mx-auto flex min-h-[calc(100svh-64px)] max-w-7xl items-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm">
              <FileQuestion className="size-8" aria-hidden="true" />
            </div>

            <h1 className="mt-8 font-display text-6xl font-bold tracking-tight text-zinc-950 sm:text-7xl">
              404
            </h1>
            <p className="mt-4 font-display text-2xl font-bold text-zinc-900 sm:text-3xl">
              页面走丢了
            </p>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8">
              你访问的页面不存在，或者已经搬到了别处。
            </p>

            <Link
              to="/"
              className="group mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 active:scale-[0.98]"
            >
              返回首页
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </section>
      </main>

      <Footer
        onScrollToTop={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        release={release}
      />
    </div>
  );
}
