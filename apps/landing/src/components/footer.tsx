import React, { useState } from "react";
import { ArrowUp, Send, Heart } from "lucide-react";
import skillsManagerMark from "../../../desktop/src/renderer/assets/skills-manager-mark.png";

interface FooterProps {
  onScrollToTop: () => void;
}

export default function Footer({ onScrollToTop }: FooterProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 3000);
  };

  const linkGroups = [
    {
      title: "产品",
      links: [
        { label: "交互工作台", href: "#sandbox" },
        { label: "产品能力", href: "#features" },
        { label: "分发预览", href: "#sandbox" },
        { label: "版本范围", href: "#pricing" }
      ]
    },
    {
      title: "工作流",
      links: [
        { label: "提供方诊断", href: "#sandbox" },
        { label: "来源同步", href: "#sandbox" },
        { label: "Skill 索引", href: "#sandbox" },
        { label: "目标分发", href: "#sandbox" }
      ]
    },
    {
      title: "本地边界",
      links: [
        { label: "系统 Git 认证", href: "#features" },
        { label: "SQLite 索引", href: "#features" },
        { label: "copy-only 分发", href: "#features" },
        { label: "路径安全检查", href: "#features" }
      ]
    }
  ];

  return (
    <footer className="bg-zinc-950 text-zinc-400 border-t border-zinc-900" id="footer">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex justify-between items-center gap-10 border-b border-zinc-900 pb-12">
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <img src={skillsManagerMark} alt="" className="h-9 w-9" />
              <span className="font-display text-lg font-bold tracking-tight">Skills Manager</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              聚合技能来源、建立本地索引，并把选中的 Skill 可靠分发到本机 Agent 目标。
            </p>
          </div>
          <div className="flex flex-col justify-between items-start md:items-end col-span-2 md:col-span-1">
            <button
              onClick={onScrollToTop}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
              id="footer-back-to-top"
            >
              <span>返回顶部</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] text-zinc-500 mt-4 font-mono select-none">v0.1.0</span>
          </div>
        </div>

        <div className="border-t border-zinc-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 Skills Manager。所有索引与设置默认保存在本机。</p>
          <p className="flex items-center gap-1.5">
            <span>为本地 Agent 工作流构建</span>
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 animate-pulse" />
          </p>
        </div>
      </div>
    </footer>
  );
}
