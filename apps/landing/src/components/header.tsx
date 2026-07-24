import { Link } from "@tanstack/react-router";
import React, { type MouseEvent, useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import skillsManagerMark from "../../../desktop/src/renderer/assets/skills-manager-mark.png";
import type { ReleaseManifestState } from "../hooks/use-release-manifest";
import type { ReleasePlatform } from "../lib/release-manifest";
import DownloadButtonGroup from "./download-button-group";

interface HeaderProps {
  onScrollTo?: (sectionId: string) => void;
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

  const homeNavItems = [
    { label: "产品能力", id: "features" },
    { label: "交互演示", id: "sandbox" },
    { label: "请我喝杯咖啡", id: "pricing" }
  ];

  const handleHomeNavClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (onScrollTo) {
      event.preventDefault();
      onScrollTo(id);
    }
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-zinc-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          onClick={(event) => handleHomeNavClick(event, "hero")}
          className="flex cursor-pointer items-center gap-2.5 text-zinc-900 transition-opacity hover:opacity-90"
          id="nav-logo"
        >
          <img src={skillsManagerMark} alt="" className="h-9 w-9" />
          <span className="font-display text-lg font-bold tracking-tight">Skills Manager</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {homeNavItems.map((item) => (
            <Link
              key={item.id}
              to="/"
              hash={item.id}
              onClick={(event) => handleHomeNavClick(event, item.id)}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 cursor-pointer"
              id={`nav-link-${item.id}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/help/github-token"
            className="cursor-pointer text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            activeProps={{ className: "text-zinc-900" }}
          >
            帮助
          </Link>
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
              {homeNavItems.map((item) => (
                <Link
                  key={item.id}
                  to="/"
                  hash={item.id}
                  onClick={(event) => handleHomeNavClick(event, item.id)}
                  className="block w-full text-left rounded-lg py-2.5 px-3 text-base font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                  id={`mobile-nav-link-${item.id}`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/help/github-token"
                onClick={() => setIsOpen(false)}
                className="block w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-base font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                activeProps={{ className: "bg-zinc-100 text-zinc-900" }}
              >
                帮助
              </Link>
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
