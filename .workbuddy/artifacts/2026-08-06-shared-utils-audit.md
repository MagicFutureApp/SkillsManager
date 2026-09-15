# packages/utils 抽取盘点清单

**日期**：2026-08-06
**范围**：`apps/desktop`、`apps/cache-manager`、`apps/token-broker`、`apps/landing`（均只统计 `src/`，已排除 `node_modules`、`dist`）
**目的**：为需求 4「建立 `packages/utils` 独立 monorepo 包」提供「只迁真实重复项」的证据基础。

---

## 结论速览

| 档位 | 项目数 | 说明 |
|------|--------|------|
| 🟢 A 档 · 强烈建议迁移 | 4 | 有跨 app 复制证据，且契约漂移会造成真实故障 |
| 🟡 B 档 · 收益有限 | 3 | 只在单 app 内重复，或体量太小 |
| 🔴 C 档 · 不应迁移 | 3 | 有 runtime / 架构约束，迁移会破坏边界 |

---

## 🟢 A 档 · 强烈建议迁移

### A1. `isRecord` 类型守卫 —— **8 处独立定义**

跨 2 个 app、8 个文件各写一份，且**语义不一致**（这才是真问题）：

| 文件 | 行号 | 实现 | 是否排除数组 |
|------|------|------|------------|
| `apps/cache-manager/src/catalog/types.ts` | 29-30 | `typeof value === "object" && value !== null && !Array.isArray(value)` | ✅ |
| `apps/cache-manager/src/sync/catalog-client.ts` | 38-39 | 同上 | ✅ |
| `apps/cache-manager/src/security/skills-sh-token.ts` | 21-22 | 同上 | ✅ |
| `apps/cache-manager/src/details/skill-detail.ts` | 8-9 | 同上 | ✅ |
| `apps/cache-manager/src/search/search-query.ts` | 43-44 | 同上 | ✅ |
| `apps/desktop/src/core/catalog/catalog-http.ts` | 241-242 | `typeof value === "object" && value !== null` | ❌ |
| `apps/desktop/src/main/window-state.ts` | 167-168 | `typeof value === "object" && value !== null` | ❌ |
| `apps/desktop/src/core/repositories/repository-utils.ts` | 197-199 | `Boolean(value) && typeof value === "object"` | ❌ |

**风险**：`catalog-http.ts` 与 `catalog/types.ts` 解析的是**同一份 catalog JSON**，但一个把 `[]` 判为 record、一个不判。上游若返回数组，两端行为分叉。

**迁移形态**：`isRecord(value)`（严格版，排除数组）+ 保留 `repository-utils.ts` 的宽松变体或统一收紧（需跑测试确认）。零依赖，4 种 runtime 全部可移植。

---

### A2. Release manifest 契约 —— **两个 app 各写一份解析器**

同一份线上 JSON（`RELEASE_MANIFEST_URL`），landing 用来渲染下载页，desktop 用来做更新检查：

| 位置 | 导出 | 校验强度 |
|------|------|---------|
| `apps/landing/src/lib/release-manifest.ts:5-46` | `ReleasePlatform` / `ReleaseAsset` / `ReleaseManifest` / `isReleaseManifest` | 强：校验 3 个平台的 asset 齐全 + name/url/sha256 |
| `apps/desktop/src/main/ipc/release.ts:5-32` | `ReleasePlatform` / `ReleaseAssetShape` / `ReleaseManifestShape` / `isReleaseManifest` | 弱：只校验 `schemaVersion === 1` 与 `version` 非空 |

`export type ReleasePlatform = "windows" | "macos" | "linux";` 在两处**逐字相同**。

**风险**：契约漂移。改 manifest 结构时极易只改一端；desktop 侧弱校验会让坏数据静默通过（`downloads` 缺失时 `downloadUrl` 变 `null`，用户点更新无反应）。

**迁移形态**：类型 + `isReleaseManifest` + `getReleaseAsset` 迁入 utils。`getBrowserPlatform()`（依赖 `navigator`）留 landing，`platformFromProcess()`（依赖 `process.platform`）留 desktop —— **平台探测不迁，契约与校验迁**。

---

### A3. `cn()` 样式合并 —— **两处逐字相同**

- `apps/desktop/src/renderer/lib/utils.ts:1-6`
- `apps/landing/src/lib/utils.ts:1-6`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`diff` 结果：这 6 行完全一致。两个 app 各自装了 `clsx` + `tailwind-merge`。

**注意**：landing 的 `utils.ts` 还多了 `asString` / `isValidEmail`（desktop 没有），迁移时只迁 `cn`，另两个单独判断（见 B 档）。

**迁移形态**：`packages/utils` 依赖 `clsx` + `tailwind-merge`，导出 `cn`。仅浏览器/bundler 侧消费。

---

### A4. `parseJwtExpiration` —— **两处等价实现，仅解码方式不同**

| 位置 | base64url 解码 | 校验逻辑 |
|------|--------------|---------|
| `apps/cache-manager/src/security/jwt.ts:1-28` | `atob` + 手工补 padding（Workers runtime 无 Buffer） | `typeof payload !== "object" \|\| payload === null \|\| !("exp" in payload) \|\| !Number.isSafeInteger(payload.exp) \|\| Number(payload.exp) <= 0` |
| `apps/token-broker/src/token-app.ts:19-29` | `Buffer.from(parts[1], "base64url")` | **逐字相同** |

外加测试 helper 也重复：
- `apps/cache-manager/src/test/create-jwt.ts`（5 行，内联 encode）
- `apps/token-broker/src/test/create-jwt.ts`（6 行，提取 encode + 显式 `import { Buffer }`）
两者产出的 JWT 字符串完全一致。

**迁移形态**：解码函数注入或统一用 `atob`（Node 18+ 全局已有 `atob`，Workers 也有）→ 一份实现即可覆盖两端。`createUnsignedJwt` 迁入 utils 的 testing 子路径。

---

## 🟡 B 档 · 收益有限（可迁可不迁）

| 项 | 位置 | 判断 |
|----|------|------|
| `normalizeCatalogBaseUrl` | `catalog-http.ts:69-70` vs `app-constants.ts:37` 内联 `.trim().replace(/\/+$/, "")` | **desktop 内部重复**，不跨 app。已让 config-dev 在需求 1+2 里就地收敛，无需进 utils |
| `toErrorMessage` | `apps/desktop/src/renderer/lib/errors.ts:1-3`（3 行） | 只此一处，无重复证据。体量太小 |
| `asString` / `isValidEmail` | `apps/landing/src/lib/utils.ts:8-19` | 只 landing 用。`isValidEmail` 未来若 desktop 也要校验邮箱可再迁 |

---

## 🔴 C 档 · 不应迁移

| 项 | 位置 | 不迁原因 |
|----|------|---------|
| `formatCompact` | `discover/discover-utils.ts:5-14` | 单处使用，且是 Discover 页的展示约定，属于 feature 局部逻辑 |
| `formatRepositoryDateTime` | `core/repositories/repository-utils.ts:205-231` | 硬编码 `zh-CN` + `Asia/Shanghai`，是 desktop 的本地化决策，不是通用工具 |
| `CatalogSnapshot` / `CatalogManifest` 类型 | `cache-manager/src/catalog/types.ts:4-17` vs `desktop/src/core/catalog/catalog-types.ts:45-59` | **字段一致但语义分层不同**：cache-manager 侧 `perPage: typeof catalogPageSize`（字面量 500，服务端权威）、desktop 侧 `perPage: number`（客户端只读不校验）。且 `catalog-types.ts` 有「零运行时」硬约束，被 renderer 经 `global.d.ts` 引用。**强行合并会把 renderer 拖进 utils 的依赖图，破坏架构铁律**。建议保持双份，用契约测试对齐而非共享类型 |

---

## ⚠️ 落地前必须解决的技术卡点

`packages/utils` 要被 **4 种互不兼容的模块系统**消费：

| 消费方 | 模块系统 | 关键约束 |
|--------|---------|---------|
| `desktop/src/main` | CJS，`module: NodeNext`，`rootDir: "src"` | **源码直引会失败** —— `rootDir` 卡死，只能引用已编译产物 |
| `desktop/src/renderer` | ESM，`moduleResolution: Bundler`，`noEmit` | 可源码直引，但要与 main 保持同一份 |
| `cache-manager` | ESM，Workers runtime | **无 Node 内置**（no `Buffer`、no `node:*`） |
| `landing` | ESM，Vite | 无特殊约束 |

**推荐方案**：`packages/utils` 预编译为 **dual ESM + CJS + .d.ts**（`exports` 字段分 `import`/`require`），各 app 引 `dist`。
- desktop main 走 `require` → `dist/index.cjs`
- renderer / landing / cache-manager 走 `import` → `dist/index.js`
- utils 自身**禁止引入任何 `node:*`**，保证 Workers 可用（A4 的 base64url 因此统一走 `atob`）
- `pnpm run dev` / `build` 需前置 `pnpm --filter @skills-manager/utils build`

**另需**：`pnpm-workspace.yaml` 当前只有 `packages: ["apps/*"]`，要加 `"packages/*"`，随后 `pnpm install` 会动 lockfile 与 native 依赖（`better-sqlite3`）—— 建议**单独一个 commit**，与代码迁移分开。

---

## 建议实施顺序

1. **T0**：`pnpm-workspace.yaml` 加 `packages/*` + 建空骨架（`package.json` / `tsconfig` / `src/index.ts` / build 脚本）+ `pnpm install`。单独提交，验证 4 个 app `pnpm run check` 全绿。
2. **T1**：迁 A1 `isRecord`（零依赖，风险最低，验证 dual 产物链路是否真的跑通）。
3. **T2**：迁 A3 `cn`（验证浏览器侧 + 第三方依赖能否正确穿透）。
4. **T3**：迁 A2 release manifest 契约（收益最大，但要同时改 landing 与 desktop main）。
5. **T4**：迁 A4 JWT（跨 runtime，最后做）。

> A1 若在 T1 就跑不通 dual 产物，说明方案有问题，此时止损成本最低。
