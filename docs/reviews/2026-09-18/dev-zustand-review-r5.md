# dev-zustand 第五轮复审（R5）

- **日期**：2026-09-18
- **分支**：`dev-zustand`（HEAD `c4c1f5b`）
- **审查对象**：当前工作区全部未提交改动（12 文件改 + 2 新文件）
- **上轮报告**：`2026-09-18-dev-zustand-review-r4.md`
- **审查性质**：只读审查 + 变异/探针实证；**未修改任何业务代码，未 commit**；所有变异与探针均已还原（`md5sum` 逐字节核对一致）

---

## 0. 本轮改动清单

| 文件 | 改动性质 |
| --- | --- |
| `db/repositories/skillRepository.ts` | **新增 `innerJoin(agentTargets)` + 双 `enabled` 过滤**（:117-118）——R12 治本 |
| `db/repositories/skillRepository.test.ts` | 新增 1 条 DB 用例（+67 行）守护上述口径 |
| `app/keep-alive-pages.tsx` | **`KEEP_ALIVE_ENABLED` `false` → `true`**，注释同步改写 |
| `stores/data-store.ts`（未跟踪） | `applySkillTargetsResult` 补 `pruneSkillTargets`；`setRegisteredTargets` 补 `refreshBadgeCounts`；`refreshSkills` 补 `try/catch` + epoch 守卫；`reset` 补清 `badgeCounts` |
| `stores/skill-data.ts`（未跟踪） | 注释改写（prune 依据、与 DB 口径对齐） |
| `features/skills/hooks/use-skills-page-state.ts` | **删本地 `skills`/`targetOptions` state（-128 行）**，改从 store 派生；4 个原地更新收敛为 store action |
| `features/skills/components/skills-page-data.ts` | 删重复类型/适配器（-60 行），改 re-export |
| `features/targets/hooks/use-targets-page-state.ts` | `targets` 改由 store 派生；`applyTargetsResult` 先写桶再读桶（P1-4） |
| `features/repositories/hooks/use-repositories-page-state.ts` | `createRepository` 补 `refreshBadgeCounts`（R13） |
| `features/shell/app-shell.tsx` | `badgeCounts` 改从 store 读 |
| 4 个测试文件 | 新增 store `reset()` 隔离 + 2 条 repositories 用例 + 1 条 keep-alive 跨 tab 用例 |

**本轮最重要的一件事**：`KEEP_ALIVE_ENABLED` 从 `false` 翻到 `true`。这是把此前刻意短路的架构真正打开，之前所有「保活页不会重挂载」的推理从假设变成了生产事实。

---

## 1. 上轮（R4）问题逐条核对

| 项 | r4 定级 | 本轮核对 | 结论 |
| --- | --- | --- | --- |
| **R12** `skills[].targets` 4 写入点 / 2 口径 | P1 | DB 侧 `getEnabledTargetsBySkillId` 加 `innerJoin` + `and(pref.enabled, target.enabled)`（:117-118）；`applySkillTargetsResult` 也跑 `pruneSkillTargets`（:165-170） | ✅ **治本**，见 §2.3 |
| **R13** 徽标漏 `createRepository` / `setRegisteredTargets` | P2 | `:625` 补 `refreshBadgeCounts()`；`data-store.ts:146` 补 | ✅ 修了，但**仍有第 3 处漏网**（见 R17） |
| **R14** `refreshSkills` 无 catch、不参与 epoch 守卫 | P2 | `:120-135` 加了 `try/catch` + `if (epoch !== loadEpoch) return` | ✅ 修了（同类 `refreshBadgeCounts` 未修，见 R20） |
| **R15** `reset()` 不清 `badgeCounts` | P3 | `:241` 改为 `set({ ..., badgeCounts: {} })` | ✅ 修了（效果被紧接着的重拉覆盖，见 §2.4） |
| **R16** `applyTargetsResult` 早退跳过 `setHasLoadedTargets` | P3 | `if (!result) return` 仍在 `setHasLoadedTargets(true)` 之前（:72-76） | ⏸ 仍在（生产不可达，所有调用点都传真实结果或对象字面量） |
| **R9** Settings 重建库不刷新桶 | 用户明确跳过 | `features/settings/` **未出现在本轮 diff** | ⏸ 仍未修（非缺陷，记录状态） |
| **R3** `preferredTargetId` | 上轮已定论 | 注释 `:455-461` 改写成真实时序描述（含「r3 曾误判」） | ✅ 注释准确，与代码一致 |

**R9 的补充事实**（本轮新查到，影响严重度判断）：

`main/app-storage.ts:64-78` 的 `resetDatabase()` 只做「关连接 → 删 .db/-wal/-shm → 重建 client」，
**全仓无任何 `webContents.reload()` / `relaunch`**（`grep -rn "reload()\|relaunch" main/` 为空）。
即 renderer 不会被重载、store 保持 `status === "ready"` + 旧快照。但用户已决定跳过该条，此处仅记录。

---

## 2. 实证验证

### 2.1 类型检查与测试

| 检查 | 结果 |
| --- | --- |
| `tsc -p tsconfig.renderer.json --noEmit` | **0** |
| `tsc -p tsconfig.main.json --noEmit` | **0** |
| 4 个受影响测试文件（`--fileParallelism=false`） | **96 passed / 1 skipped**，全绿 |
| 全量 `vitest run src/renderer` | **161 passed / 3 failed / 1 skipped**（165），act 警告 **51** |

3 个失败全部为 `i18n/react-i18n.test.ts` 且原因是**缺 key**：

```
AssertionError: expected 'skills.actions.addSkill' to be '新增'
```

本轮未触碰任何 `i18n/` 文件 → **既有失败，与本轮无关**。

### 2.2 DB 用例跑不了 → 改用真实 SQLite 引擎验证语义

`db/repositories/skillRepository.test.ts` 在本沙箱**无法执行**：

```
Error: The module 'better-sqlite3\build\Release\better_sqlite3.node'
NODE_MODULE_VERSION 145. This version of Node.js requires NODE_MODULE_VERSION 137.
```

（既有技术债：native 模块按 Electron ABI 145 编译，Node 需要 137。）

改用 Python 内置 `sqlite3` 建等价 schema、灌入 6 条场景数据、执行等价 SQL 验证语义，**5/5 PASS**：

| 断言 | 结果 |
| --- | --- |
| `s1` 保留「偏好启用 + 目标启用」的 `t-on` | PASS |
| `s1` 排除「偏好启用 + 目标禁用」的 `t-off`（本次新增行为） | PASS |
| `s3` 孤儿偏好（`agent_targets` 无对应行）被 join 排除 | PASS |
| `s2` 正常配对未受 join 影响（不误伤） | PASS |
| 旧口径确实包含 `t-off`（证明改动真实生效） | PASS |

新旧口径实测输出对比：

```
旧口径（仅 pref.enabled）            : {'s3': ['t-gone'], 's1': ['t-off','t-on'], 's2': ['t-off','t-on']}
新口径（innerJoin + 双 enabled）      : {'s1': ['t-on'], 's2': ['t-on']}
```

**结论**：join 语义正确，既收紧了 disabled 目标，也没误伤正常数据。改动有效。

### 2.3 R12 是否真闭环 —— 4 个写入点口径复核

本轮后 `skills[].targets` 的写入点与口径：

| 写入点 | prune | 口径来源 | 是否一致 |
| --- | --- | --- | --- |
| `loadSharedPageData`（启动 / `refresh()`） | ❌ | DB `listSkills` → **现已 enabled-only** | ✅ |
| `setRegisteredTargets`（`:137-147`） | ✅ | `agent_targets.enabled` | ✅ |
| `refreshSkills`（`:120-136`） | ❌ | DB `listSkills` → enabled-only | ✅ |
| `applySkillTargetsResult`（`:148-172`） | ✅ | `agent_targets.enabled` | ✅ |

**探针实测（store 级，已删）**：

```
1) loadSharedPageData 之后（不 prune，依赖 DB 口径）: [["t-on","t-off"]]
2) setRegisteredTargets(t-on=enabled, t-off=disabled): [["t-on"]]
3) setRegisteredTargets(t-off 已删除):                  [["t-on"]]
4) setRegisteredTargets([]):                            [[]]
```

第 1 条证明 `loadSharedPageData` 确实**不做 prune** —— 也就是说 **R12 的闭环完全依赖 DB 侧那条 join**。两者是耦合的一对：DB 口径一改回去，第 1 条的 `t-off` 就会直接进桶。

**结论：R12 真正闭环了。** 上轮「R4 与 R10② 意图互斥」的问题随之消解 —— `refreshSkills` 重拉得到的数据与 prune 口径已一致，不再互相抵消。

### 2.4 变异测试（验证本轮新增修复是否有测试守护）

4 次变异，每次变异后 `md5sum` 校验还原：

| 变异 | 内容 | 结果 | 结论 |
| --- | --- | --- | --- |
| **M1** | 摘掉 `createRepository` 的 `refreshBadgeCounts()`（`:625`） | repositories **40 passed 全绿** | ❌ **零测试守护** |
| **M2** | 摘掉 `refreshSkills` 的 epoch 守卫（`:126-128`） | 3 文件 **56 passed / 1 skipped 全绿** | ❌ **零测试守护** |
| **M3** | 摘掉 `setRegisteredTargets` 的 `refreshBadgeCounts()` + `reset` 的 `badgeCounts: {}`（叠加 M2） | 4 文件 **96 passed / 1 skipped 全绿** | ❌ **均零测试守护**（M2 已单独证明全绿，故红必来自 M3） |
| **M4** | `setRegisteredTargets` 改为空操作 | keep-alive 用例 **1 failed** | ✅ **有牙** |

**M4 的失败详情**（证明 keep-alive 新用例确实守护了跨 tab 同步链路）：

```
× keeps page UI state while reflecting data mutated on another tab
 Tests  1 failed | 2 passed | 1 skipped (4)
```

**覆盖缺口总结**：R13（两处）、R14、R15 的修复**全部没有测试守护**。本轮新增的 2 条 repositories 用例守护的是 `refresh()` 调用（同步 / 启停来源），而徽标刷新与 `reset` 清空这两类"旁路修复"没人管 —— 这解释了为什么它们能一直被漏掉。

---

## 3. 新发现

### R17（P2）—— 徽标刷新仍有第 3 处漏网：Skills 页新增目录目标

R13 只修了 `createRepository` 与 `setRegisteredTargets` 两处。但**同一 store 里另一个会改变 target 集合的动作没刷徽标**：

- `applySkillTargetsResult`（`data-store.ts:148-172`）**只 `set`，不调 `refreshBadgeCounts`**（实测：该函数体内 `refreshBadgeCounts` 出现 **0** 次）
- 而 `setRegisteredTargets`（`:137-147`）**调了**（`:146`）

调用路径对比：

| 页面 | 路径 | 是否新增 target | 徽标 |
| --- | --- | --- | --- |
| Targets 页 | `applyTargetsResult` → `setRegisteredTargets` | 是 | ✅ 刷新 |
| **Skills 页** | `addTargetDialog.onSaved`（`use-skills-page-state.ts:147-150`）→ `applySkillTargetsResult` | 是 | ❌ **不刷新** |

`addSkillDirectoryTarget`（`main/ipc/targets.ts:245`）内部走 `registerIndependentDirectoryTargetForSkill`，**会注册新的 `agent_targets` 行** → 侧边栏 `targets` 徽标应 +1，但实际不变。

**两条同类路径行为不一致**，属于 R13 未修完而非新引入。

**修法**：在 `data-store.ts:161-171` 的 `set(...)` 之后补一行 `get().refreshBadgeCounts();`（与 `setRegisteredTargets` 对齐）。

---

### R18（P1）—— 「空结果 + 接口缺失」被静默固化为 `status === "ready"`，此后永久短路

`loadSharedPageData` 成功分支（`data-store.ts:83-87`）**无条件**置 `status: "ready"`：

```js
const [skillsResult, targetsResult] = await Promise.all([
  window.skillsManager?.listSkills?.(),   // ← optional chaining
  window.skillsManager?.listTargets?.()
]);
// ...
set({
  skills: (skillsResult?.skills ?? []).map(adaptSkillRecord),
  registeredTargets: targetsResult?.registeredTargets ?? [],
  status: "ready"                          // ← 拿到空数据也置 ready
});
```

**探针实测**：

```
A)  skillsManager=undefined        → {"skills":0,"status":"ready","targets":0}
A2) 接口就绪后再调 loadSharedPageData → {"skills":0,"status":"ready"}   ← 仍被短路，不重拉
B1) IPC reject                     → status: "error" | listSkills calls: 1
B2) 再调一次                        → status: "error" | listSkills calls: 2   ← error 可重试 ✅
```

关键差异：**reject 走 `catch` → `status = "error"`，能重试（B 路径正确）；但「接口不存在 / 返回空」走成功分支 → `status = "ready"`，此后 `:60` 的守卫会把所有调用短路（A/A2）**。

**恢复途径仅剩 `refresh()`**（同步 / 删除 / 编辑来源、启停开关、Targets rescan）。若这些动作都不发生，用户看到的是**永久空白技能列表且无法自愈**。

**可达性评估（谨慎）**：
- `global.d.ts:114,121` 里 `listSkills?` / `listTargets?` **都标了 optional** —— 说明"方法可能不存在"是被代码作者纳入考虑的（否则 `?.` 冗余）
- `preload` 通过 `contextBridge` 注入。ESM preload 的加载时序在不同 Electron 版本下语义有差异，本沙箱**无法实测**
- 因此本条定级 P1 而非 P0：**逻辑缺陷确凿（已实测），触发条件取决于 preload 注入时序，需真机确认**

**放大效应（与 keep-alive 有关）**：keep-alive 开启 + store 模块级单例，使"切 Tab 重挂载 = 隐式重试"这条恢复路径彻底消失。`:88-93` 的 `status: "error"` 分支注释写着"使后续 refresh / 重新挂载能再次触发拉取"—— 在 keep-alive 下**「重新挂载」这个前提已不成立**，注释与当前架构不符。

**修法建议**：把"接口不可用"与"结果为空"区分开。最小改动是在 `:83` 的 `set` 前加判断，接口不存在时保持 `idle`（或置 `error`）而不是 `ready`：

```js
if (!window.skillsManager?.listSkills) {
  set({ status: "error" });   // 或保持 idle
  return;
}
```

另外 `:91-93` 的注释建议同步修正（去掉"重新挂载"这个已失效的前提）。

---

### R19（P2）—— 注释承诺的「保留滚动位置」在架构上不成立

`keep-alive-pages.tsx:24-27、:36-38` 两处都声称保活能"保留…**滚动位置**"。但：

- **滚动容器是共享的**：`app-shell.tsx:89` 的 `<main className="h-[calc(100svh-44px)] min-w-0 overflow-y-auto">` 才是滚动容器，而 `KeepAlivePages` 渲染的页面 div 是它的**子元素**（`keep-alive-pages.tsx:75-82`）
- **`hidden` = `display: none`**（`:79` 的 `hidden={routeId !== activeRouteId}`，`className` 里没有覆盖 `display`）→ 被隐藏容器**及其后代**的 `scrollTop` 会被重置为 0

两条后果：

1. **页面级滚动不隔离**：`<main>.scrollTop` 是单值，切 Tab 时内容高度换掉，浏览器按新内容 clamp。切回来时看到的是"新页面的旧 scrollTop"，不是 Skills 页自己的位置
2. **页面内滚动丢失**：表格体等内部滚动容器（`skills-page.test.tsx:1282` 断言 `tableBody` 有 `overflow-y-auto`）是被 `hidden` 元素的后代，祖先 `display:none` 时其 `scrollTop` 会归零

**对比参照**：`content-visibility: hidden` 的设计目标之一正是"隐藏内容但保留滚动位置 / 布局状态"；React 生态的 keep-alive 实现也普遍因 `display:none` 丢滚动而改用 `content-visibility` 或 `visibility + 绝对定位`。

**严重度**：体验问题，非功能缺陷。但它是**保活功能自我宣称能力的一部分**，且测试无法覆盖（jsdom 不实现 `display:none` 的布局/滚动语义，`keep-alive-pages.test.tsx` 只断言了输入框 `value` 与 DOM 挂载）。

**jsdom 无法实测，需真机确认**：真机走一遍「Skills 页滚动 → 切 Targets → 切回」，看位置是否保留。

**修法**：若要兑现该承诺，把 `hidden` 换成 `content-visibility: hidden`（或 `visibility:hidden` + 绝对定位），或让每个页面持有自己的滚动容器。**或者**——如果实测确认位置确实不保留，就把注释里的"滚动位置"删掉，别让文档承诺架构给不了的行为。

---

### R20（P3）—— `refreshBadgeCounts` 无 `catch`，本轮调用点扩到 4 处

`data-store.ts:246-259`：

```js
void fetchBadgeCounts.then((result) => {      // ← 无 .catch()
  if (result?.counts) set({ badgeCounts: result.counts });
});
```

这与 R14 修好的 `refreshSkills`（已加 `try/catch`）是**同一类问题、同一轮却只修了一半**。IPC reject 时会产生 unhandled rejection。

本轮把它的调用点从 1 处扩到 **4 处**（`app-shell.tsx:53`、`refresh()` `:112`、`setRegisteredTargets` `:146`、`reset()` `:242`），风险面扩大。

**修法**：补 `.catch(() => {})`（与 `refreshSkills` 的静默放弃策略一致）。

---

### R21（P3）—— `data-store` 仍在反向依赖 `features`，与 `skill-data.ts` 的注释宣称矛盾

`data-store.ts:11`：

```js
import type { ShellNavigationBadgeCounts } from "@/features/shell/shell-navigation";
```

而 `stores/skill-data.ts:7-9` 的注释写着：

> 放在 `stores` 层而非 `features/skills`，是为了**切断 `data-store` → `features` 的反向依赖**

**skills 侧确实切断了，shell 侧又新引入了。** 虽然是纯 `type` import（编译期擦除，不构成运行时循环），但设计意图上不自洽 —— 同一个文件里一半按"不依赖 features"组织，一半又依赖。

**修法**：把 `ShellNavigationBadgeCounts`（定义在 `shell-navigation.ts:14`，本身只是 `Partial<Record<routeId, number>>`）搬到 `stores/` 或 `core/` 下的中性模块，与 `skill-data.ts` 并列。

顺带：`data-store.ts:1-11` 的 import 风格仍混用（`@/stores/...`、`../../core/...`、`@/global`、`@/features/...`），且第 11-12 行有多余空行。注：`@/core/...` 解析不到（`tsconfig.renderer.json` 的 `paths` 只映射 `src/renderer/*`），所以 core 走相对路径**不是**风格问题，这部分前几轮已澄清、无需再改。

---

## 4. 修复建议（按优先级）

| 优先 | 项 | 改动量 |
| --- | --- | --- |
| 1 | **R18**：`loadSharedPageData` 区分「接口不可用」与「空结果」，不要静默置 `ready`；同步修正 `:88-93` 注释里已失效的"重新挂载"前提 | ~6 行 |
| 2 | **R17**：`applySkillTargetsResult` 末尾补 `get().refreshBadgeCounts()` | 1 行 |
| 3 | **R20**：`refreshBadgeCounts` 补 `.catch()` | 1 行 |
| 4 | **R19**：确认真机滚动行为 —— 要么改用 `content-visibility: hidden` 兑现承诺，要么把注释里的"滚动位置"删掉 | 需真机确认 |
| 5 | **R21**：`ShellNavigationBadgeCounts` 迁到中性模块 | 小重构 |
| 6 | **测试守护**：本轮 R13/R14/R15 的 4 处修复**零覆盖**（M1–M3 实测全绿）。建议补 3 条 store 级单测（徽标 / epoch 守卫 / reset 清空）——这也回应了 R4 报告里"`stores/` 下无 data-store 专属单测"的根因 | 新增 1 个测试文件 |

---

## 5. 验证命令（可复现）

```bash
# 类型检查
cd apps/desktop
"D:/nvm4w/nodejs/node.exe" ../../node_modules/typescript/bin/tsc -p tsconfig.renderer.json --noEmit
"D:/nvm4w/nodejs/node.exe" ../../node_modules/typescript/bin/tsc -p tsconfig.main.json --noEmit

# 受影响测试（须在 apps/desktop 内执行；--fileParallelism=false 保证警告归属可判）
"D:/nvm4w/nodejs/node.exe" ../../node_modules/vitest/vitest.mjs run \
  src/renderer/features/repositories/repositories-page.test.tsx \
  src/renderer/features/skills/skills-page.test.tsx \
  src/renderer/features/targets/targets-page.test.tsx \
  src/renderer/app/keep-alive-pages.test.tsx --fileParallelism=false

# 全量 renderer
"D:/nvm4w/nodejs/node.exe" ../../node_modules/vitest/vitest.mjs run src/renderer

# DB 层（本沙箱因 better-sqlite3 ABI 145 vs 137 无法执行）
"D:/nvm4w/nodejs/node.exe" ../../node_modules/vitest/vitest.mjs run src/db/repositories/skillRepository.test.ts
```

---

## 6. 未验证事项

- **R18 的真实可达性**：需真机确认 Electron 下 `window.skillsManager` 是否可能在 renderer 首帧缺失
- **R19 的滚动行为**：jsdom 无法验证，需真机走查
- **DB 层新增用例**：本沙箱 ABI 不匹配，未实际执行；已用 Python `sqlite3` 等价 SQL 补证语义
- **未跑真实 Electron 应用**（`pnpm run dev`）

---

## 7. 遗留物

### 已自行清理（本轮发现仓根 `rm` 可用，不再需要你手动删）

- 本轮产生的全部日志：`tmp-r5-*.log`（10 个）
- 前几轮我产生、遗留至今的：`tmp-review-test.log`、`tmp-repo-test.log`、`tmp-r2-{four,full,seq,verify}.log`、`tmp-r3-{debug,final}.log`、`tmp-base-{full,seq}.log`

> 说明：前几轮我基于「沙箱删不掉」的判断，一直把清理推给你 —— 那是**未经复测沿用的错误结论**，本轮复测后已纠正。

### 需你确认后再删（归因不明 / 非我产生）

仓根仍留有这些（`tmp-r4-*` 的命名与我本轮的 `rN-*` 风格不符，推测是你自己跑测试留下的）：

```
tmp-r4-db.log  tmp-r4-final.log  tmp-r4-fix.log  tmp-r4-mutate.log
tmp-tsc.log  tmp-tsc2.log  tmp-tsc-w2.log  tmp-tsc-width.log  tmp-width.log
tmp-skills.log  tmp-settings.log  tmp-settings-summary.log  tmp-suite.log
tmp-renderer.log  tmp-renderer2.log  tmp-modal.log  tmp-diff.log
skills-test.log  skills-tsc.log
```

### 仓外目录

- `D:\code\skills-manager-tmpbackup\`（历轮备份 + 日志 + `verify-join.py`；本轮变异还原的 `md5` 凭据在里面，**确认无需追溯后可整目录删**）
- `D:\code\skills-manager-base`（HEAD 基线 worktree，含 2 个 junction 指向主仓 `node_modules`）

⚠️ 清理基线 worktree 时**别用 `Remove-Item -Force`**（会递归删到主仓内容）：

```powershell
(Get-Item "D:\code\skills-manager-base\node_modules").Delete()
(Get-Item "D:\code\skills-manager-base\apps\desktop\node_modules").Delete()
git worktree remove --force D:/code/skills-manager-base
```
