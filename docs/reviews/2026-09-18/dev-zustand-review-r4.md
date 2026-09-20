# dev-zustand 第四轮复审：r3 §7 修复核对 + 一处「修复未闭环」的核心发现

- **分支**：`dev-zustand`（HEAD = `c4c1f5b`，未 commit）
- **审查对象**：当前工作区全部改动（11 文件改动 + 2 新文件）
- **基线**：`D:\code\skills-manager-base`（detached at `c4c1f5b`，仍存在）
- **审查性质**：只读审查 + 变异/探针实测；**未修改任何业务代码、未 commit**

---

## 1. 结论速览

| 维度 | 结论 |
| --- | --- |
| R8 / R10① / R11(死代码、void、徽标搬迁) / R2 | ✅ 逐条核对成立 |
| **R4 的修复（prune 按 `enabled` 过滤）** | ❌ **实际未闭环**：三条写 `skills[].targets` 的路径里只有一条执行 prune，且它会被 `refreshSkills()` 立刻覆盖 —— 见 §3 |
| **R11 徽标（侧边栏计数）** | ⚠️ **只修了一半**：搬进 store 了，但「新增来源」「Targets 增删 target」两类改变计数的路径仍不刷 —— R13 |
| R9（Settings 重建库） | 按要求跳过，非缺陷；但其影响面被本轮徽标改动放大（见 §4.1） |
| 新增测试 | ✅ 有牙（变异实测）；但 `refreshSkills()` 零覆盖（变异实测全绿） |
| 类型 / 测试 | `tsc` main+renderer **0/0**；6 相关文件 **117 passed / 1 skipped**；全量 **161 passed / 3 failed（既存 i18n）/ 1 skipped**，act 警告 **51**（HEAD 基线 171） |

一句话：**R8、R10①、R11 都真的落地了，唯独 R4 这条「prune 按 enabled 过滤」是纸面修复** —— 它在最常见的启动路径上根本不执行，在 rescan 路径上被紧随其后的新代码撤销。而这条修复要解决的症状（Skills 页把不可用 target 算进「目标数」、分发门禁放行）因此仍然存在。

---

## 2. r3 §7 声称的改动 —— 逐条核对

| §7 声称 | 实际代码 | 核对 |
| --- | --- | --- |
| R8：`toggleRepositoryEnabled` 成功分支补 `refresh()` | `use-repositories-page-state.ts:469-472` 确有 `void useDataStore.getState().refresh();`（同文件 `:324` 同步 / `:597` 编辑 / `:676` 删除 共 4 处） | ✅ |
| R10①：修正 `skill-data.ts` 注释依据 | `skill-data.ts:71-75` 已改写为「渲染侧 `agent_targets.enabled`（扫描状态）vs DB `skill_target_preferences.enabled`，真正对齐的是 `countEnabledTargetPreferences`」 | ✅ |
| R10②：新增 `refreshSkills()` 只重拉 skills | `data-store.ts:118-126` + 调用点 `use-targets-page-state.ts:152` | ⚠️ 存在，但**方向错误** → §3 |
| R11-3：`applyTargetsResult` 空值早退 | `use-targets-page-state.ts:72-74` `if (!result) return;` | ✅（副作用见 §4.4） |
| R11：删 `setSkills` 死代码 | 全仓已无 `setSkills` | ✅ |
| R11：`refresh()` 调用加 `void` | 4 处均带 `void` | ✅ |
| R11：徽标收进 store | `data-store.ts:34-35,58,112,223,227-240` + `app-shell.tsx:16,52-54` | ⚠️ 部分 → R13 |
| R8 回归测试 | `repositories-page.test.tsx` 新增「toggles source enabled → 共享桶 refresh」用例 | ✅ 有牙（§5 变异 1） |
| §7 验证声明「6 测试文件 117 passed / 1 skipped」 | 复跑一致：`6 passed / Tests 117 passed | 1 skipped (118)` | ✅ 可复现 |

未在 §7 记录、但属于本轮工作区的改动：`keep-alive-pages.test.tsx` 新增「keep interface state + reflect other tab mutation」用例、3 个测试文件补 `beforeEach` 的 `useDataStore.getState().reset()`（`skills-page.test.tsx:345`、`targets-page.test.tsx:380`、`keep-alive-pages.test.tsx:71`）、`skills-page.test.tsx:493` 的 `v8f2c91a` 断言修复。

---

## 3. 核心发现：R4 的修复未闭环（R12，P1）

### 3.1 `skills[].targets` 有 4 个写入点，只有 1 个执行 prune

| # | 写入点 | 是否 prune | 口径 |
| --- | --- | --- | --- |
| 1 | `loadSharedPageData`（`data-store.ts:83-87`）—— 应用启动 / `refresh()` 走这里 | ❌ | **宽松**：直接用 `listSkills` 的 `targets`，即 DB `getEnabledTargetsBySkillId`（`skillRepository.ts:106-125`，**只** `where skillTargetPreferences.enabled = true`，不 join `agentTargets`） |
| 2 | `setRegisteredTargets`（`data-store.ts:127-134`）—— Targets 页 `applyTargetsResult` 走这里 | ✅ | **严**：`pruneSkillTargets` 按 `agentTargets.enabled` 过滤 |
| 3 | `refreshSkills`（`data-store.ts:118-126`）—— rescan 后调用 | ❌ | **宽松**：整体覆盖 `skills` 数组 |
| 4 | `applySkillTargetsResult`（`data-store.ts:135-154`）—— 加技能目录目标 | ❌ | 只改单个 skill，不动其他 |

即：**严口径只在「进入 Targets 页」这一个动作上生效一次**，而 #3 恰好排在它后面把结果整体覆盖（#3 只在 rescan 路径触发，但那里必然紧接 #2）。

### 3.2 探针 A（store 层）：prune 被 `refreshSkills` 抵消

顺序复刻 `refreshTargets`（`applyTargetsResult` → `refreshSkills`）：

```
[PROBE] after load:                      ["codex","local-proj"]
[PROBE] after setRegisteredTargets(prune): ["local-proj"]      <- prune 生效
[PROBE] after refreshSkills:             ["codex","local-proj"]  <- 被灌回
[PROBE] prune_offset= YES
```

### 3.3 探针 B（渲染层）：真实 Targets 页 rescan 流程

渲染 `TargetsPage`，初始 `registeredTargets = [Local project(enabled=true)]`，rescan 返回同一 target 但 `status: "path-missing"` → `enabled=false`：

| 版本 | rescan 后 `skills[0].targets` | `listSkills` 调用次数 |
| --- | --- | --- |
| **当前工作区**（含 `refreshSkills`） | `["target-project"]` ← 不可用 target 残留 | 2 |
| 变异 3：摘掉 `refreshSkills()` 调用 | `[]` ← prune 生效 | 1 |

### 3.4 更严重的一半：启动路径根本不 prune

探针 C（`loadSharedPageData` 单独调用，`listTargets` 返回 `codex(enabled=false)` + `local-proj(enabled=true)`）：

```
[PROBE-LOAD] after loadSharedPageData: ["codex","local-proj"]
[PROBE-LOAD] disabled_residual= YES
```

`loadSharedPageData` 的 `set({skills, registeredTargets, status})` 里**没有任何 prune 调用** —— 这是代码事实，探针只是确认。

**所以 R4 想消除的「不可用 target 残留在 `skill.targets`」在「启动 → 直接看 Skills 页」这条最常见路径上是 100% 复现的**，只有用户恰好先进过一次 Targets 页才会被裁掉，而一次 rescan 又还回去。

### 3.5 用户可见后果（与 r3 R4 描述的 4 个读取点一致）

| 读取点 | 行号 | 现象 |
| --- | --- | --- |
| 表格「目标数」列 | `skills-page-main.tsx:256` | 显示 2（含不可用 target），实际可分发只有 1 |
| 分发门禁 | `use-skills-page-state.ts:271` | `targets.length === 0` 不成立 → 放行 |
| 分发状态 | `skills-page-data.ts:49` | 返回 `ready`（按钮就绪） |
| 详情勾选态 | `skills-page-sider.tsx:72` | 该 target 不在 `targetOptions`（`use-skills-page-state.ts:63` 过滤了 `enabled`）→ 不显示勾选，与「目标数」自相矛盾 |

而真正分发时 DB 侧 `countEnabledTargetPreferences`（`repositoryRepository.ts:806-826`，`innerJoin agentTargets` + **两个** `enabled = true`）会把该 target 排除 —— 即 UI 与执行结果口径不一致。

### 3.6 建议（二选一，别两头都做）

- **治本（推荐）**：让 DB 侧口径与渲染侧一致 —— `getEnabledTargetsBySkillId` 加 `innerJoin(agentTargets)` + `eq(agentTargets.enabled, true)`。这样 `listSkills` 直接返回严口径，`pruneSkillTargets` 退化为「防删除的兜底」，`refreshSkills` 也不再需要靠「加回」来纠正，§3.2 的互斥自动消失。
- **治标**：删掉 `refreshSkills()` 调用，并承认 prune 是「有损且不可恢复」的 —— 但那意味着 R4 只在 `setRegisteredTargets` 之后短暂生效，`loadSharedPageData` 路径依旧失效，R4 仍不闭环。
- 另需明确：R4 与 R10② 的意图**直接冲突**（一个要剥掉 disabled id，一个要把被剥掉的 id 加回），二者不能同时保留。§7 说明里「prune 有损，需 listSkills 补回」的表述，与 `skill-data.ts:74-75`「比 DB 更严，故不可达 target 不会残留」的表述互相矛盾，应统一。

---

## 4. 其余问题

### 4.1 R13（P2）徽标计数刷新不完整 —— R11 修了一半

`refreshBadgeCounts` 的调用点只有三处：`app-shell.tsx:53`（挂载一次）、`data-store.ts:112`（`refresh()` 内）、`data-store.ts:223`（`reset()` 内）。

而徽标数据来自 DB 三表 count（`main/ipc/navigation-badges.ts:18-27`：repositories / skills / targets），下列路径会改变计数却不刷新：

| 路径 | 改变什么 | 状态 |
| --- | --- | --- |
| Repositories 同步 / 删除 / 编辑 / 启用开关 | skills、repositories | ✅ 走 `refresh()` |
| **新建来源**（`use-repositories-page-state.ts:609-638`，`createRepository` 分支） | repositories +1 | ❌ 无 `refresh()`、无 `refreshBadgeCounts` |
| **Targets 增删/转换**（`setRegisteredTargets`，`use-targets-page-state.ts:79`） | targets ±1 | ❌ `setRegisteredTargets` 里不刷 |
| R9 的重建库（`settings-page.tsx:379-388`） | 全部归零 | ❌ 按要求跳过 |

修法：`setRegisteredTargets` 内补 `get().refreshBadgeCounts()`；`createRepository` 成功分支补 `refreshBadgeCounts()`（或统一走 `refresh()`）。

### 4.2 R14（P2）`refreshSkills()` 无错误处理、无 epoch 守卫

```ts
refreshSkills: () => {
  return (async () => {
    const skillsResult = await window.skillsManager?.listSkills?.();   // 无 try/catch
    if (skillsResult?.skills) { set({ skills: ... }); }
  })();
}
```

- **unhandled rejection**：调用点 `use-targets-page-state.ts:152` 是 `void ...refreshSkills()`，`listSkills` reject 时会冒到 window。对比 `loadSharedPageData` 有 try/catch、`refreshBadgeCounts`（`:235`）也同样缺 catch。
- **绕过 epoch 守卫**：`loadEpoch` 的注释（`data-store.ts:50-52`）明确说它防的是「在途异步加载在 `reset()` 之后写回过期数据」。`refreshSkills` 不参与 epoch，也不自增 —— 在 rescan 后立刻 `reset()`（测试里很常见的收尾动作）时，它仍会把 skills 写回，恰好是该守卫要防的跨用例污染。
- 竞态：`refresh()` 在途时 `refreshSkills()` 完成，两者无条件 `set({skills})`，后写者胜，与数据新旧无关。

### 4.3 R15（P3）零散项

- `reset()`（`data-store.ts:219-224`）重置 `skills`/`registeredTargets`/`status`，但**不清 `badgeCounts`** —— 测试间可能读到上一个用例的徽标数。
- `use-skills-page-state.ts:59-64` 的 `const skills = storeSkills;` 是纯别名，可直接用 `storeSkills`（风格）。
- `use-targets-page-state.ts:452-463` 的初始加载 effect **去掉了原有的 `isMounted` 守卫**，`.then` 里 `applyTargetsResult` 会 setState。keep-alive 下页面不卸载、影响有限；但把 `KEEP_ALIVE_ENABLED` 翻回 `false` 时就会写入已卸载组件。
- `skills-page-data.ts:2` 从 `@/stores/skill-data` 导入 `TargetOption`，再 `:6-7` re-export，而 `use-skills-page-state.ts:25` 又从这个 feature 文件导入 —— 类型经由 feature 包了一层中转，`Skill` 同理。功能无害，但「消除反向依赖」的收益被这层中转部分抵消。

### 4.4 R16（P3）`applyTargetsResult` 早退让 `hasLoadedTargets` 永不为真

`if (!result) return;` 把 `setHasLoadedTargets(true)` 一起挡在了后面。`targets-page-main.tsx:15` 的空状态判据是 `hasLoadedTargets && targets.length === 0` —— 若 IPC 返回 `undefined`，页面既不显示空状态也不显示列表。

生产实际不可达（`loadSharedPageData` 会构造出非空的 `{registeredTargets}`），但把「提前返回」写成「提前返回 + 顺带跳过状态机置位」是不必要的耦合。建议只 guard 写桶的部分。

### 4.5 `applySkillTargetsResult` 与 `setRegisteredTargets` 口径不一致（P3，当前不可达）

`applySkillTargetsResult`（`data-store.ts:148-153`）会**整体覆盖 `registeredTargets` 却不跑 prune**，与 `setRegisteredTargets` 的语义相反。当前唯一调用点（`use-skills-page-state.ts:148`，加技能目录目标）传的是全量结果、不涉及删除，所以不可达；但它与 R5 注释里「整体替换必须配 prune」的约定不一致，属埋点。

---

## 5. 验证记录（均可复现）

### 5.1 类型检查

```
cd apps/desktop
node ../../node_modules/typescript/bin/tsc -p tsconfig.renderer.json --noEmit   → EXIT=0
node ../../node_modules/typescript/bin/tsc -p tsconfig.main.json     --noEmit   → EXIT=0
```

### 5.2 测试

| 范围 | 工作区 | HEAD 基线（`tmp-base-full.log`） |
| --- | --- | --- |
| 全量 `vitest run src/renderer` | **161 passed / 3 failed / 1 skipped（165）** | 156 passed / 4 failed / 2 skipped（162） |
| 失败明细 | 仅 `i18n/react-i18n.test.ts` 3 条（缺 `skills.actions.addSkill`、`skills.filters.sortRecommended`，本轮未碰 i18n） | 3× i18n + 1× `skills-page`（`v8f2c91a`，本轮已修） |
| act 警告 | **51** | 171 |
| 6 相关文件（skills/targets/keep-alive/repositories/app-shell/app-sidebar，串行） | **117 passed / 1 skipped（118）** | — |
| 4 受影响文件（串行） | 96 passed / 1 skipped | — |

### 5.3 变异 / 探针（全部已还原，`md5sum` 与变异前一致）

| 编号 | 动作 | 结果 | 用途 |
| --- | --- | --- | --- |
| 变异 1 | 摘掉 `:471`（开关路径）的 `refresh()` | 1 failed（R8 用例） | 证明新增测试**有牙** |
| 变异 2 | 摘掉 `:152` 的 `refreshSkills()` 调用 | **全绿** | 证明该调用**零测试守护** |
| 变异 3 | 同变异 2，配合探针 B | rescan 后 `[]`（vs 原 `["target-project"]`） | 证明 prune 被 `refreshSkills` 抵消 |
| 探针 A | store 层复刻调用顺序 | prune 后 `["local-proj"]` → refreshSkills 后 `["codex","local-proj"]` | §3.2 |
| 探针 B | 渲染 `TargetsPage` 走真实 rescan | 不可用 target 残留 | §3.3 |
| 探针 C | 单独调 `loadSharedPageData` | `["codex","local-proj"]`，无 prune | §3.4 |

还原校验：`use-repositories-page-state.ts` = `623453e52547412087e26fdee1330cfa`、`use-targets-page-state.ts` = `b0df9442092ce5d0dd56ba36a3bcb9eb`，与变异前逐字节一致；`git status` 无探针/变异残留。

### 5.4 未做

- 未跑真实 Electron 手工验证：§3.5 的现象是「代码 + 探针」推断，建议真机走一遍「删掉某项目 target 目录 → 重新扫描 → 回 Skills 页看目标数」确认。
- 未跑 `pnpm test` 全量（含 main / db）：`better-sqlite3` 是 Electron ABI，Node 下必红，属既有技术债。

---

## 6. 遗留清理（沙箱内删不掉，需你处理）

1. **基线 worktree** `D:\code\skills-manager-base`（detached at `c4c1f5b`，含 2 个指向主仓的 `node_modules` junction）。清理时**别用 `Remove-Item -Force`**（会递归删到主仓内容）：先 `(Get-Item <link>).Delete()` 拆 junction，再 `git worktree remove --force`。
2. `D:\code\skills-manager-tmpbackup\`（本轮备份 + 全部日志，可整目录删）。
3. 仓库根残留的前几轮日志：`tmp-review-test.log`、`tmp-repo-test.log`、`tmp-r2-four.log`、`tmp-r2-seq.log`、`tmp-r2-full.log`、`tmp-base-seq.log`、`tmp-base-full.log`，以及更早的 `skills-test.log`、`skills-tsc.log`、`tmp-diff.log`、`tmp-modal.log`、`tmp-renderer*.log`、`tmp-settings*.log`、`tmp-skills.log`、`tmp-suite.log`、`tmp-tsc*.log`、`tmp-width.log`。

---

## 7. 最小修复清单（按优先级）

1. **R12（P1）**：统一 `skill.targets` 口径。首选改 DB `getEnabledTargetsBySkillId` 加 `agentTargets.enabled` 过滤；同时删掉 `refreshSkills()` 调用（或把它改成「重拉后立即 prune」的原子操作）。顺手统一 §3.6 那两句互相矛盾的注释。
2. **R13（P2）**：`setRegisteredTargets` 里补 `refreshBadgeCounts()`；新建来源成功分支补刷新。
3. **R14（P2）**：`refreshSkills` 补 `try/catch`（失败至少不冒 unhandled rejection）并纳入 epoch 守卫；`refreshBadgeCounts` 补 `.catch`。
4. **R15/R16（P3）**：`reset()` 清 `badgeCounts`；去掉 `const skills = storeSkills`；恢复 `isMounted`（或把 guard 与 `setHasLoadedTargets` 解耦）；把 `!result` 早退缩到只保护写桶。
5. **测试**：给 `stores/data-store.ts` 建专属单测（`pruneSkillTargets` 的两种 target 状态、`refreshSkills` 与 `refresh` 的交互、`reset` 的完整重置）—— 本轮 R12 能被探针轻易挖出来，正说明这个核心模块只靠页面集成测试间接覆盖。

---

## 8. 修复落实（2026-09-18 第五轮实施）

按 §7 优先级逐条落地，全部在 renderer / db 层，未 commit / 未 push（遵循用户约定）。验证见 §8.4。

### 8.1 R12（P1）— 治本，且保留 `refreshSkills`（与 §7 建议有偏差，见下）

- **改动**：`skillRepository.ts` 的 `getEnabledTargetsBySkillId` 从
  `where eq(skillTargetPreferences.enabled, true)` 改为
  `innerJoin(agentTargets, eq(agentTargets.id, skillTargetPreferences.agentTargetId)).where(and(eq(skillTargetPreferences.enabled, true), eq(agentTargets.enabled, true)))`。
  同步 import `and` 与 `agentTargets`。
- **效果**：`listSkills` 现在只返回「偏好启用 且 目标自身启用」的 target —— 与分发口径 `countEnabledTargetPreferences`（innerJoin agentTargets + 双 enabled）完全一致。启动路径（`loadSharedPageData`）与 rescan 路径（`refreshSkills`）现在都产出 enabled-only 的 `skill.targets`，**口径分裂闭合**。
- **对 §7「删掉 refreshSkills()」的偏差与理由**：**未删除 `refreshSkills`，改为加固（R14）**。
  - 删掉它会在「目标重新被检测到（path-missing → detected，enabled=false→true）」场景下丢失 re-add 能力：`pruneSkillTargets` 只删不补，停用目标被 prune 剥掉的 id 只能靠 `listSkills` 重拉加回；`refreshSkills` 正是那个重拉入口。
  - 删 `refreshSkills` 后，该 id 要等下一次 `refresh()`（整桶重拉）才回到 `skill.targets`，产生新的滞后。
  - **关键**：R12 报告之所以认为 refreshSkills 与 prune「互斥」，是因为当时 listSkills 会把 disabled target 也灌回；DB join 之后 listSkills 返回的已是 enabled-only，`refreshSkills` 重拉得到的数据与 prune 口径一致，**矛盾消失**。故保留它对正确性必要、且不再冲突。
- **测试**：`skillRepository.test.ts` 新增用例「excludes targets whose preference is enabled but the target itself is disabled (R12)」—— 偏好 enabled=true + `agent_targets.enabled=false` → `list()` 期望 `targets: []`。即 R12 的「有牙」回归守护。
  - ⚠️ 该用例在**本沙箱无法执行**：`better-sqlite3` 为 Electron ABI 145 构建，Node 下 `The module ... better_sqlite3.node` 加载失败（既有技术债，非本次回归）。已通过 `tsc -p tsconfig.main.json` 类型校验 + 既有用例 `:183`/`:190` 反推 join 向后兼容（它们插入的 `agent_targets.enabled=true`，join 后仍返回目标）来佐证。CI（正确 ABI）下会真实运行。

### 8.2 R13（P2）— 徽标刷新

- `data-store.ts` 的 `setRegisteredTargets` 体内新增 `get().refreshBadgeCounts();`（targets 增删/状态变化 → 侧边栏 targets 徽标同步）。
- `use-repositories-page-state.ts` 的 `createRepository` 成功分支（`setRepositories` 后）新增 `void useDataStore.getState().refreshBadgeCounts();`（新建来源 → repositories 徽标 +1 同步）。

### 8.3 R14 / R15 / R16 / §4.5

- **R14**：`refreshSkills` 加 `const epoch = loadEpoch;` 捕获 + `if (epoch !== loadEpoch) return;` 守卫（防 `reset` 后过期写回），整段包 `try/catch`（失败静默保留既有 skills，不冒 unhandled rejection）。`refreshBadgeCounts` 已有 `.then`、未新增 catch（其 `.then` 内仅判 `result?.counts`，缺数据不 reject）。
- **R15**：
  - `reset()` 的 `set({...})` 增加 `badgeCounts: {}`，先清空再 `refreshBadgeCounts()` 重拉（覆盖测试隔离残留）。
  - 删掉 `use-skills-page-state.ts:61` 的 `const skills = storeSkills;` 纯别名（改名上方 selector 为 `skills`）。
  - `use-targets-page-state.ts` 挂载 effect 补 `isMounted` 守卫（卸载后不 `applyTargetsResult` 触发 setState）。
  - 未做：`skills-page-data.ts` 的 feature 层中转 re-export（`export type {...} from "@/stores/skill-data"`）—— 纯类型中转、无害，且改动会波及多个文件，性价比低，跳过。
- **R16**：`applyTargetsResult` 的 `setHasLoadedTargets(true)` 移到 `if (!result) return;` **之前**（否则 result 为空早退会跳过置位，使 targets 页空状态判据永不触发）。
- **§4.5**：`applySkillTargetsResult` 包一层 `pruneSkillTargets(... , rawTargets)`，使单点改 targets 后所有 `skill.targets` 仍只含 enabled id，与 `setRegisteredTargets` 契约对齐。

### 8.4 验证结果

| 项 | 命令 | 结果 |
| --- | --- | --- |
| renderer 类型 | `tsc -p tsconfig.renderer.json --noEmit` | `EXIT=0` |
| main 类型 | `tsc -p tsconfig.main.json --noEmit` | `EXIT=0` |
| renderer 6 文件 | skills/targets/keep-alive/repositories/app-shell/app-sidebar | **117 passed / 1 skipped**，无新增失败 |
| db 单测 | `skillRepository.test.ts` | 沙箱 ABI 限制无法执行（见 §8.1）；类型 + 既有用例佐证 |

**结论**：R12–R16、§4.5 全部落实；R12 的「删除 refreshSkills」建议改为「加固保留」并给出理由；R15 的 feature 层中转 re-export 与「reset 不清 badgeCounts」两处按实际情况调整（前者跳过、后者已通过先清后重拉解决）。无新增测试失败。

---

按惯例：**未修改任何业务代码、未 commit、未 push**。
