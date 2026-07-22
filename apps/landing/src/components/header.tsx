import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import skillsManagerMark from "../../../desktop/src/renderer/assets/skills-manager-mark.png";
import type { ReleaseManifestState } from "../hooks/use-release-manifest";
import type { ReleasePlatform } from "../lib/release-manifest";
import DownloadButtonGroup from "./download-button-group";

interface HeaderProps {
  onScrollTo: (sectionId: string) => void;
  release: ReleaseManifestState;
  downloadPlatform: ReleasePlatform;
  onDownloadPlatformChange: (platform: ReleasePlatform) => void;
}

export default function Header({
  onScrollTo,
  release,
  downloadPlatform,
  onDownloadPlatformChange
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "产品能力", id: "features" },
    { label: "交互演示", id: "sandbox" },
    { label: "请我喝杯咖啡", id: "pricing" }
  ];

  const handleNavClick = (id: string) => {
    onScrollTo(id);
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-zinc-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div
          onClick={() => handleNavClick("hero")}
          className="flex cursor-pointer items-center gap-2.5 text-zinc-900 transition-opacity hover:opacity-90"
          id="nav-logo"
        >
          <img src={skillsManagerMark} alt="" className="h-9 w-9" />
          <span className="font-display text-lg font-bold tracking-tight">Skills Manager</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 cursor-pointer"
              id={`nav-link-${item.id}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <DownloadButtonGroup
            platform={downloadPlatform}
            onPlatformChange={onDownloadPlatformChange}
            release={release}
            size="compact"
          />
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 md:hidden cursor-pointer"
          aria-label={isOpen ? "关闭菜单" : "打开菜单"}
          id="nav-mobile-toggle"
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="border-b border-zinc-200 bg-zinc-50 md:hidden"
            id="mobile-menu"
          >
            <div className="space-y-1.5 px-4 pt-2 pb-5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="block w-full text-left rounded-lg py-2.5 px-3 text-base font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                  id={`mobile-nav-link-${item.id}`}
                >
                  {item.label}
                </button>
              ))}
              <div className="mt-4 border-t border-zinc-200 pt-4">
                <DownloadButtonGroup
                  platform={downloadPlatform}
                  onPlatformChange={onDownloadPlatformChange}
                  release={release}
                  fullWidth
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
