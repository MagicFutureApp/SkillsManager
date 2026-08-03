# Cache Manager Deployment

本文说明如何部署 Cloudflare Cache Manager。Worker 通过已部署的外部 Token Broker 获取 request-scoped OIDC Token，直接调用 skills.sh，并把 catalog 保存到 KV、把 skill detail 保存到 Workers Cache API。

```text
Client
  -> Cloudflare Worker
       -> Token Broker POST /api/token
            -> getVercelOidcToken()
       -> skills.sh /api/v1/*
       -> KV / Workers Cache API
```

OIDC Token 只保存在当前 Worker isolate 的模块内存中，不写入 KV、D1、Workers Cache API、日志或客户端响应。

本文按当前 `cache-manager` 分支实现编写，对应 `apps/cache-manager/package.json` 中的 Wrangler `4.113.0`。除非步骤中明确说明，所有命令都从仓库根目录执行。

## 1. Prerequisites

- Node.js 20 或更高版本；建议使用仓库 `package.json` 声明的 pnpm `10.23.0`。
- pnpm。
- 一个 Cloudflare account，并启用 Workers。
- 已部署的 [`@skills-manager/token-broker`](../token-broker/DEPLOYMENT.md)，包括 endpoint 和 shared secret。
- 当前仓库依赖已经安装。

从仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm run cache:test
pnpm run cache:check
pnpm run cache:build
```

最后三个命令应分别通过测试、TypeScript 检查和 Wrangler dry-run build。

## 2. Generate Secrets

需要两个不同的随机值：

- `SKILLS_SH_TOKEN_SECRET`：只用于 Cloudflare Worker 调用 Vercel Token Broker。
- `CACHE_ADMIN_TOKEN`：只用于调用 Cloudflare 的手动 catalog 刷新接口。

在 macOS/Linux shell 中生成：

```bash
export SKILLS_SH_TOKEN_SECRET="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))")"
export CACHE_ADMIN_TOKEN="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))")"
```

或在 PowerShell 中生成：

```powershell
$TokenSecret = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
$AdminToken = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
```

把它们暂存在密码管理器或当前 shell session 中。不要写入 `wrangler.jsonc`、Git tracked 文件或 `.dev.vars.example`。

## 3. Prepare the Token Broker configuration

按 [`apps/token-broker/DEPLOYMENT.md`](../token-broker/DEPLOYMENT.md) 完成 Vercel 部署和验收，然后记录：

```text
SKILLS_SH_TOKEN_URL=https://<token-broker-project>.vercel.app/api/token
SKILLS_SH_TOKEN_SECRET=<与 Vercel 完全相同的 shared secret>
```

Cache Manager 只依赖这两个运行时配置，不包含 Vercel Function 实现。

## 4. Create the Cloudflare KV Namespace

使用 workspace filter 调用分支锁定的 Wrangler，避免解析到全局版本：

```bash
pnpm --filter @skills-manager/cache-manager exec wrangler login
pnpm --filter @skills-manager/cache-manager exec wrangler whoami
```

创建 Production KV namespace：

```bash
pnpm --filter @skills-manager/cache-manager exec wrangler kv namespace create SKILLS_SH_CACHE
```

记录返回的 namespace ID，然后修改 `apps/cache-manager/wrangler.jsonc`：

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "SKILLS_SH_CACHE",
      "id": "<namespace-id>"
    }
  ]
}
```

KV namespace ID 不是 secret，可以提交；不要把 Token 或 shared secret 写入该文件。

## 5. Deploy and Configure the Cloudflare Worker

### 5.1 Register the Worker

添加 KV ID 后先部署一次，使 Worker 存在于 Cloudflare account：

```bash
pnpm --filter @skills-manager/cache-manager run deploy
```

此时 `/health` 可以工作，但 catalog 在 secrets 配置完成前不能同步。

### 5.2 Configure Worker secrets

依次执行：

```bash
pnpm --filter @skills-manager/cache-manager exec wrangler secret put SKILLS_SH_TOKEN_URL
pnpm --filter @skills-manager/cache-manager exec wrangler secret put SKILLS_SH_TOKEN_SECRET
pnpm --filter @skills-manager/cache-manager exec wrangler secret put CACHE_ADMIN_TOKEN
```

每条命令提示输入 secret 时，只粘贴等右边的值，不要输入变量名或 `=`：

```text
https://skills-manager-token-broker.vercel.app/api/token
<与 Vercel 完全相同的 TokenSecret>
<另一个 AdminToken>
```

检查 secret 名称：

```bash
pnpm --filter @skills-manager/cache-manager exec wrangler secret list
```

该命令只显示名称，不显示 secret 值。

### 5.3 Deploy the final configuration

```bash
pnpm --filter @skills-manager/cache-manager run deploy
```

记录 Wrangler 输出的 Worker URL，例如：

```text
https://skills-manager-cache-manager.<subdomain>.workers.dev
```

```powershell
$WorkerUrl = "https://skills-manager-cache-manager.<subdomain>.workers.dev"
```

## 6. Verify the Cloudflare Worker

### 6.1 Health and initial status

```powershell
Invoke-RestMethod "$WorkerUrl/health"
Invoke-RestMethod "$WorkerUrl/v1/status"
```

首次部署时 status 通常是 `never`。

### 6.2 Trigger the first catalog build

```powershell
$FirstCatalogResponse = Invoke-WebRequest "$WorkerUrl/v1/catalog"
$FirstCatalogResponse.StatusCode
$FirstCatalogResponse.Content
```

完全没有缓存时预期返回 `202`：

```json
{
  "status": "warming",
  "message": "The catalog is being prepared. Retry shortly."
}
```

轮询直到 manifest 可用：

```powershell
$Catalog = $null
for ($Attempt = 1; $Attempt -le 20; $Attempt++) {
  $Candidate = Invoke-RestMethod "$WorkerUrl/v1/catalog"
  if ($null -ne $Candidate.current) {
    $Catalog = $Candidate
    break
  }
  Start-Sleep -Seconds 3
}

if ($null -eq $Catalog) {
  throw "Catalog did not become ready. Check /v1/status and Worker logs."
}

$Catalog.current
```

查看最终同步状态：

```powershell
Invoke-RestMethod "$WorkerUrl/v1/status"
```

成功时应包含：

```text
status: success
generation: <uuid>
pageCount: <positive integer>
total: <skill count>
```

### 6.3 Read a pinned catalog page

```powershell
$Generation = $Catalog.current.generation
$Page = Invoke-RestMethod "$WorkerUrl/v1/catalog/$Generation/pages/0"
$Page.data.Count
$Page.data[0]
```

客户端完整导入 catalog 时，必须固定使用同一个 generation，不能在一次同步中混用 current 和 previous。

### 6.4 Verify detail caching and `files` removal

```powershell
$Skill = $Page.data[0]
$DetailUrl = "$WorkerUrl/v1/skills/$($Skill.source)/$($Skill.slug)"

$FirstDetail = Invoke-WebRequest $DetailUrl
$SecondDetail = Invoke-WebRequest $DetailUrl

$FirstDetail.Headers["X-Cache"]
$SecondDetail.Headers["X-Cache"]
```

同一个 Cloudflare location 中通常预期：

```text
MISS
HIT
```

确认响应没有 `files`：

```powershell
$Detail = $SecondDetail.Content | ConvertFrom-Json
$Detail.PSObject.Properties.Name -contains "files"
```

预期为 `False`。

详情 fresh TTL 是 5 分钟。过期后的第一次请求通常返回 `X-Cache: STALE` 并异步刷新，随后恢复为 `HIT`。

### 6.5 Verify that Vercel only serves Tokens

完成一次 catalog 构建后检查 Vercel Function Logs：

- 应该只看到 `POST /api/token`。
- 不存在 `/api/upstream`、catalog page 或 skill detail 代理请求。
- 一次 catalog 构建在同一个 Worker isolate 中通常只获取一次 Token，而不是每页一次。
- isolate 重建、不同 Cloudflare location 或 skills.sh `401` 重试可能产生额外 Token 请求。

Cloudflare Worker 才是访问以下地址的一方：

```text
https://skills.sh/api/v1/skills
https://skills.sh/api/v1/skills/<source>/<skill>
```

## 7. Manual Catalog Refresh

正常刷新由 `/v1/catalog` 和分页访问触发，不需要 Cron。需要主动刷新时：

```powershell
$ManualRefresh = Invoke-RestMethod `
  -Method Post `
  -Uri "$WorkerUrl/internal/sync" `
  -Headers @{ Authorization = "Bearer $AdminToken" }

$ManualRefresh.current
```

不要把 `CACHE_ADMIN_TOKEN` 放到 renderer 或其他客户端代码中。

## 8. Logs and Troubleshooting

### Worker logs

```bash
pnpm --filter @skills-manager/cache-manager exec wrangler tail
```

### Token Broker errors

`/api/token` 的 `404`、`401`、`502` 或 `ERR_MODULE_NOT_FOUND` 由独立 Token Broker 处理，参见 [`apps/token-broker/DEPLOYMENT.md`](../token-broker/DEPLOYMENT.md#6-troubleshooting)。

### Catalog remains `202 warming`

检查：

```powershell
Invoke-RestMethod "$WorkerUrl/v1/status"
```

常见原因：

- `SKILLS_SH_TOKEN_URL` 错误。
- Token Broker secret 不一致。
- Vercel OIDC Token 无效或已过期。
- skills.sh 拒绝来自 Cloudflare 的 OIDC Bearer Token。
- skills.sh 返回 `429` 或 `503`。

如果 skills.sh 返回 `401`，Worker 会刷新 Token 并只重试一次；第二次仍失败会保留旧 catalog，并把同步状态记录为 `error`。

### `catalog_page_unavailable`

KV 在 Cloudflare location 之间最终一致。新 manifest 和分页传播存在短暂时间差；等待几秒重试，或显式回退 manifest 中的 previous generation。

### Detail is `MISS` in another region

Workers Cache API 按 Cloudflare location 分散。同一 skill 在东京命中缓存，不代表法兰克福已经有该缓存。这不会把 OIDC Token写入任何共享存储。

## 9. Migrating from the Old Vercel Bridge

如果曾部署旧版 `/api/upstream`：

1. 先部署新的 Vercel `POST /api/token`。
2. 在 Vercel 添加 `SKILLS_SH_TOKEN_SECRET`。
3. 在 Cloudflare 添加 `SKILLS_SH_TOKEN_URL` 和 `SKILLS_SH_TOKEN_SECRET`。
4. 部署并完成 catalog/detail 验证。
5. 删除 Cloudflare 的旧 secrets：

```bash
pnpm --filter @skills-manager/cache-manager exec wrangler secret delete SKILLS_SH_BRIDGE_URL
pnpm --filter @skills-manager/cache-manager exec wrangler secret delete SKILLS_SH_BRIDGE_SECRET
```

6. 从 Vercel 删除旧的 `SKILLS_SH_BRIDGE_SECRET` environment variable。
7. 确认 Vercel logs 不再出现 `/api/upstream`。

## 10. Clean Up Local Secrets

部署与验证完成后清理当前 session 中的 secret：

macOS/Linux shell：

```bash
unset SKILLS_SH_TOKEN_SECRET CACHE_ADMIN_TOKEN
```

PowerShell：

```powershell
Remove-Variable TokenSecret, AdminToken -ErrorAction SilentlyContinue
Set-Clipboard -Value ""
```

真实本地 secrets 只能放在被忽略的 `apps/cache-manager/.dev.vars` 中。不要提交 `.dev.vars`、Vercel OIDC Token、shared secret 或 admin token。

## 11. Official References

- [Cloudflare Workers KV: Get started](https://developers.cloudflare.com/kv/get-started/)
- [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
