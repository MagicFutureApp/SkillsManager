import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../index.css?url";
import skillsManagerMark from "../../../desktop/src/renderer/assets/skills-manager-mark.png?url";
import NotFound from "../components/not-found";
import { getReleaseManifest } from "@/lib/server/release-manifest.ts";

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  loader: async () => {
    const releaseManifest = await getReleaseManifest();
    return { releaseManifest };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      { title: "Skills Manager - 本地优先的 agent skill 管理工具" },
      {
        name: "description",
        content: "统一管理技能来源、版本和安装目标，把 agent skills 可靠分发到本机工具。"
      }
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: skillsManagerMark }
    ]
  }),
  shellComponent: RootDocument
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
