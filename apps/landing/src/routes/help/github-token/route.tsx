import { createFileRoute } from "@tanstack/react-router";

import GitHubTokenHelp from "./components/github-token-help";

export const Route = createFileRoute("/help/github-token")({
  head: () => ({
    meta: [
      { title: "如何创建 GitHub token - Skills Manager 帮助" },
      {
        name: "description",
        content: "为 Skills Manager 创建最小权限的 GitHub Fine-grained personal access token。"
      }
    ]
  }),
  component: GitHubTokenHelp
});
