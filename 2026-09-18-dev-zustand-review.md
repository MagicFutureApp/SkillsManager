# 代码审查：dev-zustand 分支（keep-alive + zustand 共享数据桶）

- **审查时间**：2026-09-18
- **分支**：`dev-zustand`（HEAD = `c4c1f5b`）
- **审查范围**：工作区未提交改动（6 改 + 1 新增），不含 HEAD 已提交内容
- **审查性质**：只读审查，未修改任何代码，未 commit

## 修订记录

| 版本 | 修订点 |
| --- | --- |
| v1 | 初版 |
| v2 (2026-09-18) | 修正 3 处事实错误：① §3 P0-1 证据句误称 `listTargets` 唯一调用点（实为两处）；② §3 P1-3 边界结论误推「`selectedTarget = null` → 详情空白」（实为初始选中偏好被静默覆盖）；③ §3 P0-1 因果归属误置于 keep-alive（真正根因是 store 的 `status === "ready"` 一次性守卫，翻回 flag 无法恢复刷新）。P0-1 / P0-2 / P1-3 的**主结论均不变**。 |
| v3 (2026-09-18) | 落实 §4 修复建议（见 §7）：新增中性模块 `stores/skill-data.ts` 解 store→features 反向依赖（P2.3）；`data-store` 加 `refresh()` 并在 Repositories 同步后调用（P0-1）；`setRegisteredTargets` 裁剪 `skills[].targets`（P0-2）；`applyTargetsResult` 改单一数据源（P1-4）；修正初始选中注释（P1-3）；加载失败回退 `status`（P2.1）；重命名 `loadSkillsPageData`→`loadSharedPageData`（P2.6）；去掉未用 `TargetOption` 导入（P2.5）。另修正 §5.1 示例命令路径。验证：renderer `tsc --noEmit` 全绿；受影响 3 个测试文件 `56 passed / 1 skipped`（与 v2 基线一致）。 |

## 0. 改动清单

| 文件 | 状态 | 改动要点 |
| --- | --- | --- |
| `apps/desktop/src/renderer/stores/data-store.ts` | 新增（v3 重写） | zustand 跨 tab 共享数据桶：`skills` + `registeredTargets`；新增 `refresh()`（P0-1）、`setRegisteredTargets` 裁剪 `skills[].targets`（P0-2）、加载失败回退 `status`（P2.1）、`loadSkillsPageData`→`loadSharedPageData`（P2.6） |
| `apps/desktop/src/renderer/stores/skill-data.ts` | 新增（v3） | 中性领域模块：`Skill`/`TargetOption` 类型与 `adaptSkillRecord`/`adaptTargetOption`/`pruneSkillTargets`，供 `data-store` 与 `skills-page-data` 共用，消除 store→features 反向依赖（P2.3） |
| `apps/desktop/src/renderer/app/keep-alive-pages.tsx` | 改 | `KEEP_ALIVE_ENABLED` 由 `false` 翻到 `true` |
| `apps/desktop/src/renderer/features/skills/hooks/use-skills-page-state.ts` | 改 | `skills` / `targetOptions` 改从 store 派生；删除本地 `loadSkillsPageData`；3 个乐观更新改为调 store 动作 |
| `apps/desktop/src/renderer/features/targets/hooks/use-targets-page-state.ts` | 改 | `targets` 改由 store 派生；`applyTargetsResult` 写回 store；初始加载改走 store |
| `apps/desktop/src/renderer/app/keep-alive-pages.test.tsx` | 改 | 加 `reset()`；新增「跨 tab 数据同步 + 保留 UI 状态」用例；关键词统一为 `Review Bot` |
| `apps/desktop/src/renderer/features/skills/skills-page.test.tsx` | 改 | 加 `reset()`；修正 `v8f2c91a` 断言 |
| `apps/desktop/src/renderer/features/targets/targets-page.test.tsx` | 改 | 加 `reset()` |

---

## 1. 这批改动解决了什么问题

之前 keep-alive 被刻意短路（`KEEP_ALIVE_ENABLED = false`），切 Tab 即卸载页面，行为等价于旧的 `<Outlet/>`。本次翻到 `true` 后，页面首次访问才挂载、之后只切 `hidden` 可见性，从而保留查询词、分页、选中项、滚动位置等局部状态。

但保活同时打断了另一个隐式机制：**「切回来 → 重新挂载 → 重新 `listSkills`」原本承担着数据刷新职责**。页面不再重挂载，另一个 Tab 的增删改就不会反映过来。（补充：本次重构还把这条刷新路径从 store 层**彻底堵死**了 —— 见 §3 P0-1，即使页面重挂载也不会重拉。）为此引入了共享数据桶：

| 层 | 改动前 | 改动后 |
| --- | --- | --- |
| 页面复用 | 切 Tab 即卸载 | 首次访问才挂载，之后只切 `hidden` |
| 数据来源 | Skills 页 `useState` 自持 `skills` + `targetOptions`；Targets 页自持 `targets` | 提升到 `stores/data-store.ts`，成为跨 tab 唯一真源 |
| 数据一致性 | 依赖重挂载隐式刷新 | 任一页 mutation 写回桶，另一页 `useMemo` 派生即更新 |
| 加载去重 | 每页每次挂载各拉一次 | store 按 `status` 去重，全应用只拉一次 |

关键接点：

- `use-skills-page-state.ts:60-65` —— `skills` / `targetOptions` 改从 store 派生（`targetOptions` 用 `useMemo(registeredTargets.filter(enabled).map(adaptTargetOption))`）
- `use-targets-page-state.ts:66-67, 76` —— `targets` 由 store 派生；`applyTargetsResult` 内写回 `registeredTargets`
- 4 个原地乐观更新收敛成 store 动作：`applySkillTargetsResult` / `toggleSkillTargetPreferenceLocally` / `removeSkillTargetLocally` / `setRegisteredTargets`

设计方向是对的：**保活必然要打断「重挂载即刷新」，所以必须引入一个共享真源**。问题出在真源的失效策略和同步粒度上。

---

## 2. 验证证据（实测）

执行环境：`D:/nvm4w/nodejs/node.exe` + 仓库 `node_modules` 直跑 vitest（本机 bash 缺 `grep`/`cat`/`head`，故用 node 入口而非 pnpm shim）。

```bash
cd apps/desktop

# 类型检查
"D:/nvm4w/nodejs/node.exe" ../../node_modules/typescript/bin/tsc -p tsconfig.renderer.json --noEmit
# → EXIT=0（renderer 全绿）

# 受影响的三个测试文件
"D:/nvm4w/nodejs/node.exe" ../../node_modules/vitest/vitest.mjs run \
  src/renderer/features/skills/skills-page.test.tsx \
  src/renderer/features/targets/targets-page.test.tsx \
  src/renderer/app/keep-alive-pages.test.tsx
# → Test Files 3 passed / Tests 56 passed | 1 skipped

# 全量 renderer
"D:/nvm4w/nodejs/node.exe" ../../node_modules/vitest/vitest.mjs run src/renderer
# → Test Files 2 failed | 16 passed (18) / Tests 4 failed | 158 passed | 1 skipped (163)
```

4 个失败中：

| 失败项 | 判定 |
| --- | --- |
| `i18n/react-i18n.test.ts` × 3（缺 `skills.actions.addSkill`、`skills.filters.sortRecommended` 键） | **既有失败**，本次未触及 i18n 文件 |
| `repositories-page.test.tsx` 首个用例 Timeout 5000ms（全量并行时 5206ms） | **flaky**，单文件跑全绿，与本次无关 |
| `tsc` / 三个受影响文件 | **全绿** |

结论：本次改动没有引入新的测试失败，也没有类型错误。

---

## 3. 问题清单

### P0-1 数据全程只加载一次，且没有任何失效入口（功能回归）

**证据**

- `listSkills` 在 renderer 中的**唯一生产调用点**是 `stores/data-store.ts:64`（全仓 grep 确认）。
- `listTargets` 在 renderer 中有**两处**生产调用点：`stores/data-store.ts:65`，以及 `use-targets-page-state.ts:138`（`refreshTargets` 内 `rescanResult ?? (await window.skillsManager?.listTargets?.())`，仅在手动 rescan 且 `rescanTargets` 未返回时触发）。**后者只写 targets、不碰 skills**，因此不改变本条结论 —— 但对「唯一」二字的表述必须修正。
- `status` 只在 `reset()` 里回退到 `idle`（`data-store.ts:172-176`），而 `reset()` **只被 3 个测试文件调用**，生产代码无调用点。
- **真正的阻断点在 store 的一次性加载守卫**：`data-store.ts:49-51` 的 `if (get().status === "ready") return Promise.resolve();`。store 是模块级单例，`status` 首次加载后常驻 `ready`，**跨页面卸载/重挂载存活** —— 所以即便页面重新挂载，`loadSkillsPageData` 也只走短路分支，不再发 `listSkills`。这一条与 keep-alive 无关，是本次重构独立引入的（HEAD 的 skill 数据在页面 `useState`，随页面挂载重拉）。
- keep-alive 开启只是**额外**掐掉了「切回即重挂载」这条路：Skills 页加载 effect（`use-skills-page-state.ts:74-76`，空依赖）现在只跑一次，页面不再卸载。
- Repositories 页同步成功后只 `loadRepositories()`（`use-repositories-page-state.ts:308-320`），不触碰 store。

**后果链路**：在 Repositories 页同步出一个新技能 → DB 已更新，但 renderer 的 `store.skills` 仍是初始快照 → 切到 Skills 页（保活、不重挂载、`status === "ready"` 直接返回）→ **新技能永远不显示，只有重启应用才会出现**。

对比 HEAD：HEAD 的 skill 数据存在页面 `useState`，挂载时 `listSkills`，所以每次切回 Skills 页都重新拉取 —— 那时确实是"每次切回都刷新"。**但这不等于"把 keep-alive 翻回 `false` 就能恢复"**：store 是模块级单例，`KEEP_ALIVE_ENABLED = false` 让页面重新挂载后，`loadSkillsPageData` 仍会命中 `status === "ready"` 短路，**同样不会重新 `listSkills`**。所以：

- `keep-alive-pages.tsx:29-31` 的注释「翻回 `false` 即恢复短路口…行为与改造前 `<Outlet/>` 等价」在**渲染**语义（挂载/卸载、局部状态重置）上成立；
- 但在**数据刷新**语义上已不再等价 —— HEAD 的"切回即刷新"在本次重构后**无法通过翻 flag 恢复**，必须在 store 层加刷新入口（见 §4 #1）。
- 换言之：**P0-1 的修复方向是给 store 加刷新能力，不是回退 keep-alive。**

此外 Skills 页现在**完全没有刷新途径** —— Targets 页虽有手动 rescan（`refreshTargets` → `rescanTargets` / `listTargets`），但那条链路只写 `registeredTargets`，对 `skills` 无任何作用。

### P0-2 `skills[].targets` 是快照，与 `registeredTargets` 单向失同步

**证据**

- store 对 `registeredTargets` 是**整体替换**，对 `skills[].targets` 只在 Skills 页自己的 3 个动作里**打补丁**。
- Targets 页的 `applyTargetsResult`（`use-targets-page-state.ts:69-104`）**只写 `registeredTargets`，不更新 `skills`**。

**受影响的 4 处读取点**（全部读 `selectedSkill.targets` / `skill.targets`）：

| 位置 | 用途 | 失效表现 |
| --- | --- | --- |
| `use-skills-page-state.ts:272` | 分发前的门禁 `selectedSkill.targets.length === 0 → return` | 已删 target 仍算有效目标，按钮假就绪 |
| `skills-page-data.ts:95` | `getSkillDistributionState` = `targets.length > 0` | 同上，`分发` 按钮保持可用 |
| `skills-page-sider.tsx:72` | `checked = selectedSkill.targets.includes(target.id)` | 勾选态与目标列表不同步 |
| `skills-page-main.tsx:256` | 表格"目标数"列直接渲染 `skill.targets.length` | 显示含已删 target 的过期数字 |

**复现路径**：Skills 页勾选 target T → 切到 Targets 页删除 T → 切回 Skills 页：详情里 T 的 checkbox 消失（`targetOptions` 已由 store 过滤），但该技能仍被判为"有分发目标"，`目标数` 列数字也没减。

**根因**：「一半打补丁、一半整体替换」的同步粒度混用。HEAD 不存在此问题，因为 Targets 页删除后切回 Skills 页会重新 `listSkills` 拿到正确的 `targets`。

### P1-3 Targets 页初始加载依赖 effect 执行顺序 + 微任务时序

**证据**：`use-targets-page-state.ts:439-449`

```ts
void useDataStore.getState().loadSkillsPageData().then(() => {
  const { registeredTargets } = useDataStore.getState();
  applyTargetsResult({ registeredTargets }, registeredTargets[0]?.id);
});
```

- 这段代码的意图是「显式传 `preferredTargetId`，把初始选中固定成 fixture 顺序首个（`Local project`），覆盖掉名称排序首个（`Design scratch`）」（注释 `:442-445` 已自认这是复刻改造前行为的时序技巧）。但结合下一条的机制可知：**这个覆盖只在「`Local project` 恰好落在可见列表里」时才成立**，否则会被 `visibleTargets` 选择 effect 反手改写。即「初始选中 = fixture 顺序首个」并非代码保证的契约，只是当前 fixture 下的巧合 —— 这正是该处脆弱的地方。
- 附带边界问题：`registeredTargets[0]?.id` 取自**未分页的 store 顺序**，而 `visibleTargets` 是**名称排序后的第一页**。当 target 数量超过一页、且 store 顺序首个不在第 1 页时：`preferredTargetId` 的校验（`nextTargets.some(...)`，遍历的是**未分页全量列表**）会通过并写入 `selectedTargetId`；但随后 `visibleTargets` 选择 effect（`use-targets-page-state.ts:524-537`）发现该 id 不在可见列表，便把它**改写**为 `visibleTargets[0]?.id`。
- **为何不是 v1 说的"详情空白"**（v1 在此写错）：① `applyTargetsResult` 内部本就有 `nextTargets[0]?.id ?? null` 兜底（`:99`）；② `visibleTargets` effect 只要 `visibleTargets.length > 0`，就会把不在可见列表的 `selectedTargetId` 强制改写为 `visibleTargets[0]?.id`；③ 该 effect 依赖 `[visibleTargets]`，而 `visibleTargets` 的 `useMemo` 依赖链 `registeredTargets → targets → filteredTargets → visibleTargets` 每次 store 更新都会换新引用，**effect 必然重跑**。→ 只要存在 ≥1 个 target，`selectedTarget` 恒为某个可见 target，界面不崩、详情不空白。
- **影响面校准**：本条的真实 blast radius 仅限**初始选中哪一项**，不会导致界面异常或数据错误。真正的问题是「隐式契约 + 一处实际失效的偏好逻辑」：由于 `visibleTargets` effect 在每次 store 更新后都会重新归一化选中项，`applyTargetsResult` 里那段 `preferredTargetId` 逻辑在「目标不可见」时是**实际不生效的死代码路径**。它会在后续任何人调分页/排序/`DEFAULT_PAGE_SIZE` 时静默改变行为 —— 故仍值得修，但不应被读成"页面会白屏"级别的缺陷。

### P1-4 `applyTargetsResult` 双数据源、名实不符

入参 `result` 既用于算 `nextTargets` 做本地校验（`setCheckedIds` / `setSelectedTargetId` / `nextTargetIds`），又整体覆盖 store，而页面实际渲染读的是 store。当前所有调用点恰好同源（都来自 IPC 全量返回）所以暂时无感，但一旦出现「先改 store 再传入旧 result」的调用点，校验基准与渲染数据就会分叉。

### P2 其余问题

1. **`status` 在加载失败后永久停在 `"loading"`**：`data-store.ts:59` 先 `set({ status: "loading" })`，async IIFE 无 catch；reject 后 `finally` 只清 `loadPromise`，`status` 不回退。当前无 UI 消费 `status` 所以无感，但语义已错。同时调用方 `void ... .then(...)` 无 `.catch` → 未处理的 promise rejection（该问题 HEAD 也存在，非新增）。
2. **`loadEpoch` / `reset` 是为测试而生的生产代码**：`reset()` 只被测试调用，却要求每个新增测试文件手动 `reset()`（本次已改 3 个文件）。测试之间通过模块级单例隐式耦合，容易漏。
3. **依赖方向反向**：`renderer/stores/data-store.ts` import `@/features/skills/components/skills-page-data`，而 `features/skills` 又 import `stores/data-store` → 双向依赖。若 `skills-page-data` 将来 import store 即形成循环。
4. **导入风格不一致**：同一文件里混用 `@/features/...`、`@/global` 与相对路径 `../../core/targets/target-api`；`shell-store.ts` 则全用相对路径。
5. **冗余导入**：`data-store.ts:3` 导入 `type TargetOption` 但全文件未使用。`tsconfig.renderer.json` 未开 `noUnusedLocals`，所以 `tsc` 不报错，属死代码。
6. **命名误导**：`loadSkillsPageData` 实际同时加载 skills + targets，且被 Targets 页调用。建议改为 `loadSharedPageData` 之类。

---

## 4. 修复建议（按优先级）

1. **给 store 加 `refresh()`**（`loadEpoch += 1` 后强制重拉，忽略 `status === "ready"`），在 Repositories 页同步成功后、Targets 页 mutation 后调用；或在保活页面上加"变可见时刷新"（监听 `activeRouteId` 变化触发）。**不做这一步，P0-1 就是明确的功能回归。** 注意：**回退 `KEEP_ALIVE_ENABLED` 不能替代这一步**（见 §3 P0-1），守卫在 store 层，与页面是否重挂载无关。
2. **统一同步粒度，消除 P0-2**：二选一 ——
   - 两个真源都整体替换：mutation 后同时重拉 `listSkills` + `listTargets`；
   - 或补一个 `syncTargetsIntoSkills()`，在删除 / 转全局时从所有 `skill.targets` 剔除该 id。
3. **P1-3** 要么彻底去掉 `preferredTargetId` 依赖（接受"名称排序首个"的初始选中），要么把初始选中规则显式化（例如"初始选中 store 顺序首个，若其不在当前页则跳页或改为选中可见首个"，把意图写进代码而非注释），不要依赖 effect 顺序与微任务时序。另建议同步修正 `use-targets-page-state.ts:442-445` 的注释 —— 它把 `preferredTargetId` 描述为能保住 `Local project`，但实际只在「该 target 恰好可见」时成立。
4. **P1-4** 让 `applyTargetsResult` 只负责"用 IPC 结果刷新 store"，本地校验改为读 store 派生值，避免双源。
5. **架构收敛**：store 只保留数据 + 纯 setter，`applySkillTargetsResult` / `toggleSkillTargetPreferenceLocally` 这类页面语义搬回 `features`，同时解掉 stores → features 的反向依赖。

---

## 5. 顺带发现的既有技术债（非本次引入）

1. **HEAD 上 `skills-page.test.tsx:493` 是必然失败的断言**：
   - `git log -S 'v${selectedSkill.version}' -- apps/desktop/src/renderer/features/skills/` → 只有 `5187b94`（"style: 统一版本号展示格式并加 v 前缀"）
   - `git log -S 'v8f2c91a' -- .../skills-page.test.tsx` → 空（从未提交过）
   - 即 `5187b94` 给 UI 加了 `v` 前缀却没同步测试断言，此后该断言一直红。本次工作区把它改成 `v8f2c91a` 修好了。
2. `searchSkills("Release Notes")` → `"Review Bot"` 属无害的文字统一（该 helper 只断言输入框 value）。
3. 加上 i18n 的 3 个红 + 无任何 workflow 跑 `pnpm test`：这套测试长期无人守护，建议把 renderer 测试接进 CI。

---

## 6. 遗留清理

- 仓库根目录有我本次生成的临时日志：`tmp-review-test.log`、`tmp-repo-test.log`（沙箱内无法删除），需手动清理。
- 仓库根目录原有的 `tmp-*.log` 未做任何处理。

---

## 7. 修复落实（v3，2026-09-18）

§3 列出的问题全部落实。验证方式：renderer `tsc --noEmit` 全绿；受影响 3 个测试文件（`skills-page.test.tsx` / `targets-page.test.tsx` / `keep-alive-pages.test.tsx`）`56 passed / 1 skipped`，与 v2 基线一致，无新增失败。

| 问题 | 修复方式 | 落点 |
| --- | --- | --- |
| **P0-1** 数据只加载一次、无失效入口 | `data-store` 新增 `refresh()`（invalidate 在途 Promise + `status` 回 `idle` + 强制重拉）；Repositories 同步成功后调用，让保活、不重挂载的 Skills 页也能拿到新技能。修复方向是 store 加刷新能力，**不是**回退 keep-alive（§3 P0-1 已论证）。 | `data-store.ts` `refresh`；`use-repositories-page-state.ts` 同步成功分支 |
| **P0-2** `skills[].targets` 单向失同步 | `setRegisteredTargets` 写桶时同步调用 `pruneSkillTargets(skills, registeredTargets)`，剔除已不存在的 target id；4 个读取点（分发门禁 `use-skills-page-state.ts:272` / 分发状态 `skills-page-data.ts:95` / 勾选态 `skills-page-sider.tsx:72` / 目标数 `skills-page-main.tsx:256`）随之一致 | `data-store.ts` `setRegisteredTargets` + `skill-data.ts` `pruneSkillTargets` |
| **P1-3** 初始选中依赖 effect 顺序/微任务时序 | 保留"优先 store 顺序首个、不可见则退回可见首个"规则，重写 `use-targets-page-state.ts:442-445` 注释，去掉"复刻改造前/保证 Local project"的误述，显式说明 `preferredTargetId` 仅在可见时生效 | `use-targets-page-state.ts` 挂载 effect 注释 |
| **P1-4** `applyTargetsResult` 双数据源 | 先写 store、再读桶派生 `registeredTargets` 做本地校验，单一数据源，杜绝"入参校验与渲染数据分叉" | `use-targets-page-state.ts` `applyTargetsResult` |
| **P2.1** `status` 失败永久 `loading` | 加载 IIFE 加 `catch`，失败回退 `status: "error"`（可被后续 `refresh` 重拉） | `data-store.ts` `loadSharedPageData` |
| **P2.2** `reset`/`loadEpoch` 测试耦合 | 保持现状：生产无调用点，但 3 个测试依赖 `reset()`；移除需同步改写测试，本期未动 | — |
| **P2.3** store→features 反向依赖 | 新增中性模块 `stores/skill-data.ts` 承载 `Skill`/`TargetOption`/`adaptSkillRecord`/`adaptTargetOption`/`pruneSkillTargets`；`data-store` 改从它导入，`skills-page-data` 仅 re-export，循环依赖消除 | `stores/skill-data.ts`（新增）；`data-store.ts`；`skills-page-data.ts` |
| **P2.4** 导入风格不一致 | `data-store` 统一用 `@/` 别名（`@/stores/skill-data`、`@/global`），core 走相对路径（注意：`@/core` 别名在 renderer 下不解析，core 必须在 `src/core`，故用 `../../core/...`） | `data-store.ts` |
| **P2.5** 未用导入 | 移除 `data-store` 中未使用的 `type TargetOption` | `data-store.ts` |
| **P2.6** 命名误导 | `loadSkillsPageData` → `loadSharedPageData`（同时加载 skills + targets，且被 Targets 页调用） | `data-store.ts` + 两处调用点（`use-skills-page-state.ts:75`、`use-targets-page-state.ts:440`） |

> **§4 #5（架构收敛）未落实**：该条建议把 `applySkillTargetsResult` / `toggleSkillTargetPreferenceLocally` / `removeSkillTargetLocally` 等页面语义从 store 搬回 `features`，store 只留数据 + 纯 setter。这属于更大的结构性重构，会改动 store 暴露面与 3 个 hooks 的调用方式，风险高于其收益；反向依赖（P2.3）已通过中性模块解掉，故本期未做。如需要可在后续单独评估。

> **验证局限**：本机 `better-sqlite3` ABI 不匹配（Electron 41 / Node 22），`pnpm test` 全量有既有失败（与本次无关）；上述结论以 renderer `tsc` + 3 个受影响测试文件的 vitest 结果为准，真实 Electron 行为建议在桌面应用内复测。
