# Cache Manager Deployment

本文说明如何部署当前的 Token Broker 架构：Vercel 只负责获取 request-scoped OIDC Token，Cloudflare Worker 使用该 Token 直接调用 skills.sh，并把 catalog 保存到 KV、把 skill detail 保存到 Workers Cache API。

```text
Client
  -> Cloudflare Worker
       -> Vercel POST /api/token
            -> getVercelOidcToken()
       -> skills.sh /api/v1/*
       -> KV / Workers Cache API
```

OIDC Token 只保存在当前 Worker isolate 的模块内存中，不写入 KV、D1、Workers Cache API、日志或客户端响应。

## 1. Prerequisites

- Node.js 20 或更高版本。
- pnpm。
- 一个 Vercel account。
- 一个 Cloudflare account，并启用 Workers。
- 当前仓库依赖已经安装。

从仓库根目录执行：

```powershell
Set-Location D:\code\skills-manager
pnpm install
pnpm --filter @skills-manager/cache-manager test
pnpm --filter @skills-manager/cache-manager run check
pnpm --filter @skills-manager/cache-manager run build
```

最后三个命令应分别通过测试、TypeScript 检查和 Wrangler dry-run build。

## 2. Generate Secrets

需要两个不同的随机值：

- `SKILLS_SH_TOKEN_SECRET`：只用于 Cloudflare Worker 调用 Vercel Token Broker。
- `CACHE_ADMIN_TOKEN`：只用于调用 Cloudflare 的手动 catalog 刷新接口。

在 PowerShell 中生成：

```powershell
$TokenSecret = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
$AdminToken = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
```

把它们暂存在密码管理器或当前 PowerShell session 中。不要写入 `wrangler.jsonc`、Git tracked 文件或 `.dev.vars.example`。

## 3. Deploy the Vercel Token Broker

### 3.1 Create or link the project

当前工作树未提交时，可以使用 Vercel CLI 直接部署本地文件：

```powershell
Set-Location D:\code\skills-manager\apps\cache-manager
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link
```

建议使用独立项目名，例如 `skills-manager-token-broker`。

如果通过 Vercel Dashboard 导入 Git repository，设置：

```text
Root Directory: apps/cache-manager
Framework Preset: Other
```

不要把 Vercel Build Command 设置成 `pnpm run build`；该 script 是 Cloudflare Wrangler dry-run。Vercel 只需要构建 `api/token.ts` Function。

### 3.2 Enable OIDC Federation

在 Vercel Dashboard 打开：

```text
Project
  -> Settings
  -> OIDC Federation
  -> Enable
```

OIDC 必须在 Production environment 中启用。启用或修改 OIDC 后需要重新部署。

### 3.3 Configure the shared secret

在 Vercel 项目的 Environment Variables 中添加：

```text
Name: SKILLS_SH_TOKEN_SECRET
Value: <TokenSecret>
Environment: Production
```

需要测试 Preview deployment 时，也给 Preview 添加同一个变量。

也可以使用 CLI：

```powershell
pnpm dlx vercel@latest env add SKILLS_SH_TOKEN_SECRET production
```

该命令会交互式提示输入值。可以先执行 `Set-Clipboard -Value $TokenSecret`，粘贴完成后清空 clipboard：

```powershell
Set-Clipboard -Value ""
```

### 3.4 Deploy

```powershell
pnpm dlx vercel@latest --prod
```

记录 Production URL，例如：

```text
https://skills-manager-token-broker.vercel.app
```

Token endpoint 是：

```text
POST https://skills-manager-token-broker.vercel.app/api/token
```

### 3.5 Verify the Token Broker

不带 secret 的请求应该返回 `401`：

```powershell
$VercelBaseUrl = "https://skills-manager-token-broker.vercel.app"
try {
  Invoke-WebRequest -Method Post -Uri "$VercelBaseUrl/api/token"
} catch {
  $_.Exception.Response.StatusCode.value__
}
```

带正确 secret 的请求应该返回 `200`。不要把响应中的原始 Token 打印到终端：

```powershell
$TokenResponse = Invoke-WebRequest `
  -Method Post `
  -Uri "$VercelBaseUrl/api/token" `
  -Headers @{ Authorization = "Bearer $TokenSecret" }

$TokenBody = $TokenResponse.Content | ConvertFrom-Json
$TokenResponse.StatusCode
$TokenResponse.Headers["Cache-Control"]
$TokenResponse.Headers["Pragma"]
$TokenBody.expiresAt
$TokenBody.token.Length
```

预期：

```text
Status: 200
Cache-Control: no-store
Pragma: no-cache
expiresAt: future Unix timestamp
token.Length: greater than 0
```

测试后清除包含 Token 的临时变量：

```powershell
Remove-Variable TokenBody, TokenResponse
```

如果这里返回 `502 oidc_unavailable`，检查 OIDC Federation 是否启用，并在启用后重新部署 Production。

## 4. Create the Cloudflare KV Namespace

本仓库的 Wrangler 固定在 workspace 根 `node_modules`。在 `apps/cache-manager` 中使用显式入口，避免 `pnpm exec wrangler` 解析到全局版本或悬空的 workspace symlink：

```powershell
Set-Location D:\code\skills-manager\apps\cache-manager
node ..\..\node_modules\wrangler\bin\wrangler.js login
node ..\..\node_modules\wrangler\bin\wrangler.js whoami
```

创建 Production KV namespace：

```powershell
node ..\..\node_modules\wrangler\bin\wrangler.js kv namespace create SKILLS_SH_CACHE
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

```powershell
pnpm run deploy
```

此时 `/health` 可以工作，但 catalog 在 secrets 配置完成前不能同步。

### 5.2 Configure Worker secrets

依次执行：

```powershell
node ..\..\node_modules\wrangler\bin\wrangler.js secret put SKILLS_SH_TOKEN_URL
node ..\..\node_modules\wrangler\bin\wrangler.js secret put SKILLS_SH_TOKEN_SECRET
node ..\..\node_modules\wrangler\bin\wrangler.js secret put CACHE_ADMIN_TOKEN
```

交互式输入：

```text
SKILLS_SH_TOKEN_URL=https://skills-manager-token-broker.vercel.app/api/token
SKILLS_SH_TOKEN_SECRET=<与 Vercel 完全相同的 TokenSecret>
CACHE_ADMIN_TOKEN=<另一个 AdminToken>
```

检查 secret 名称：

```powershell
node ..\..\node_modules\wrangler\bin\wrangler.js secret list
```

该命令只显示名称，不显示 secret 值。

### 5.3 Deploy the final configuration

```powershell
pnpm run deploy
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

```powershell
Set-Location D:\code\skills-manager\apps\cache-manager
node ..\..\node_modules\wrangler\bin\wrangler.js tail
```

### `/api/token` returns 404

- 确认 Vercel Root Directory 是 `apps/cache-manager`。
- 确认部署包含 `api/token.ts`。
- 确认使用 `POST`，不是 `GET`。

### `/api/token` returns 401

- 调用方没有发送 `Authorization: Bearer ...`。
- Cloudflare 与 Vercel 的 `SKILLS_SH_TOKEN_SECRET` 不一致。

### `/api/token` returns `502 oidc_unavailable`

- Vercel OIDC Federation 没有启用。
- 启用 OIDC 后没有重新部署 Production。
- 请求命中了未配置 OIDC/环境变量的 Preview deployment。

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

```powershell
node ..\..\node_modules\wrangler\bin\wrangler.js secret delete SKILLS_SH_BRIDGE_URL
node ..\..\node_modules\wrangler\bin\wrangler.js secret delete SKILLS_SH_BRIDGE_SECRET
```

6. 从 Vercel 删除旧的 `SKILLS_SH_BRIDGE_SECRET` environment variable。
7. 确认 Vercel logs 不再出现 `/api/upstream`。

## 10. Clean Up Local Secrets

部署与验证完成后清理 PowerShell 变量和 clipboard：

```powershell
Remove-Variable TokenSecret, AdminToken -ErrorAction SilentlyContinue
Set-Clipboard -Value ""
```

真实本地 secrets 只能放在被忽略的 `apps/cache-manager/.dev.vars` 中。不要提交 `.dev.vars`、Vercel OIDC Token、shared secret 或 admin token。
