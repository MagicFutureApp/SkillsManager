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
    <div className="w-full max-w-sm text-left">
      <p className="mb-2 text-sm text-zinc-500">macOS 也可使用 Homebrew 安装：</p>
      <div className="relative rounded-md border border-zinc-200 bg-zinc-900">
        <pre className="overflow-x-auto px-3.5 py-3 font-mono text-sm leading-relaxed text-zinc-100">
          <code>{HOMEBREW_COMMANDS}</code>
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="复制 Homebrew 安装命令"
          className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        仅支持 Apple Silicon（arm64），要求 macOS Monterey 或更高。
      </p>
    </div>
  );
}
