import React from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const faqItems = [
  {
    question: "为什么安装时会提示「已损坏」或「无法验证开发者」？",
    answer:
      "当前发布的安装包尚未进行代码签名，不影响应用功能，但会触发各平台对未签名程序的默认安全提示。"
  },
  {
    question: "macOS 上打不开应用怎么办？",
    answer:
      "在 Finder 中右键（或按住 Control 单击）Skills Manager.app，选择「打开」，再在弹窗中点击「打开」即可放行。如果仍被拦截，可在终端执行 xattr -cr /Applications/Skills\\ Manager.app 移除下载隔离标记（路径替换为实际安装位置）。"
  },
  {
    question: "Windows 安装时被 SmartScreen 拦截怎么办？",
    answer:
      "运行安装程序时若看到「Windows 已保护你的电脑」的红色警告，点击「更多信息」，下方会出现「仍要运行」按钮，点击即可继续安装。这是因为没有对应用进行签名。"
  },
  {
    question: "Linux 安装会受影响吗？",
    answer:
      "不会。.deb 包没有 GPG 签名，使用 apt install 或图形包管理器安装都不会校验签名，也不会弹出类似 macOS / Windows 的安全拦截。只要确认下载来源可靠即可。"
  },
  {
    question: "未签名会影响应用功能吗？安全吗？",
    answer:
      "不影响功能，签名只影响系统的信任与拦截逻辑。只要安装包来自官方网站或 GitHub Releases 等官方渠道，移除隔离标记或放行 SmartScreen 都是安全的。核心风险来自安装包是否被篡改，因此请务必核对下载来源。"
  },
  {
    question: "未来会提供签名版本吗？",
    answer:
      "有可能。"
  }
];

export default function Faq() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <section className="bg-zinc-50 py-20 sm:py-28 border-t border-zinc-200" id="faq">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-800 border border-zinc-200">
            <CircleHelp className="h-3.5 w-3.5" />
            <span>常见问题</span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            安装与使用答疑
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            关于未签名安装包在各平台上的提示与绕过方式。
          </p>
        </div>

        <div className="mt-12 space-y-3" id="faq-list">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.question}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                id={`faq-item-${index}`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(index)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
                  id={`faq-question-${index}`}
                >
                  <span className="font-display text-base font-semibold text-zinc-900">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-zinc-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-zinc-600">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
