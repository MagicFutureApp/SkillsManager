# Skills Manager

A local-first Skills Manager monorepo.

## Workspace layout

- `apps/desktop`: Electron, React, TypeScript, and SQLite desktop application.
- `apps/landing`: reserved for the landing page.
- `apps/cache-manager`: reserved for the Cloudflare Hono cache manager.

The landing and cache-manager workspaces currently contain only tracked placeholders. They do
not have framework or runtime dependencies yet.

## Commands

Run commands from the repository root. Root scripts forward to `@skillport/desktop`:

```bash
pnpm run dev
pnpm run build
pnpm run check
pnpm test
pnpm run format:check
```

To run a desktop command directly:

```bash
pnpm --filter @skillport/desktop run build
```

## Rebuild better-sqlite3 for Electron

Windows PowerShell:

```powershell
$env:npm_config_runtime="electron"; $env:npm_config_target="41.7.1"; $env:npm_config_disturl="https://electronjs.org/headers"; pnpm --filter @skillport/desktop rebuild better-sqlite3
```

Bash / macOS / Linux:

```bash
npm_config_runtime=electron npm_config_target="41.7.1" npm_config_disturl=https://electronjs.org/headers pnpm --filter @skillport/desktop rebuild better-sqlite3
```
