# Skills Manager Cache Manager

skills.sh catalog 的本地优先中心缓存。Cloudflare Worker 使用 Hono 提供只读 catalog API，Cloudflare KV 保存最近两代完整分页快照；一个极小的 Vercel Function 只负责向 Cloudflare 返回 request-scoped OIDC token，所有 skills.sh 数据请求都由 Cloudflare 发起。

catalog 不再由 Cron 定时刷新。用户读取 catalog 时，如果当前 generation 已超过 6 小时，Worker 立即返回旧数据并在后台构建完整的新 generation；完全没有缓存时返回 `202 catalog_warming`，客户端按 `Retry-After` 重试。缓存服务不保存 skill `files`、`SKILL.md`、Git repository、安装包、搜索词或凭据。安装仍由 Electron main process 使用系统 Git 完成。

## API

```text
GET  /health
GET  /v1/catalog
GET  /v1/catalog/:generation/pages/:page
GET  /v1/skills/:source/:skill
GET  /v1/status
POST /internal/sync
```

先读取 `/v1/catalog`，再使用 manifest 中同一个 generation 拉取所有分页。一次同步不能混用不同 generation。最新 generation 尚未传播到当前 Cloudflare location 时，分页接口返回 503；客户端可以显式改用 manifest 中的 previous generation。

GitHub source 含有 owner/repository 两段，因此实际详情路径示例为：

```text
GET /v1/skills/vercel-labs/skills/find-skills
```

详情缓存使用 Workers Cache API：5 分钟内返回 `HIT`，过期后先返回最多保留 1 小时的 `STALE` 数据并异步刷新。Worker 会剔除上游详情中的 `files`，但保留轻量的 `hash`。响应通过 `X-Cache: HIT | MISS | STALE` 暴露缓存状态。

## Local validation

```bash
pnpm --filter @skills-manager/cache-manager test
pnpm --filter @skills-manager/cache-manager run check
pnpm --filter @skills-manager/cache-manager run build
```

本地 Worker 配置写入 `apps/cache-manager/.dev.vars`，参考 `.dev.vars.example`。该文件已忽略，禁止提交真实 secret。

```bash
pnpm --filter @skills-manager/cache-manager run dev
```

完整的 Vercel Token Broker、Cloudflare KV/Worker 部署与验收步骤参见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## Vercel Token Broker

在 Vercel 创建项目，Root Directory 指向 `apps/cache-manager`，启用 `Settings -> OIDC Federation`，并配置：

```text
SKILLS_SH_TOKEN_SECRET=<long-random-secret>
```

Token endpoint 是：

```text
POST https://<project>.vercel.app/api/token
Authorization: Bearer <SKILLS_SH_TOKEN_SECRET>
```

成功响应：

```json
{
  "token": "<vercel-oidc-token>",
  "expiresAt": 1785398400
}
```

Token Broker 不请求 skills.sh，不接受 page、source、skill 或任意上游 URL。它只在认证通过后调用 `getVercelOidcToken()`，校验 JWT `exp`，并返回 `Cache-Control: no-store` 的响应。

Cloudflare 使用该 Token 直接请求：

```text
https://skills.sh/api/v1/skills?view=all-time&page=<page>&per_page=500
https://skills.sh/api/v1/skills/<source>/<skill>
```

OIDC Token 仅保存在当前 Worker isolate 的模块内存中，按 JWT `exp` 提前 60 秒失效。Token 不写入 KV、D1、Workers Cache API、日志或任何公开响应；skills.sh 返回 `401` 时清除旧 Token，重新获取后只重试一次。

## Cloudflare Worker

创建 KV namespace：

```bash
pnpm --filter @skills-manager/cache-manager exec wrangler kv namespace create SKILLS_SH_CACHE
```

将返回的 namespace ID 添加到 `wrangler.jsonc` 的 `SKILLS_SH_CACHE.id`。然后配置三个 Worker secret：

```bash
pnpm --filter @skills-manager/cache-manager exec wrangler secret put SKILLS_SH_TOKEN_URL
pnpm --filter @skills-manager/cache-manager exec wrangler secret put SKILLS_SH_TOKEN_SECRET
pnpm --filter @skills-manager/cache-manager exec wrangler secret put CACHE_ADMIN_TOKEN
```

`SKILLS_SH_TOKEN_URL` 填写 `https://<project>.vercel.app/api/token`。Cloudflare 和 Vercel 的 `SKILLS_SH_TOKEN_SECRET` 必须一致，`CACHE_ADMIN_TOKEN` 必须使用另一个随机值。

部署：

```bash
pnpm --filter @skills-manager/cache-manager run deploy
```

catalog 由 `/v1/catalog` 或分页读取触发刷新，不需要配置 Cron Trigger。仍可以手动触发：

```bash
curl -X POST "https://<worker-domain>/internal/sync" \
  -H "Authorization: Bearer <CACHE_ADMIN_TOKEN>"
```

## KV keys

```text
catalog:all-time:manifest
catalog:all-time:<generation>:page:<page>
catalog:all-time:sync-status
```

只有全部分页写入成功后才切换 manifest。失败同步会保留当前 catalog，并尽力清理未发布 generation；成功同步保留 current 和 previous 两代，删除更旧的一代。

访问触发的刷新在单个 Worker isolate 内使用 single-flight，避免同一时刻重复构建。第一版不增加仅用于租约的 D1；不同 Cloudflare location 极端并发时仍可能各启动一次刷新。如果实际流量证明这会触发上游限流，再增加 D1 或 Durable Object 全局租约。
