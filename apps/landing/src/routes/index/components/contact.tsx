import React from "react";
import { ArrowUpRight, Github, Mail, MessageSquare, Send } from "lucide-react";
import { motion } from "motion/react";

// 项目真实的联系邮箱与 GitHub 仓库地址
const CONTACT_EMAIL = "contact@magicfuture.app";
const GITHUB_REPO_URL = "https://github.com/MagicFutureApp/SkillsManager";

const contactMethods = [
  {
    icon: Mail,
    label: "邮件联系",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    description: "一般咨询、反馈与合作"
  },
  {
    icon: Github,
    label: "GitHub Issues",
    value: "提交问题或功能建议",
    href: `${GITHUB_REPO_URL}/issues`,
    description: "Bug 报告与需求讨论"
  },
  {
    icon: MessageSquare,
    label: "帮助文档",
    value: "GitHub Token 配置指南",
    href: "/help/github-token",
    description: "遇到同步或鉴权问题时查看"
  }
] as const;

export default function Contact() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Skills Manager 联系：${name || "你好"}`);
    const body = encodeURIComponent(
      `${message}\n\n——\n来自：${name} <${email}>`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <section className="border-t border-zinc-200 bg-white py-20 sm:py-28" id="contact">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>联系我们</span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            有问题或建议？随时与我们联系
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            无论是使用反馈、Bug 报告还是合作意向，我们都乐意倾听。
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* 直接联系方式 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col gap-5 justify-center"
          >
            {contactMethods.map((method) => (
              <a
                key={method.label}
                href={method.href}
                target={method.href.startsWith("http") ? "_blank" : undefined}
                rel={method.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm transition-colors group-hover:bg-zinc-900 group-hover:text-zinc-50">
                  <method.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-zinc-900">{method.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-700" />
                  </div>
                  <p className="truncate text-sm text-zinc-700">{method.value}</p>
                  <p className="text-xs text-zinc-500">{method.description}</p>
                </div>
              </a>
            ))}
          </motion.div>

          {/* 留言表单 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-zinc-50 p-7"
          >
            <form onSubmit={handleSubmit} className="flex h-full flex-col gap-4">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold text-zinc-700">
                  姓名
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="你的称呼"
                    className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-800 outline-none transition focus:border-zinc-400"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-zinc-700">
                  邮箱
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-800 outline-none transition focus:border-zinc-400"
                  />
                </label>
              </div>
              <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-zinc-700">
                留言
                <textarea
                  required
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="想聊点什么？"
                  rows={5}
                  className="w-full flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal text-zinc-800 outline-none transition focus:border-zinc-400"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 active:scale-[0.99]"
              >
                <Send className="h-4 w-4" />
                <span>发送消息</span>
              </button>
              {/*<p className="text-center text-xs text-zinc-500">
                提交后将通过你的邮件客户端发往 {CONTACT_EMAIL}
              </p>*/}
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
