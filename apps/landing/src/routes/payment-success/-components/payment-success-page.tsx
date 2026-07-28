import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck } from "lucide-react";
import React from "react";

import Footer from "../../../components/footer";
import Header from "../../../components/header";
import { useDownloadPlatform } from "../../../hooks/use-download-platform";
import { useReleaseManifest } from "../../../hooks/use-release-manifest";

export default function PaymentSuccessPage() {
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
              <BadgeCheck className="size-8" aria-hidden="true" />
            </div>

            <h1 className="mt-8 font-display text-4xl font-bold leading-tight text-zinc-950 sm:text-5xl">
              谢谢你的咖啡
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8">
              谢谢你愿意支持这个本地优先的小工具。你的这杯咖啡，会继续变成更可靠的技能管理与分发体验。
            </p>

            <Link
              to="/"
              className="group mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 active:scale-[0.98]"
            >
              返回 Skills Manager
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
