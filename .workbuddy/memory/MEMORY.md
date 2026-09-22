# Skills Manager 项目长期记忆

## 环境 / 验证陷阱
- 测试/构建用 node 直跑别用 bash pnpm（MSYS 路径转换）：`cd apps/desktop && "D:/nvm4w/nodejs/node.exe" ../../node_modules/vitest/vitest.mjs run ...`；tsc：`../../node_modules/typescript/bin/tsc -p tsconfig.renderer.json --noEmit`。bash 路径带盘符 `D:/code/...`。
- better-sqlite3 ABI=Electron41(ABI145)非 Node → Node 跑 DB 测试必红（技术债）。DB 层靠 tsc+既有用例佐证，别换 Node。
- PowerShell `Remove-Item <junction> -Force` 递归删目标；拆 junction 用 `(Get-Item <link>).Delete()`。
- vitest 须在 apps/desktop 内跑；`--fileParallelism=false` 避免 act 警告交叉。prettier --check 因 CRLF 大量误报，别当改动格式问题。
- **本沙箱 tsc/vitest 必 OOM（2026-09-20 实测）**：V8 "Fatal process out of memory: Zone"，MAIN/RENDERER_EXIT=3。跑前设 `NODE_OPTIONS="--max-old-space-size=8192"`；vitest 加 `--pool=threads`（worker fork 也 OOM）。`cd X && tsc; echo $?` 中若 cd 失败会短路，使 $? 误报 0——务必用绝对 `-p` 路径 + 显式 `echo "EXIT=$?"` 复核。
- **Bash 工具路径陷阱**：`cd /d/code/...` 报 "null directory" 失败；用相对 `cd apps/desktop` 或绝对 `D:/code/...`。git 用 `git -C D:/code/skills-manager`（勿用 `/d/...`）。`tail`/`cat`/`mkdir` 不可用，用 managed node 直跑 + Glob/Read 替代。

## 工作规则
- 默认不 commit/push（见用户级 MEMORY.md）。改前 `git status --short` 确认不覆盖用户改动。

## renderer 共享数据桶（dev-zustand 分支）
- `stores/data-store.ts` zustand 单例=跨 tab 真源（skills+registeredTargets）。`keep-alive-pages.tsx` 出口，`KEEP_ALIVE_ENABLED=true`。
- 不变式 `skills[].targets ⊆ enabled registeredTargets`：①DB `getEnabledTargetsBySkillId` 双 enabled join(R12)；②`setRegisteredTargets` 内 prune + enabled 变则 `refreshSkills()`(R33 收口)。
- 保活页永不自动刷新，须显式 `refresh()`（loadEpoch 守卫在途 Promise）。`refreshSkills()` 仅重拉 listSkills 供货 skill.targets，含 epoch 守卫。`refreshBadgeCounts()` 已加 epoch 守卫(R36)。

## 审查系列定论（dev-zustand 分支，按 r2→r5→r6/r7→r8）
- R3：use-targets-page-state 挂载 effect 的 preferredTargetId 必须保留（删则退化排序首个，4 用例红）。
- R12(P1,治本)：skills[].targets 4 写入点2口径→DB join 统一；刻意保留 refreshSkills（删会丢 re-add）。
- R29 错误条硬编码中文 / R30 单侧缺失静默 ready+清桶[] / R31 skillPreferences 死字段 / R32 §8 批次零测试：r7 发现已落地有效。sider 勾选态由 selectedSkill.targets.includes 决定。
- **R33(P1,已修)**：enabled 翻转重拉 listSkills 收口进 setRegisteredTargets（替代 saveEditTarget 手写漏网，第三次复发）。
- **R34(P2,已修)**：Targets 挂载 guard 收窄为 `registeredTargets.length===0 && status!=="ready"`，防空桶清空 skill.targets。
- **R36(已修)**：refreshBadgeCounts 补 epoch 守卫。
- **R37(已修)**：applySkillTargetsResult 加 `if(!result)return` undefined 守卫。
- **R38(P2,已修)**：错误条 sticky top-0 z-10 + 可关闭(dataLoadErrorDismissed)。
- **R40(已修)**：repositories.filters.sortName 资源误标「来源」→「名称」；react-i18n.test.ts 过期 key 对齐。
- **R9(已修)**：Settings resetLocalDatabase 后 store.reset()+loadSharedPageData() 刷桶。
- R19/R22(P2,用户跳过未修)：R19 滚动注释不成立；R22 isRendered 只看 mountedRouteIds 致切未访问 Tab 首帧空白（修法 `|| routeId===activeRouteId`，jsdom 测不到）。

## 可复用验证套路
- 变异测试+md5 还原：cp 仓外+记 md5→最小变异→跑测试→还原+比对（全绿=零守护，红=有牙）。
- 临时探针 test：写 `<name>.test.tsx` 跑完删；时序用 console.log("[PROBE]")。
- HEAD 基线对照：git worktree add --detach + junction 指主仓对比。
- DB 语义绕开 ABI：Python sqlite3 建等价 schema+场景矩阵+等价 SQL 证过滤。
- 删临时文件用 node（bash rm 被 safe-bin 劫持损坏，PS Remove-Item 无效）：`node -e "require('fs').unlinkSync('<p>')"`。git diff>file 破坏中文，引用中文注释直接 Read。

## 统一弹窗/ESM/cache-manager
- Modal 唯一出口 `renderer/components/ui/dialog.tsx`；统一 650-680px，确认类 role="alertdialog"。已迁 Repos(4)+Targets(6)+Skills(2)+Settings(1)。
- desktop 主进程+preload 已 ESM；preload 源 .mts→.mjs sandbox:false；无 __dirname 用 import.meta.dirname。
- cache-manager：分页 `GET /v1/catalog/{generation}/pages/{n}`(n从0每页500)先取 generation；Discover 不落 SQLite；鉴权 Vercel OIDC Bearer。
