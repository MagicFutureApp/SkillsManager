# Skills Manager 项目长期记忆

## 环境 / 验证陷阱

- **bash 下 pnpm shim 损坏**：bash 跑 `pnpm` 系列会触发 MSYS 路径转换，把 pnpm 全局 shim 路径搞成 `d:\d\Users\...`，报 `Cannot find module ...pnpm.cjs`。跑 test/build/rebuild 等 **改用 PowerShell 工具**；纯 `node`/`tsc` 直跑可走 bash，但路径要用 `D:/code/...`（带盘符、无前导 `/`），否则 `/d/...` 被转成 `d:\d\...`。
- **沙箱删除 / 覆盖写全面被拦**：`rm`/`mv`/`Remove-Item`/`prettier --write`/`esbuild` 覆盖写已有文件全被安全删除包装拦截（trash 子进程 ETIMEDOUT），故沙箱内**无法删除、无法覆盖写已有文件**。处理：① 覆盖写用 `Edit`/`Write` 特权工具（可行）；写**新**文件用 `esbuild`（可行）；② 删除 / `pnpm install` / `pnpm run build` 的 clean / `pnpm run format` 留待**用户真实环境**跑。临时垃圾文件（如 `*.test.ts.new`、日志）沙箱内删不掉，交付时提醒用户清理。
- **better-sqlite3 ABI = Electron 41（ABI 145），不是 Node**：`apps/desktop/scripts/rebuild-better-sqlite3-for-electron.ts:36-38` 设 `npm_config_runtime: electron`。ABI 对照：Electron 41=145、Node 22=127、Node 24=137。**任何 Node 版本跑依赖 db 的测试都红**（`src/db/client.ts:6` 的 `new Database()`），本机 `pnpm test` 恒定 42 failed（ipc 范围）/ 82 failed（全量）。这是既有技术债，别修、也别当成新改动引入的失败。验证是否引入新失败用 `git worktree` + 复用 `node_modules` 对照 passed/failed 清单，别换 Node 版本。
- **PowerShell `Remove-Item <junction> -Force` 致命坑**：会递归删链接目标内容（曾清掉真实 root `node_modules` 的 `.pnpm`/`.bin`）。拆 junction 用 `(Get-Item <link> -Force).LinkType` 判断后 `.Delete()`（非递归），绝不用 `-Force` rm。基线 worktree 事后由用户在真实环境 `git worktree remove --force`。
- **TS 坑**：`export { X as Y } from "mod"` 不建局部绑定，内部引用报 `Cannot find name 'Y'`；要复用并别名导出须先 `import { X }` 再 `export const Y = X`。
- **spawnSync 跑 .cmd/.bat 必须 `shell: true`**（Node CVE-2024-27980 修复后强制），否则 `EINVAL`（errno -4071）。
- **skipLibCheck 下 `.d.ts` 契约守卫失效**：把守卫写成 `.ts`（如 `catalog-ipc-contract.test-d.ts`，仍被 tsc 查、但 vitest glob 不匹配故不执行），用 `@ts-expect-error` 反向断言；调用可选 `Window["skillsManager"]` 方法必须加 `!`，否则 "possibly undefined" 吃掉入参类型错误使守卫无牙。
- **现状**：无任何 workflow 跑 `pnpm test`，这套测试从未在 CI 真实验证过。

## 工作规则

- 默认不 commit / push，除非用户当轮明确要求（见用户级 MEMORY.md）。
- **例外**：`.workbuddy/memory` 下的记忆文件改动每次随当轮代码改动一起提交，无需单独确认（用户 2026-09-16 要求）。
- 改动前先 `git status --short` 确认用户已有改动，不要覆盖。

## renderer keep-alive 开关

- `renderer/app/keep-alive-pages.tsx` 是 root 渲染出口（无 `<Outlet/>`，子路由只留 `path`，`/` 靠 `beforeLoad` 抛 `redirect`）。
- 行为由模块常量 `KEEP_ALIVE_ENABLED` 控制：`true` = 仅首次挂载、之后切 `hidden`（保留局部状态）；**当前 `false` = 短路**，只渲染 `activeRouteId`，切 Tab 即卸载（用户 2026-09-16 要求暂时短路，架构保留）。
- 对应测试 `keep-alive-pages.test.tsx` 用 `describe.runIf(KEEP_ALIVE_ENABLED)` / `runIf(!KEEP_ALIVE_ENABLED)` 分流，翻开关即换覆盖目标。

## 模块格式（ESM）

- 四个 app 均 ESM；desktop 主进程 + preload 已切 ESM（`package.json` 带 `"type":"module"`）。主进程用 **esbuild 打包**（`build:main` = `tsc -p tsconfig.main.json --noEmit` + `esbuild src/main/index.ts --bundle --format=esm --platform=node --packages=external`；`build:preload` 打包 `preload.mts`→`preload.mjs`，`--external:electron`）。主进程/核心/DB 相对 import **不带 `.js` 后缀**（esbuild 解析），无 `__dirname` 用 `import.meta.dirname`，需 `require` 用 `createRequire(import.meta.url)`。
- **Electron preload 致命坑**：preload 忽略 `package.json` 的 `type`，只认扩展名。ESM preload 源必须 `.mts`→`.mjs`；误用 `.ts`→`.js` 会被当 CJS 解析抛 `SyntaxError: Cannot use import statement outside a module`。sandboxed preload 不支持 ESM → 必须 `sandbox:false`；`electron-builder.yml` 已加 `asarUnpack: ["**/*.mjs"]`。
- **`packages/utils` 纯 ESM 单构建**（无 CJS）：`exports` 仅 `.`（clamp/isRecord/asString/isValidEmail/parseVersionSegments+isNewerVersion/normalizeSearchQuery+isValidSearchOwner+SEARCH_*）+ `./cn`（clsx+tailwind-merge，独立子路径避免污染 Cloudflare Worker 安装图）。desktop + landing 的 `cn`/`asString`/`isValidEmail` 已 re-export 自该包。

## cache-manager 公开 API 契约（desktop 发现页对接）

- 设计文档：`docs/superpowers/specs/2026-07-29-skills-sh-catalog-cache-design.md`。
- 分页 URL 必须带 **generation**：`GET /v1/catalog/{generation}/pages/{n}`（n 从 0 起，每页 500）。先 `GET /v1/catalog` 取 `manifest.current.generation`（`previous.generation` 回退），**勿硬编码 generation**（每次同步轮换、KV 只留两代）。响应 `{data: CatalogSkill[], pagination:{page,perPage:500,total,hasMore}}`，total 以 `pagination.total` 为准。状态：202 warming（`Retry-After` 重试）/ 404（越界或已轮换）/ 503（该 location 未传播，可回退 `previous.generation` 且不可混代）。字段仅强校验 `id` 是 string，**无 description/date**，详情走 `GET /v1/skills/:source/:skill`。
- **Discover 目录数据从不落 SQLite**：`core/catalog/catalog-client.ts` 只用内存缓存（manifest 变量 + `pageCache` Map FIFO 6 页），重启即丢。与"app 自有技能（skill_units/repositories/sources）在 SQLite"是两套独立数据。
- **desktop 消费链路（2026-08-04 重构后）**：经 Electron main process。renderer(仅 UI) → preload `getCatalogManifest`/`getCatalogPage` → main IPC `catalog:getManifest`/`catalog:getPage`（`main/ipc/catalog.ts`，handler 永不 reject，返判别式 `CatalogResult`）→ `core/catalog`（Node 全局 fetch，generation TTL 5min + 整次会话锁一代）→ Worker。base URL 取 `core/app-constants.ts` 的 `CATALOG_BASE_URL`，`SKILLS_MANAGER_CATALOG_BASE_URL` 可覆盖。`catalog-types.ts` 须零运行时，仅它能被 renderer 经 `global.d.ts` 引用。
- **skills.sh 鉴权 = Vercel OIDC Bearer**：桌面运行时无 `VERCEL_OIDC_TOKEN` 无法直连，必须保持 `桌面 → cache-manager(Cloudflare Workers, 已有 Vercel Token Broker) → skills.sh` 网关；cache-manager 复用 `SkillsShTokenProvider`，401 仅自动换 token 重试一次。
- **搜索集成规划（路线 A，2026-08-05 出方案未实现）**：skills.sh `/api/v1/skills/search`（q≥2、limit≤200、fuzzy/semantic、无分页）真实存在；规划在 cache-manager 新增 `GET /v1/catalog/search`（**不能用 `/v1/skills/search`**，会被 `app.ts:266` 通配吞掉返 400），复用 `fetchSkillsSh`、60s 短缓存不落 KV；桌面侧 `core/catalog` 加 `search()`+IPC `catalog:search`+Discover 双模式（Browse 分页 / Search 平铺≤200）。方案见 `.workbuddy/artifacts/2026-08-05-discover-search-integration-plan.md`。路线 B（全量落 SQLite）不推荐，丢 semantic 搜索。
