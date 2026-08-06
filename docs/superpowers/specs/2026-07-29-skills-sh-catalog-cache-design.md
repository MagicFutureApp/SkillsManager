# skills.sh Catalog Cache Design

## Goal

在 `apps/cache-manager` 中提供一个很小的 skills.sh 元数据缓存服务，降低桌面客户端直接调用上游 API 带来的 Vercel OIDC 和 rate limit 压力。

缓存层只负责技能发现数据，不负责安装内容。技能安装仍由 Electron main process 使用系统 Git clone/fetch，在本地扫描 `SKILL.md`，解析并记录精确 `commit_sha`，最后进入现有 copy-only 分发流程。

## Scope

第一版包含：

- Cloudflare Workers 上的 Hono API。
- Cloudflare KV 中的版本化 `all-time` catalog 分页快照。
- 用户访问触发、6 小时 soft TTL 的 catalog 完整快照刷新。
- 受共享 secret 保护的 Vercel OIDC Token Broker。
- catalog manifest、固定 generation 分页和同步状态 API。
- 使用 Workers Cache API 的 skill detail 精确缓存。
- 经 cache-manager 代理的 skills.sh 搜索 API（`GET /v1/catalog/search`），复用同一 OIDC Token Broker 与 Workers Cache。
- 手动触发同步的受保护内部 API。

第一版不包含：

- skills.sh detail endpoint 返回的 `files`；轻量 `hash` 可以保留。
- `SKILL.md`、Git archive、repository 或安装包缓存。
- 任意搜索词的**持久化**缓存（KV 版本化快照）。搜索走实时代理 + 60 秒 Workers Cache，不落 KV。
- curated、trending、hot 或 audit。
- well-known source 的安装实现。
- Electron renderer 直连 Worker（发现页一律经由 main process 消费，见 Desktop consumer contract）。

## Runtime Topology

```text
Electron main process
  -> Cloudflare Worker (Hono)
    -> Cloudflare KV catalog snapshots

Electron main process
  -> Cloudflare Worker /v1/catalog/search
    -> skills.sh /api/v1/skills/search   (real-time proxy, 60s Workers Cache)

Cloudflare access-triggered/manual sync
  -> protected Vercel Token Broker
    -> request-scoped Vercel OIDC token
  -> skills.sh /api/v1/skills with that token
```

Vercel 不请求或转发 skills.sh 数据。Token Broker 只接受受共享 secret 保护的 `POST /api/token`，每次请求调用 `getVercelOidcToken()`，校验 JWT `exp` 后把 Token 和过期时间返回给 Cloudflare。

Cloudflare 在 Worker isolate 模块内存中短暂复用 Token，按 `exp` 提前 60 秒失效，并使用 single-flight 合并并发 Token 请求。Token 不得写入 KV、D1、Workers Cache API、日志、错误信息或公开响应。Cloudflare 直接请求固定的 skills.sh catalog/detail URL；detail 响应必须剔除顶层 `files`，避免完整文件内容进入中心缓存。

## Refresh Strategy

- catalog generation 的 fresh TTL 为 6 小时。
- fresh generation 直接返回，不调用上游。
- stale generation 继续立即返回，同时通过 `waitUntil` 构建完整的新 generation。
- 没有任何 generation 时返回 `202 catalog_warming` 和 `Retry-After: 2`，并启动首次构建。
- 只有全部分页成功后才切换 manifest；任何失败都继续保留旧 generation。
- manifest 和分页读取都可以触发刷新，但单个 Worker isolate 内共享同一个 in-flight Promise。
- 第一版不为了全局刷新租约引入 D1。跨 location 极端并发可能重复刷新；实际出现上游限流后再升级为 D1 或 Durable Object 租约。

不对过期 generation 执行逐页同步删除。过期是 manifest 层的逻辑状态，旧 generation 保留为 stale/failure fallback，直到后续一次成功发布时按现有两代规则清理。

## KV Layout

```text
catalog:all-time:manifest
catalog:all-time:<generation>:page:<page>
catalog:all-time:sync-status
```

manifest 同时保留当前和上一代快照描述：

```ts
type CatalogManifest = {
  schemaVersion: 1;
  current: CatalogSnapshot;
  previous?: CatalogSnapshot;
};
```

只有所有分页都成功写入 KV 后才能切换 manifest。切换完成后删除旧 manifest 中的 `previous` generation，使 KV 始终最多保留两代完整快照。

公开分页 API 必须携带 generation。客户端不能在一次本地同步中混用不同 generation；如果最新 generation 尚未在当前 Cloudflare location 完成传播，客户端可以显式回退到 manifest 中的 `previous` generation。

## API

```text
GET  /health
GET  /v1/catalog
GET  /v1/catalog/search?q=&limit=&owner=
GET  /v1/catalog/:generation/pages/:page
GET  /v1/skills/<source>/<skill>
GET  /v1/status
POST /internal/sync
```

`/v1/catalog/search` 必须注册在 `/v1/catalog/:generation/pages/:page` 之前，否则 `search` 会被当作 generation 匹配。

`POST /internal/sync` 需要 `Authorization: Bearer <CACHE_ADMIN_TOKEN>`。

Vercel Token Broker：

```text
POST /api/token
Authorization: Bearer <SKILLS_SH_TOKEN_SECRET>
```

成功响应只包含 `{ token, expiresAt }`，并设置 `Cache-Control: no-store` 和 `Pragma: no-cache`。Cloudflare 通过 `SKILLS_SH_TOKEN_URL` 调用它，然后直接使用 `Authorization: Bearer <token>` 请求 skills.sh。

detail 使用 Workers Cache API，不写 KV：

- 5 分钟 fresh TTL。
- 最多保留 1 小时供 stale-while-revalidate 和上游失败回退。
- cache key 只由规范化后的 `source + skill` 构成。
- `401`、`429`、`503` 或无效响应不写缓存。
- 响应使用 `X-Cache: HIT | MISS | STALE`。
- 不缓存 `files`；安装继续从 Git provider 获取内容。

search 同样使用 Workers Cache API，不写 KV：

- 60 秒 fresh TTL，**没有 stale-while-revalidate**：搜索词键空间无界，保留 stale 只会污染缓存。
- cache key 由规范化后的 `q`（小写、折叠空白）+ `limit` + `owner` 按固定顺序构成，消灭 URL 变体。
- `q` 长度 2~200、`limit` 1~200（默认 50）、`owner` 需匹配 GitHub owner 规则；不合法一律 `400 invalid_query` 且不打上游。
- 响应投影只保留 catalog 条目字段（含 `isDuplicate`），丢弃上游的 `durationMs` 等诊断字段。
- 上游失败一律不写缓存，并且**丢弃上游响应体**，避免 Token 或内部信息经错误信息外泄：
  `400 → invalid_query`、`401 → 503 search_unavailable`、`429 → 429 rate_limited`（透传 `Retry-After` 与 `X-RateLimit-*`）、`503 → 503 search_unavailable`、其他 → `502 search_unavailable`、响应体畸形 → `502 invalid_search_response`。

## Failure Rules

- Token Broker、skills.sh 分页、KV 写入或响应校验任一失败，不切换 manifest。
- 失败同步已写入的新 generation 页面应尽力删除。
- 同步失败更新 status，但保留上一次 `lastSuccessAt`。
- catalog 不存在时公开 API 返回 `202 catalog_warming` 并提示客户端重试。
- 请求未声明或越界的 generation/page 返回 `404 catalog_page_not_found`。
- Token Broker 错误不暴露 OIDC Token，也不写入 catalog。
- skills.sh 首次返回 `401` 时清除内存 Token，重新获取后只重试一次。
- skills.sh 的 `429`、`503` 不写入 catalog；`Retry-After` 保留在同步错误中用于诊断。

## Desktop consumer contract

桌面端只允许 Electron main process 访问本 Worker，renderer 不得直接发起 HTTP 请求。

- 客户端实现：`apps/desktop/src/core/catalog/*`（可移植、无 Electron 依赖）
- IPC 通道：`catalog:getManifest`、`catalog:getPage`、`catalog:search`，三者恒返回判别式结果，不 reject
- base URL：`core/app-constants.ts` 的 `CATALOG_BASE_URL`，可用 `SKILLS_MANAGER_CATALOG_BASE_URL` 覆盖
- `core/catalog/catalog-types.ts` 必须保持零运行时（无 import、无值），它是 renderer 经 `renderer/global.d.ts` 唯一可以引用的 catalog 模块

generation 生命周期：

- 客户端锁定单一 generation，绝不跨页混用两代
- 客户端 TTL 5 分钟（短于服务端 6 小时），到期重新校验 manifest
- 收到 404 时清空缓存的 generation，重取 manifest 后重试，最多 1 次

退避与回退预算（四轴独立、互不重置）：

- 202 warming：按响应 `Retry-After` 退避（clamp 到 1~10 秒），最多重试 3 次
- 404 not found：重取 manifest 后重试，最多 1 次
- 503 unavailable：切换到 `previous` 并整次会话锁定该代，最多 1 次
- search 独立一轴：429 按 `Retry-After` 退避重试最多 1 次；不参与 warming / manifest refresh / fallback 三轴，也不触碰 generation 与页缓存
- 单次调用总预算 25 秒，单次 HTTP 超时 15 秒

缓存与展示：

- 第一版只做进程内存缓存（manifest + 最近 6 页），不落 SQLite / 磁盘
- 客户端读取 `pagination.total` 覆盖 manifest 的 total
- 搜索经 cache-manager 的 `/v1/catalog/search` 走 skills.sh 服务端搜索（单词 fuzzy / 多词 semantic），最多 200 条、无分页；Discover 为 Browse / Search 双模式，Search 模式不叠加客户端过滤
- 搜索结果另有一份进程内 LRU 缓存：key 为 `${normalizedQuery}|${limit}|${owner ?? ""}`，容量 8、TTL 60 秒；`reset()` 清空，generation 轮换不清空（搜索与 generation 无关）
- 回退到 previous 时，UI 必须提示数据可能稍旧；Search 模式下不得出现该提示（搜索没有 generation）

## Free Tier Budget

按文档示例约 8,420 个技能、每页 500 条估算，一次全量同步约 17 页。只有存在访问且 generation 已过期时才发生全量同步；无人访问时 skills.sh 请求和 catalog KV 写入均为零。持续访问时最多约每 6 小时构建一次，与原 Cron 上限相同。

同一 Worker isolate 会在 OIDC Token 有效期内复用它，因此一次 catalog 同步通常只调用一次 Vercel Token Broker；不同 isolate 仍可能分别获取 Token。skills.sh rate limit 继续按 OIDC team/project 计算。

detail 使用 Workers Cache API，不占用 KV 每日写入额度。其缓存按 Cloudflare location 分散；第一版接受不同 location 的首次访问分别回源。

如果单页接近 KV 的 25 MiB value 上限，优先降低固定 `per_page`；只有 catalog 规模明显超出分页 KV 模型时才考虑 R2。
