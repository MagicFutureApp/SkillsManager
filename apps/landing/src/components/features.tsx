import { Boxes, CopyCheck, GitPullRequestArrow, HardDrive } from "lucide-react";

const features = [
  {
    icon: GitPullRequestArrow,
    title: "统一管理技能来源",
    description:
      "检查提供方连接，登记远程 Git、本地 Git 和技能市场来源，手动控制同步时机，并保留分支、commit 与扫描状态。"
  },
  {
    icon: Boxes,
    title: "以 skill unit 为中心",
    description:
      "一个仓库可以发现多个技能。扫描器从 SKILL.md 建立统一的 skill unit 模型，而不是把整个 repository 当作一个技能。"
  },
  {
    icon: CopyCheck,
    title: "可预览的 copy 分发",
    description:
      "分发前查看 install、update、skip 与 conflict；确认后由 Electron main process 做路径检查、文件复制和事实记录。"
  },
  {
    icon: HardDrive,
    title: "本地优先，凭据留在本机",
    description:
      "索引与安装状态保存在本地 SQLite。系统 Git 负责认证，renderer 不直接接触文件系统、命令或数据库。"
  }
] as const;

export default function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-16 border-b border-zinc-200 bg-zinc-50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div>
            <h2 className="max-w-lg text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl">
              管理的是技能，不只是仓库。
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-500">
              Skills Manager 把来源发现、版本解析、目标偏好和安装结果拆成清楚的本地工作流。
            </p>
          </div>

          <div className="grid border-t border-zinc-300 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="border-b border-zinc-300 py-7 sm:px-6 sm:odd:border-r"
              >
                <Icon className="size-5 text-zinc-900" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="mt-7 text-base font-semibold text-zinc-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
