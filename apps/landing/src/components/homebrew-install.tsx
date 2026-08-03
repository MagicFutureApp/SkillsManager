import { useState } from "react";
import { Copy, Check } from "lucide-react";

const HOMEBREW_COMMANDS = `brew tap MagicFutureApp/skills-manager https://github.com/MagicFutureApp/SkillsManager
brew trust magicfutureapp/skills-manager
brew install --cask skills-manager`;

export default function HomebrewInstall() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(HOMEBREW_COMMANDS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用时静默失败，命令仍可手动选择复制
    }
  };

  return (
    <div className="homebrew-install mt-4 w-fit max-w-full text-left">
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-3.5 py-2">
          <span className="font-mono text-xs text-zinc-400">macOS · Homebrew</span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="复制 Homebrew 安装命令"
            className="inline-flex shrink-0 items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            <span>{copied ? "已复制" : "复制"}</span>
          </button>
        </div>
        <pre className="select-text overflow-x-auto px-3.5 py-3 font-mono text-xs leading-relaxed text-zinc-100">
          <code>{HOMEBREW_COMMANDS}</code>
        </pre>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        仅支持 Apple Silicon（arm64），要求 macOS Monterey 或更高。
      </p>
    </div>
  );
}
