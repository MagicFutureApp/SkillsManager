import React from "react";
import Autoplay from "embla-carousel-autoplay";
import { Sparkles, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import sourcesPreview from "../../../../assets/sources.png";
import skillsPreview from "../../../../assets/skills.png";
import targetsPreview from "../../../../assets/targets.png";
import DownloadButtonGroup from "../../../components/download-button-group";
import HomebrewInstall from "../../../components/homebrew-install";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "../../../components/ui/carousel";
import type { ReleaseManifestState } from "../../../hooks/use-release-manifest";
import type { ReleasePlatform } from "../../../lib/release-manifest";

const heroPreviews = [
  { src: sourcesPreview, alt: "Skills Manager Sources 页面截图" },
  { src: skillsPreview, alt: "Skills Manager Skills 页面截图" },
  { src: targetsPreview, alt: "Skills Manager Targets 页面截图" }
] as const;

interface HeroProps {
  onScrollToSandbox: () => void;
  release: ReleaseManifestState;
  downloadPlatform: ReleasePlatform;
  onDownloadPlatformChange: (platform: ReleasePlatform) => void;
}

export default function Hero({
  onScrollToSandbox,
  release,
  downloadPlatform,
  onDownloadPlatformChange
}: HeroProps) {
  const autoplayPlugin = React.useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: false,
      stopOnMouseEnter: true
    })
  );

  return (
    <section
      className="relative overflow-hidden bg-zinc-50 pt-20 pb-16 lg:pt-32 lg:pb-24"
      id="hero"
    >
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 px-3.5 text-xs font-semibold text-zinc-800 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            <span>本地优先的 Agent Skill 管理工具</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 font-display text-5xl font-extrabold tracking-tight text-zinc-900"
          >
            <span>中心化统一管理技能及来源</span>
            <span className="block text-transparent bg-clip-text bg-linear-to-r from-zinc-900 via-zinc-800 to-zinc-500 mt-2">
              并分发到每个 Agent 或每个项目
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mt-6 max-w-2xl text-base text-zinc-600 sm:text-lg md:text-xl"
          >
            从 Git 或本地目录扫描 SKILL.md，中心化管理，并分发到 Codex、Claude Code、Gemini CLI
            或自定义目录。不丢，不乱。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-10 flex flex-wrap justify-center gap-8"
          >
            {/*<button
              onClick={onScrollToSandbox}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-6 py-3.5 text-sm font-semibold text-zinc-50 shadow-sm transition-all  bg-zinc-900 hover:bg-zinc-800 hover:shadow-lg active:scale-95 cursor-pointer"
              id="hero-btn"
            >
              <span>查看分发预览</span>
              <Play className="h-4 w-4 fill-current text-zinc-50" />
            </button>*/}
            <button
              type="button"
              onClick={onScrollToSandbox}
              className="inline-flex h-11 items-center gap-1 rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
            >
              查看分发预览
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
            <DownloadButtonGroup
              platform={downloadPlatform}
              onPlatformChange={onDownloadPlatformChange}
              release={release}
            />
          </motion.div>

          {downloadPlatform === "macos" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="flex justify-center"
            >
              <HomebrewInstall />
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, type: "spring", stiffness: 50 }}
          className="mx-auto mt-16 max-w-5xl rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-2xl shadow-zinc-200/50"
          id="hero-mockup"
        >
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
            <Carousel
              opts={{ loop: true }}
              plugins={[autoplayPlugin.current]}
              aria-label="Skills Manager 应用页面截图"
            >
              <CarouselContent className="ml-0">
                {heroPreviews.map((preview, index) => (
                  <CarouselItem
                    key={preview.src}
                    className="pl-0"
                    aria-label={`${index + 1} / ${heroPreviews.length}`}
                  >
                    <img
                      src={preview.src}
                      alt={preview.alt}
                      className="block w-full"
                      draggable={false}
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious
                aria-label="上一张"
                className="left-3 z-10 border-zinc-200 bg-white/90 text-zinc-800 shadow-md backdrop-blur-sm hover:bg-white focus-visible:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:opacity-0"
              />
              <CarouselNext
                aria-label="下一张"
                className="right-3 z-10 border-zinc-200 bg-white/90 text-zinc-800 shadow-md backdrop-blur-sm hover:bg-white focus-visible:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:opacity-0"
              />
            </Carousel>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
