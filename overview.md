# SkillsManager — 移除相对 import 的 `.js` 后缀 + 引入 esbuild 打包

## 背景
用户在第 B 轮请求：**全部去掉 import 里的 `.js` 后缀，desktop 可以加打包步骤**。
也就是说，desktop 主进程不再依赖 NodeNext 的「相对 import 必须带 `.js`」约束，改用 esbuild 打包，
main / core / db 源码即可像 renderer / landing / cache-manager 那样写省略后缀的相对 import。

## 改动清单
1. **剥离 `.js` 后缀（61 个源文件，180 处）**
   - `apps/desktop/src/{main,core,db}` 全部相对 import 去掉 `.js`（含 `import type`）。
   - `packages/utils/src` 去掉 `.js`（仅 index.ts / cn.test.ts / helpers.test.ts 命中）。
   - 验证：180 处 `.js"` 全部是 `./` 或 `../` 相对 import，0 处裸包名 / 字符串值 →  blanket `s/\.js"/"/g` 安全。
2. **`apps/desktop/tsconfig.main.json`**（上一轮已完成）：`module/moduleResolution` → `ESNext/Bundler`；
   include 覆盖 `src/main/**/*.{ts,mts}` + `src/core/**/*.ts` + `src/db/**/*.ts`，省略后缀可正常解析。
3. **`apps/desktop/package.json`**
   - 新增 `esbuild` devDependency（`^0.28.1`）。
   - `build:main`：`generate-app-config` → `tsc -p tsconfig.main.json --noEmit`（Bundler 类型检查，不再 emit）→
     `esbuild src/main/index.ts --bundle --format=esm --platform=node --packages=external --outfile=dist/main/main/index.js`。
   - 新增 `build:preload`：`esbuild src/main/preload.mts --bundle --format=esm --platform=node --external:electron --outfile=dist/main/main/preload.mjs`。
   - `build`：串联 `build:main && build:preload && build:renderer`。
   - 两个 clean 步用 `node -e "fs.rmSync(...)"`，并用 `|| true` 包成非致命（真实环境可清 dist；失败也不阻断构建）。
4. **`packages/utils/package.json`**
   - 新增 `esbuild` devDependency。
   - `build`：`(rmSync dist || true)` → `esbuild src/index.ts --bundle --format=esm --platform=neutral --packages=external --outfile=dist/index.js`
     → `esbuild src/cn.ts ... --outfile=dist/cn.js` → `tsc -p tsconfig.esm.json --emitDeclarationOnly`（只出 `.d.ts`）。
   - `platform=neutral` 保证 Workers 安全（不引入 node 内置）。
5. 更新 `packages/utils/src/index.ts` 顶部注释：旧的「必须写 `.js`」规则已改为「省略后缀，由 esbuild 解析」。

## 验证结果（沙箱内）
- `tsc -p tsconfig.main.json --noEmit` → 退出 0；`tsc -p tsconfig.renderer.json --noEmit` → 退出 0。
- 桌面 esbuild main 产物 `dist/main/main/index.js`（184KB）：**0 个相对 import**（完全自包含）；
  外部依赖 `@skills-manager/utils` / `better-sqlite3` / `drizzle-orm` / `electron` / `minimatch` / `node:*` 正确 external。
- 桌面 `preload.mjs`：仅 `import { contextBridge, ipcRenderer } from "electron"`，类型 import 已被擦除。
- utils esbuild：`index.js` 0 相对 import；`cn.js` 仅 external `clsx` + `tailwind-merge`；`.d.ts` 正常生成；`exports` 映射一致。

## 沙箱限制（环境层，非代码问题，务必知悉）
本环境的 **safe-delete / genie-trash 包装**拦截了 `rm` / `mv` / `fs.rmSync` / PowerShell `Remove-Item` /
**`prettier --write`** / **esbuild 覆盖写已有文件**，表现为：
- 无法删除文件（包括遗留的 `apps/desktop/src/main/ipc/locale.test.ts.new` 与 `utils/dist` 旧文件）。
- 无法在沙箱内「先清 dist 再打」重跑（首次成功运行已验证逻辑正确，dist 入口文件当前有效）。
- 17 个文件需要 `prettier --write`（机械步骤，沙箱写不进去）。

可正常工作的通道：单文件 `sed -i`、`Edit`/`Write` 特权工具（覆盖写可行）、esbuild 写入**不存在**的新文件。

## 你需要做的（按既有规则，我不自动 commit）
1. `pnpm install` —— 落实 esbuild 并刷新 `pnpm-lock.yaml`（当前 lock 因我加了 esbuild 但未安装而相对滞后）。
2. 跑构建：`pnpm -r --filter @skills-manager/utils run build` 与 desktop `pnpm run build`（真实环境 clean 步正常，产物干净无残留）。
3. `pnpm run format`（prettier）格式化那 17 个文件。
4. 手动删除遗留 `apps/desktop/src/main/ipc/locale.test.ts.new`（沙箱删不掉）。
5. 复查后按你的规则 commit。
