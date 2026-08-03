# Skills Manager Token Broker

Vercel 上的独立 OIDC Token Broker。它只接受受共享 secret 保护的 `POST /api/token`，调用 `getVercelOidcToken()` 获取 request-scoped Token，校验 JWT 过期时间后返回给 Cloudflare Cache Manager。

该应用不访问 skills.sh，不保存 catalog、skill detail 或 Token，也不依赖 `apps/cache-manager`。Cloudflare Worker 才是 skills.sh API 的调用方。

## API

```text
POST /api/token
Authorization: Bearer <SKILLS_SH_TOKEN_SECRET>
```

成功响应：

```json
{
  "token": "<vercel-oidc-token>",
  "expiresAt": 1785398400
}
```

响应始终带有 `Cache-Control: no-store` 和 `Pragma: no-cache`。缺少或错误的 shared secret 返回 `401`，无法获取有效 OIDC Token 返回 `502`。

## Local validation

从仓库根目录执行：

```bash
pnpm run token:check
pnpm run token:test
```

完整的 Vercel Dashboard 部署和验收步骤参见 [DEPLOYMENT.md](./DEPLOYMENT.md)。
