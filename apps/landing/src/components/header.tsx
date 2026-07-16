import { Menu, X } from "lucide-react";
import { useState } from "react";

import skillsManagerMark from "../../../desktop/src/renderer/assets/skills-manager-mark.png";

interface HeaderProps {
  onScrollTo: (sectionId: string) => void;
}

const navItems = [
  { label: "产品能力", id: "features" },
  { label: "产品界面", id: "product" },
  { label: "工作方式", id: "workflow" }
] as const;

export default function Header({ onScrollTo }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navigate = (id: string) => {
    onScrollTo(id);
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <button
          type="button"
          className="flex items-center gap-2.5"
          onClick={() => navigate("hero")}
          aria-label="返回首页顶部"
        >
          <img src={skillsManagerMark} alt="" className="size-8" />
          <span className="text-[15px] font-semibold text-zinc-950">Skills Manager</span>
        </button>

        <nav className="hidden items-center gap-7 md:flex" aria-label="主导航">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-950"
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="hidden h-9 items-center rounded-md bg-zinc-950 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-800 md:inline-flex"
          onClick={() => navigate("product")}
        >
          查看产品界面
        </button>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center text-zinc-700 md:hidden"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? "关闭菜单" : "打开菜单"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {isOpen ? (
        <nav
          className="border-t border-zinc-200 bg-white px-5 py-3 md:hidden"
          aria-label="移动端导航"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full py-3 text-left text-sm font-medium text-zinc-700"
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
