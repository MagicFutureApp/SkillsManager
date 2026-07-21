import React from "react";
import { GitPullRequestArrow, Boxes, CopyCheck, HardDrive, LayoutGrid } from "lucide-react";
import { motion } from "motion/react";
import type { Variants } from "motion/react";

export default function Features() {
  const cards = [
    {
      icon: GitPullRequestArrow,
      title: "统一管理技能来源",
      description: "登记远程 Git、本地 Git、本地目录和技能市场来源，手动控制同步时机。",
      badge: "来源管理",
      gridSpan: "md:col-span-2"
    },
    {
      icon: Boxes,
      title: "以 Skill 为中心",
      description:
        "一个仓库可以发现多个技能。扫描器从 SKILL.md 建立统一模型，并可将 Skill 多对多分发。",
      badge: "技能分发",
      gridSpan: "md:col-span-1"
    },
    {
      icon: CopyCheck,
      title: "先预览后分发",
      description: "先查看分发计划，再完成检查和分发。",
      badge: "可控分发",
      gridSpan: "md:col-span-1"
    },
    {
      icon: HardDrive,
      title: "本地优先，多目标管理",
      description:
        "可以自动发现系统已存在 Agent Skills 目录，并实现 Skills 和本地同步目录多对多同步管理。",
      badge: "目标管理",
      gridSpan: "md:col-span-2"
    }
  ];

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } }
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <section className="bg-white py-20 sm:py-28 border-t border-zinc-200" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>产品能力</span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            统一管理来源，统一分发技能。
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Skills Manager 把来源发现、技能拆分、目标偏好和实际安装拆成清楚的本地工作流。
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3"
          id="features-bento-grid"
        >
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              variants={itemVariants}
              className={`group flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50 p-6 shadow-sm transition-all hover:bg-white hover:shadow-md ${card.gridSpan}`}
              id={`feature-card-${i}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-900 shadow-sm group-hover:bg-zinc-900 group-hover:text-zinc-50 transition-colors">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-zinc-200/50 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
                    {card.badge}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-lg font-bold text-zinc-900 group-hover:text-zinc-950">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{card.description}</p>
              </div>
              <div className="mt-8 border-t border-zinc-100 pt-4 flex items-center gap-1.5 text-xs font-semibold text-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>了解工作方式</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
