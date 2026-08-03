# Token Broker Deployment

本文说明如何通过 Vercel Dashboard 部署独立的 `apps/token-broker`。Vercel 只签发 request-scoped OIDC Token；Cloudflare Cache Manager 使用该 Token 直接访问 skills.sh。

## 1. Validate locally

从仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm run token:check
pnpm run token:test
```

## 2. Generate the shared secret

`SKILLS_SH_TOKEN_SECRET` 只用于 Cloudflare Worker 调用 Token Broker。不要把它写入 Git tracked 文件。

macOS/Linux：

```bash
export SKILLS_SH_TOKEN_SECRET="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))")"
```

PowerShell：

```powershell
$TokenSecret = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
```

## 3. Import the Vercel project

Vercel Dashboard 只能部署已经推送到 Git provider 的提交。先确认包含 `apps/token-broker` 的分支已推送，然后：

1. 打开 [Vercel New Project](https://vercel.com/new)。
2. 连接 GitHub、GitLab 或 Bitbucket，选择 Skills Manager repository，点击 `Import`。
3. 建议将项目命名为 `skills-manager-token-broker`。
4. 在 `Configure Project` 中设置：

```text
Framework Preset: Other
Root Directory: apps/token-broker
Build Command: 启用 Override，并留空
Output Directory: 保持默认
Install Command: 保持默认
```

不要填写 `pnpm run build`。Token Broker 没有前端构建步骤；Vercel 会自行安装依赖并构建 `api/token.ts` Function。

在同一页面添加环境变量：

```text
Name: SKILLS_SH_TOKEN_SECRET
Value: <TokenSecret>
Environment: Production
```

需要 Preview deployment 时，也为 Preview 配置同一个变量。点击 `Deploy` 创建项目。

如果代码尚未合并到 repository 的默认分支，在 `Project -> Settings -> Git -> Production Branch` 中选择实际部署分支，然后重新部署。

## 4. Enable OIDC Federation

打开：

```text
Project
  -> Settings
  -> Security
  -> Secure backend access with OIDC federation
```

启用 OIDC，并优先使用 Vercel 推荐的 `Team` issuer mode。skills.sh 必须信任该 Vercel team/project 签发的 OIDC Token。

OIDC 或环境变量变更只对新 deployment 生效。打开 `Project -> Deployments`，对最新 Production Branch commit 执行 `Redeploy`。

## 5. Verify

记录 Production URL：

```text
https://skills-manager-token-broker.vercel.app
```

不带 secret 的 `POST` 应返回 `401`：

```powershell
$VercelBaseUrl = "https://skills-manager-token-broker.vercel.app"
try {
  Invoke-WebRequest -Method Post -Uri "$VercelBaseUrl/api/token"
} catch {
  $_.Exception.Response.StatusCode.value__
}
```

带正确 secret 的请求应返回 `200`。不要打印响应中的原始 Token：

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

预期 `Cache-Control` 为 `no-store`、`Pragma` 为 `no-cache`，且 `expiresAt` 是未来时间戳。测试后清理 `$TokenBody` 和 `$TokenResponse`。

## 6. Troubleshooting

### `404`

- Root Directory 必须是 `apps/token-broker`。
- deployment 必须包含 `api/token.ts`。
- 只支持 `POST /api/token`，不支持浏览器地址栏发出的 `GET`。

### `ERR_MODULE_NOT_FOUND`

- 确认部署的是包含显式 `.js` ESM import 的最新 commit。
- 本地 `pnpm run token:check` 必须通过。
- 对最新 commit 创建新 deployment；重新部署旧 commit 不会包含修复。

### `504` 和 `default export returned a Response`

- `api/token.ts` 必须使用 Vercel Web API 的命名 `POST` 导出，不能使用返回 `Response` 的 `default` 导出。
- 确认 deployment 使用的是包含 `export function POST(request)` 的最新 commit。
- 在 `Project -> Deployments` 中为最新 commit 创建新 deployment；重新部署旧 commit 不会包含修复。

### `401`

- 请求必须发送 `Authorization: Bearer <SKILLS_SH_TOKEN_SECRET>`。
- Cloudflare 和 Vercel 中的 `SKILLS_SH_TOKEN_SECRET` 必须完全相同。

### `502 oidc_unavailable`

- 确认 OIDC Federation 已启用。
- 启用 OIDC 后重新部署 Production。
- 确认请求没有命中缺少 OIDC 或环境变量的 Preview deployment。

## 7. Clean up local secrets

macOS/Linux：

```bash
unset SKILLS_SH_TOKEN_SECRET
```

PowerShell：

```powershell
Remove-Variable TokenSecret -ErrorAction SilentlyContinue
Set-Clipboard -Value ""
```

## Official references

- [Vercel: Deploy from the dashboard](https://vercel.com/docs/getting-started-with-vercel#deploy-from-the-dashboard)
- [Vercel: Configuring a Build](https://vercel.com/docs/builds/configure-a-build)
- [Vercel OpenID Connect (OIDC) Federation](https://vercel.com/docs/oidc)
