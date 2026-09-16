# Skills Manager 项目长期记忆

## 环境 / 验证陷阱

- **Git Bash 下 pnpm shim 路径损坏**：在 bash 里跑 `pnpm` 系列命令时，MSYS 路径转换会把 pnpm 全局 shim 引用的路径搞坏（变成 `d:\d\Users\andrewliang\pnpm\...`），报 `Cannot find module ...pnpm.cjs`。需要跑 pnpm 命令（test / rebuild / build 等）时，**改用 PowerShell 工具**执行，不要用 bash。
- **沙箱内删除被全面拦截（genie-safe-delete / genie-trash）**：`rm` / `mv` / `fs.rmSync` / `PowerShell Remove-Item` / `prettier --write` 的写回 rename / `esbuild` 覆盖写已有文件 —— 全部被安全删除包装拦截，且 trash 子进程 ETIMEDOUT，故**沙箱内无法删除文件、也无法覆盖写已有文件**。后果：陈旧 dist 难清、prettier 格式化写不进、`rm` 删不掉的垃圾文件（如某 `.test.ts.new`）只能留待用户真实环境清。可行通道：① 用户真实环境跑 `pnpm install` / `rm` / `pnpm run format` / `pnpm run build`（clean 步正常）；② 沙箱内用 `Edit`/`Write` 特权工具**覆盖写**已有文件（可行）、用 `esbuild` 写出**不存在**的新文件（可行）、`sed -i` 对单文件可直接改；③ 跨文件批量改优先 `sed -i`（沙箱放行），不要靠 shell `mv`/`rm`。`pnpm install` 对 node_modules 写入另报 **EPERM**（沙箱权限）；workspace 软链用 PowerShell `New-Item -ItemType SymbolicLink` 手动建 `utils -> ../../packages/utils`，真实环境重跑 `pnpm install` 固化。
- **TS 坑：`export { X as Y } from "mod"` 不建局部绑定**：纯 re-export 不会在本模块内创建 `Y`，内部引用会报 `Cannot find name 'Y'`。要在模块内复用并对外导出别名，须先 `import { X } from "mod"` 再 `export const Y = X`（本教训来自 search 校验统一：desktop/cache-manager 都想 re-export 共享常量）。
- **Windows 上 spawnSync 执行 .cmd/.bat**：必须设 `shell: true`（Node.js 自 CVE-2024-27980 修复后强制），否则直接抛 `EINVAL`（errno -4071）。
- **better-sqlite3 原生模块 ABI 不匹配（2026-08-06 修正，此前记录有误）**：本机 `better_sqlite3.node` 编译目标是 **Electron 41（ABI 145）**，**不是 Node 24**。`apps/desktop/scripts/rebuild-better-sqlite3-for-electron.ts:36-38` 显式设了 `npm_config_runtime: electron` + `npm_config_disturl: electronjs.org/headers`。ABI 对照：Electron 41.7.1 = 145、Node 22.22.2 = 127、**Node 24.11.1 = 137**。所以**任何 Node 版本跑依赖 db 的测试都会红**（Node 22 报 requires 127、Node 24 报 requires 137），换 Node 版本解决不了——本机 `pnpm test` 恒定 42 failed（`src/main/ipc` 范围）/ 82 failed（全量），错误点全在 `src/db/client.ts:6` 的 `new Database()`。这是既有技术债，别去修，也别把它当成新改动引入的失败。
  - **验证改动是否引入新失败的正确方法**：不要换 Node 版本（无效），改用 `git worktree` 在 HEAD 拉纯净副本 + junction 复用同一份 `node_modules`，跑同一条命令对照 passed/failed 数与失败文件清单。
  - **致命坑：PowerShell `Remove-Item <junction> -Force` 会递归删除链接目标的内容**（2026-09-15 实测：清基线 worktree 时把真实 root `node_modules` 的 `.pnpm`/`.bin`/`.modules.yaml` 删掉、把 `apps/desktop/node_modules` 清空，沙箱内 `pnpm install` 又被拦无法自恢复）。正确做法：① 拆链接只用 `(Get-Item <link> -Force).LinkType` 判断后调 `.Delete()`（DirectoryInfo 非递归删 reparse point，不碰目标）或 `cmd /c rmdir <link>`（注意 cmd 被 PowerShell 工具禁用，只能用前者）；② 复制 node_modules 更安全的替代是 **`NODE_PATH` / 只 junction 到 `apps/desktop/node_modules` 这一层再谨慎操作**，或干脆复制一份；③ 基线 worktree 目录放在仓库外（本沙箱不允许）或接受「用完后由用户删除」。删除动作在沙箱内一律不可用，基线 worktree 事后需用户在真实环境 `git worktree remove --force <path>`。
  - 附带事实：目前**没有任何 workflow 跑 `pnpm test`**，这套测试从未在 CI 上被真正验证过。
- **skipLibCheck 下 `.d.ts` 契约守卫失效的绕法**：`skipLibCheck: true` 会静默吞掉 `.d.ts` 内部类型错误。若要在该配置下给渲染层 `global.d.ts` 契约加回归护栏，把守卫写成 `.ts`（如 `catalog-ipc-contract.test-d.ts`）——它仍被 tsc 正常检查，但 vitest 默认 glob 不匹配 `.test-d.ts` 故不会被执行。守卫用 `@ts-expect-error` 反向断言：契约退化（如 `data` 塌 `any`）时对应行不再报错 → 指令变 unused → `tsc` 报 `TS2578` 失败，即有"牙"。**调用可选 `Window["skillsManager"]` 方法时必须加 `!`**，否则 "possibly undefined" 错误会替代入参类型错误吃掉 `@ts-expect-error`，使守卫对入参类型无牙（本教训来自 Discover 搜索集成 T05 验收）。

## 工作规则

- 默认不 commit / push，除非用户当轮明确要求（见用户级 MEMORY.md）。
- 改动前先 `git status --short` 确认用户已有改动，不要覆盖。

## 模块格式（ESM）

- 全仓四个 app（landing / cache-manager / token-broker / desktop-renderer 本就 ESM；desktop 主进程 + preload 也已切 ESM，`package.json` 带 `"type":"module"`）。
- desktop 主进程已改 **esbuild 打包**（`build:main` = `tsc -p tsconfig.main.json --noEmit` 类型检查 + `esbuild src/main/index.ts --bundle --format=esm --platform=node --packages=external --outfile=dist/main/main/index.js`；`build:preload` 打包 `preload.mts` 成 `preload.mjs`，`--external:electron`；`tsconfig.main.json` 已切 `module/moduleResolution: ESNext/Bundler`）。因此主进程/核心/DB 源码的相对 import **不再带 `.js` 后缀**（统一省略，由 esbuild 解析，原生/CJS 依赖 `--packages=external` 保留）。早期「NodeNext + 补 `.js`」阶段已弃。主进程无 `__dirname` 用 `import.meta.dirname`；需 `require` 用 `createRequire(import.meta.url)`。`packages/utils` 也已切 esbuild（`build` = 清 dist + esbuild 打包 `index.ts`+`cn.ts`（`--platform=neutral`，Workers 安全）+ `tsc --emitDeclarationOnly`）。
- **Electron preload 致命坑**：preload 会**忽略** `package.json` 的 `"type":"module"`，只认扩展名。ESM preload 源必须是 `.mts` → 产物 `.mjs`；若误用 `.ts`（→ `.js`），Electron 把 `.js` preload 当 CJS 解析，启动即抛 `SyntaxError: Cannot use import statement outside a module`。详见 AGENTS.md「模块格式规则（ESM）」。
- sandboxed preload 不支持 ESM → ESM preload 必须 `sandbox:false`（代价：渲染进程不走 OS 沙箱，但 `contextIsolation`/`nodeIntegration` 仍保护）；asar 内 `.mjs` 加载有已知坑，`electron-builder.yml` 已加 `asarUnpack: ["**/*.mjs"]` 解包保险。
- **`packages/utils` 已是纯 ESM 单构建**（无 CJS）：`exports` 仅 `.`（零依赖、运行时无关助手：clamp / isRecord / asString / isValidEmail / parseVersionSegments+isNewerVersion / normalizeSearchQuery+isValidSearchOwner+SEARCH_* 常量）+ `./cn`（Tailwind 合并，引 clsx+tailwind-merge，故独立子路径避免污染 Cloudflare Worker 安装图）。desktop + landing 的本地 `cn`/`asString`/`isValidEmail` 已改为 re-export 自该包（24+4 调用点零改动）；两 app 的 `package.json` 以 `workspace:*` 依赖它。源 `src/*.ts` 各自独立、`.` 入口 re-export。

## cache-manager 公开 API 契约（desktop 发现页对接要点）

- 设计文档：`docs/superpowers/specs/2026-07-29-skills-sh-catalog-cache-design.md`
- 分页 URL 必须带 **generation**：`GET /v1/catalog/{generation}/pages/{n}`（n 从 0 起，每页固定 500）
- 先 `GET /v1/catalog` 取 `manifest.current.generation`（和 `previous.generation` 回退用），再拼分页 URL；**不要硬编码 generation UUID**（每次同步轮换、KV 只保留两代）
- 响应体：{ `data: CatalogSkill[]`, `pagination: {page, perPage:500, total, hasMore}` }，total 以 `pagination.total` 为准
- 状态：202 warming（`Retry-After` 重试）→ 后台重建；404（generation 越界/已轮换）；503（该 location 未传播，可回退 `previous.generation` 重试，且不可混用两代）
- 字段透传 skills.sh 上游，仅强校验 `id` 是 string；**无 description / date 字段**，详情需走 `GET /v1/skills/:source/:skill`
- 第一版 scope 原明确**不含搜索 API**、客户端搜索只能做已加载页内的客户端过滤；但 **2026-08-05 已规划经 cache-manager 新增 `GET /v1/catalog/search`**（路线 A，方案未实现），客户端搜索将升级为服务端 semantic 搜索，见下方搜索集成规划。
- **Discover 目录数据（cache-manager 来源）从不落 SQLite**：`core/catalog/catalog-client.ts` 只用内存缓存（manifest 变量 + `pageCache` Map FIFO 6 页），零 DB 依赖；应用重启即丢、下次重新拉。这与"app 自有技能（skill_units/repositories/sources）在 SQLite、可本地检索"是两套独立数据，易混淆——用户曾误以为目录数据也全量同步进 SQLite。SQLite 落库缓存被显式列为 follow-up（落库只需在 catalog-client 内换 storage 适配，不动 IPC/preload/renderer）
- **desktop 客户端消费方式（2026-08-04 重构后）**：经 Electron **main process** 消费，不再由 renderer 直连。链路 = renderer(仅UI) → preload 类型化方法 `getCatalogManifest`/`getCatalogPage` → main IPC `catalog:getManifest`/`catalog:getPage`（`main/ipc/catalog.ts`，handler 永不 reject，返判别式 `CatalogResult`）→ `core/catalog`（可移植，`catalog-http.ts`+`catalog-client.ts`，Node 全局 fetch，状态机三轴预算+generation TTL 5min+整次会话锁一代）→ Worker。base URL 在 main 运行时从 `core/app-constants.ts` 的 `CATALOG_BASE_URL` 常量读取，`SKILLS_MANAGER_CATALOG_BASE_URL` 可覆盖（沿用 RELEASE_MANIFEST_URL 的"常量+env 覆盖"模式，无 dotenv）。`catalog-types.ts` 必须保持零运行时，仅它能被 renderer 经 `global.d.ts` 引用。
- **skills.sh API 鉴权 = Vercel OIDC Bearer token**，桌面（renderer/main）运行时无 `VERCEL_OIDC_TOKEN` 无法直连，必须保持 `桌面 → cache-manager(Cloudflare Workers, 已有 Vercel Token Broker) → skills.sh` 网关；cache-manager 的 `security/skills-sh-fetch.ts` 的 `fetchSkillsSh` 复用 `SkillsShTokenProvider`，对 401 只自动换 token 重试一次。
- **2026-08-05 搜索集成规划（路线 A，已出方案未实现）**：skills.sh `/api/v1/skills/search`（q≥2字符、limit≤200、fuzzy/semantic、无分页）真实存在；规划在 cache-manager 新增 `GET /v1/catalog/search`（**不能用 `/v1/skills/search`**，会被 `app.ts:266` 的 `/v1/skills/*` 通配吞掉返回 400），复用 `fetchSkillsSh` 零新增鉴权代码、60s 短缓存不落 KV；上游 401 二次仍失败映射 `503 search_unavailable`；桌面侧 `core/catalog` 加 `search()`+IPC `catalog:search`+preload+Discover 双模式（Browse 分页 / Search 平铺≤200）。方案：`.workbuddy/artifacts/2026-08-05-discover-search-integration-plan.md`。路线 B（全量落 SQLite 本地搜索）不推荐，会丢 semantic 搜索。
