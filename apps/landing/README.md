# Skills Manager Landing

Skills Manager 的 TanStack Start landing 应用。页面使用 TanStack Router 文件路由，现有 landing 内容位于根路由 `src/routes/index.tsx`。

## Run Locally

在仓库根目录安装依赖：

```bash
pnpm install
```

启动 landing：

```bash
pnpm --filter @skills-manager/landing run dev
```

## Validation

```bash
pnpm --filter @skills-manager/landing run check
pnpm --filter @skills-manager/landing run build
```

## Cloudflare Workers

Landing 使用 `@cloudflare/vite-plugin` 部署到 Cloudflare Workers，并通过
`SKILLS_MANAGER_RELEASE_MANIFEST` KV binding 读取最新桌面版本信息。Worker 暴露
`GET /api/releases/latest`，成功响应缓存 5 分钟；KV 中不存在有效 manifest 时返回 404。

首次部署前创建 KV namespace：

```bash
pnpm --filter @skills-manager/landing exec wrangler kv namespace create SKILLS_MANAGER_RELEASE_MANIFEST
```

把命令返回的 namespace ID 写入 `wrangler.jsonc` 的 `SKILLS_MANAGER_RELEASE_MANIFEST.id`，然后生成类型并部署：

```bash
pnpm --filter @skills-manager/landing run cf-typegen
pnpm --filter @skills-manager/landing run deploy
```

本地 Worker 开发使用 Wrangler 的本地 KV。发布 workflow 在生产 KV 中写入固定 key
`latest`，landing 本身不保存或硬编码桌面版本号。

## Release Manifest

推送 `v*` tag 后，`.github/workflows/build-desktop-installers.yml` 会校验 tag 与
`apps/desktop/package.json` 的版本一致，发布三个平台安装包，生成 `latest.json`，然后把它：

- 上传到对应的公开 GitHub Release；
- 写入 Cloudflare KV 的 `latest` key。

重跑旧 tag 时只更新该 Release 的 assets；workflow 仅在当前 tag 仍是公开仓库 latest Release 时更新 KV，避免 landing 回退到旧版本。

源仓库需要配置以下 GitHub Actions secrets：

- `PUBLIC_RELEASE_TOKEN`：写入 `MagicFutureApp/SkillsManager-Releases`；
- `CLOUDFLARE_API_TOKEN`：至少具有目标 namespace 的 Workers KV Storage Write 权限；
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare account ID；
- `CLOUDFLARE_RELEASE_KV_NAMESPACE_ID`：`SKILLS_MANAGER_RELEASE_MANIFEST` namespace ID。
