import { ArrowUp } from "lucide-react";

import skillsManagerMark from "../../../desktop/src/renderer/assets/skills-manager-mark.png";

interface FooterProps {
  onScrollToTop: () => void;
}

export default function Footer({ onScrollToTop }: FooterProps) {
  return (
    <footer className="border-t border-zinc-200 bg-white py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2.5">
          <img src={skillsManagerMark} alt="" className="size-7" />
          <div>
            <p className="text-sm font-semibold text-zinc-900">Skills Manager</p>
            <p className="mt-0.5 text-xs text-zinc-400">本地优先的 agent skill 管理工具</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onScrollToTop}
          className="inline-flex items-center gap-2 self-start text-xs font-medium text-zinc-500 hover:text-zinc-950 sm:self-auto"
        >
          返回顶部
          <ArrowUp className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}
