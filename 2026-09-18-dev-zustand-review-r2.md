# 代码复审（第二轮）：dev-zustand 分支（keep-alive + zustand 共享数据桶）

- **复审时间**：2026-09-18
- **分支**：`dev-zustand`（HEAD = `c4c1f5b`，改动仍**未提交**）
- **复审对象**：工作区改动（8 改 + 2 新增），即上一轮报告 `2026-09-18-dev-zustand-review.md`（v2）所列问题的修复版
- **复审性质**：只读复审，未修改任何业务代码，未 commit
- **结论摘要**：上一轮 5 项必修 + 3 项清理**已全部落实且经代码核对**；全量测试从「4 failed」降到「3 failed」且 3 项均为既存 i18n 问题。**但新发现 1 条 P1 级同类回归（删除来源后共享桶不刷新）**，另有 1 条 P1 级测试缺口与 4 条 P2。
- **第三轮（2026-09-18，实施）**：按 R1–R7 完成代码修复；其中 **R3 经实测复核为误判（非死参数），已回退**——mount effect 保留 `preferredTargetId` 实参。修复后 4 个受影响测试文件 **Test Files 4 passed / Tests 95 passed / 1 skipped**（含新增 R2 用例）。详见 §7。

---

## 0. 本轮改动清单（对比上一轮）

| 文件 | 状态 | 本轮新增/变化 |
| --- | --- | --- |
| `renderer/stores/skill-data.ts` | **新增** | 中性领域模块：`Skill` / `TargetOption` / `adaptSkillRecord` / `adaptTargetOption` / `pruneSkillTargets` |
| `renderer/stores/data-store.ts` | 改 | 加 `refresh()`；`status` 增 `"error"`；`setRegisteredTargets` 内接 `pruneSkillTargets`；`catch` 补上；`loadSkillsPageData` → `loadSharedPageData` |
| `renderer/features/repositories/hooks/use-repositories-page-state.ts` | 改 | 同步成功后调 `useDataStore.getState().refresh()`（`+4` 行） |
| `renderer/features/skills/components/skills-page-data.ts` | 改 | 领域类型/适配器搬到 `@/stores/skill-data`，此处 re-export |
| `renderer/features/skills/hooks/use-skills-page-state.ts` | 改 | 3 个乐观更新与 `applySkillTargetsResult` 全部委托给 store；删除本地 `loadSkillsPageData`（净 −116 行） |
| `renderer/features/targets/hooks/use-targets-page-state.ts` | 改 | `applyTargetsResult` 改为「先写桶、再从桶读」的单一数据源；挂载 effect 注释补全初始选中规则 |
| `renderer/app/keep-alive-pages.tsx` | 改 | `KEEP_ALIVE_ENABLED = true` |
| `renderer/app/keep-alive-pages.test.tsx` | 改 | 加 `reset()`；新增「跨 tab mutation 后保活页仍反映最新数据」用例 |
| `renderer/features/skills/skills-page.test.tsx` | 改 | 加 `reset()`；修正 `v8f2c91a` 断言 |
| `renderer/features/targets/targets-page.test.tsx` | 改 | 加 `reset()` |

---

## 1. 验证证据（全部实测）

### 1.1 类型检查

```
cd apps/desktop && node ../../node_modules/typescript/bin/tsc -p tsconfig.renderer.json --noEmit
→ EXIT=0
```

### 1.2 受影响的 4 个测试文件

```
cd apps/desktop && node ../../node_modules/vitest/vitest.mjs run \
  src/renderer/features/skills/skills-page.test.tsx \
  src/renderer/features/targets/targets-page.test.tsx \
  src/renderer/app/keep-alive-pages.test.tsx \
  src/renderer/features/repositories/repositories-page.test.tsx
→ Test Files 4 passed (4) | Tests 94 passed | 1 skipped (95)
```

### 1.3 全量 renderer 对照（`git worktree` 取 HEAD 基线，复用主仓 `node_modules`）

| 指标 | HEAD 基线（`c4c1f5b`） | 工作区 | 判定 |
| --- | --- | --- | --- |
| Test Files | **2 failed** / 16 passed | **1 failed** / 17 passed | 改善 |
| Tests | **4 failed** / 156 passed / 2 skipped（162） | **3 failed** / 159 passed / 1 skipped（163） | 改善，无新增失败 |
| 失败明细 | 3× `i18n/react-i18n.test.ts` + 1× `skills-page.test.tsx`（`v8f2c91a` 断言） | 仅 3× `i18n/react-i18n.test.ts` | 上轮点出的 `v8f2c91a` 已修 |
| `act(...)` 警告 | **171** | **54** | 噪音降 68% |
| 新增用例 | — | +1（跨 tab 同步） | — |

3 个 i18n 失败与本次改动**无关**（改的 10 个文件里没有任何 i18n 资源文件）：
`react-i18n.test.ts` 期望 `skills.actions.addSkill`、`skills.filters.sortRecommended` 等键存在，而当前 locale 未定义这些键 —— 基线同样红。

**关于 `act` 警告**：基线 171 → 工作区 54，且 `repositories-page.test.tsx` 的「`An update to RepositoriesPage`」计数在两版**都是 7**，`FieldRootInner` 都是 8 → 属既有噪音（sync 进度事件/计时器在 act 窗口外触发），**不是本次引入**。工作区残余警告集中在 keep-alive 用例（`AppShell`）与 skills 用例（`SkillsPage`），源于「挂载后由模块级 store 异步回填」这一新数据流。

---

## 2. 上一轮问题的落实核对

| 编号 | 上轮问题 | 状态 | 证据 |
| --- | --- | --- | --- |
| P0-1 | Skills 数据无失效入口 | **已修** | 新增 `refresh()`（`data-store.ts:99-108`，`loadEpoch+1` + 清 `loadPromise` + `status` 回 `idle` 后强制重拉）；Repositories 同步成功后调用（`use-repositories-page-state.ts:319`） |
| P0-2 | `skills[].targets` 与 `registeredTargets` 单向失同步 | **已修** | `setRegisteredTargets` 内联 `pruneSkillTargets(state.skills, registeredTargets)`（`data-store.ts:110-116`）；裁剪实现 `skill-data.ts:67-80` |
| P1-3 | 初始选中依赖 effect 时序 | **已说明未改**（用户选择） | 注释 `use-targets-page-state.ts:443-447` 显式写明「优先 store 顺序首个；若不在可见页则由 `visibleTargets` effect 归一化为可见首个」。**该描述与代码行为一致**（已逐条核对） |
| P1-4 | `applyTargetsResult` 双数据源 | **已修** | `use-targets-page-state.ts:71-77`：先 `setRegisteredTargets(...)`，再用 `useDataStore.getState().registeredTargets` 派生 `nextTargets` 做本地校验 |
| P2.1 | 加载失败 `status` 永久 `"loading"` | **已修** | `data-store.ts:84-89` 补 `catch` → `set({ status: "error" })`；因异常被吞，调用方 `void ... .then()` 的 unhandled rejection 一并消除 |
| P2.3 | `data-store` → `features` 反向依赖 | **已修** | 新增中性 `stores/skill-data.ts`；`data-store.ts:3-8` 只依赖它与 `core` 类型；`skills-page-data.ts` 反向 re-export |
| P2.5 | `data-store.ts` 未使用的 `TargetOption` 导入 | **已修** | 该文件已无 `TargetOption` 导入 |
| P2.6 | `loadSkillsPageData` 命名误导 | **已修** | 全仓 grep 无 `loadSkillsPageData` 残留，统一为 `loadSharedPageData` |
| §4 #5 | store 只留数据 + 纯 setter | **未做**（有意取舍） | `applySkillTargetsResult` / `toggleSkillTargetPreferenceLocally` / `removeSkillTargetLocally` 仍在 store。反向依赖已解，风险可控 |
| §5-1 | HEAD 上 `v8f2c91a` 断言必然红 | **已修** | 工作区 `skills-page.test.tsx:493` 改为 `v8f2c91a`；基线对照确认该项由红转绿 |

---

## 3. 新发现的问题

### R1（P1）删除来源后共享桶不刷新 —— P0-1 的同类回归仍在另一条路径上

**证据**

- `confirmDeleteRepository`（`use-repositories-page-state.ts:645-675`）在 `await window.skillsManager.deleteRepository(...)` 之后**只调 `loadRepositories()`**，**没有** `useDataStore.getState().refresh()`（对比同步路径的 `:319`）。
- 而删除来源会**级联删除技能**：`repositoryRepository.delete`（`db/repositories/repositoryRepository.ts:175-200`）按真实执行次序删除该来源下 `install_instances`（`:188`）→ `skill_versions`（`:190`）→ `skill_target_preferences`（`:195`）→ `skill_units`（`:197`）。

> **勘误（第三轮）**：上一版本条把删除次序写成 `skill_units → skill_versions → install_instances → skill_target_preferences`，与源码实际执行次序相反；以 `:188 / :190 / :195 / :197` 为准。次序不影响「删除会清理技能」这一结论，但记录须与代码一致。

**后果链路**：在 Repositories 页删除来源 → DB 里该来源的技能已被删除，但 `store.skills` 仍是旧快照 → 切到 Skills 页（keep-alive 保活、不重挂载、`status === "ready"` 直接短路）→ **被删来源的技能仍列在表里，且仍可点「分发」**。这与 P0-1 是同一类问题，只是触发动作不同。

**同类但风险较低**：`saveRepository` 编辑分支（`:567-594`）改完 `remoteUrl` / `branch` / `patterns` 也只 `loadRepositories()`。`patterns` 变化会改变下次扫描命中的技能集合，但需再次同步才落库，所以当前不会立即产生错数据。

**修复**：在 `confirmDeleteRepository` 成功分支加一行 `useDataStore.getState().refresh();`（与 `:319` 同款）；`saveRepository` 编辑分支可按需加。

> **第三轮落实**：`confirmDeleteRepository` 与 `saveRepository` 编辑分支成功路径**均已补** `useDataStore.getState().refresh();`；R7 的「同步全部失败仍无条件 refresh」也收口为「存在成功项才 refresh」。详见 §7。

### R2（P1）P0-1 的修复本身没有测试覆盖

**证据**

- 本轮新增的唯一用例是 `keep-alive-pages.test.tsx` 的「keeps page UI state while reflecting data mutated on another tab」，它通过 **直接调 `setRegisteredTargets`** 模拟 mutation（`:120`）—— 覆盖的是 P0-2 的裁剪/派生路径。
- `repositories-page.test.tsx` **未被修改**（`git diff --stat` 无此文件），而 `refresh()` 正是在这个文件对应的 hook 里被调用的。同时该测试文件也**没有 mock `listSkills` / `listTargets`**（全仓 grep 确认），因此 `refresh()` 在其中只会拉到 `undefined` → 空数组，**既不报错也断言不到任何东西**。

**结论**：`同步成功 → refresh() → Skills 页拿到新数据` 这条链路当前**零断言**。一旦有人把 `:319` 那行删掉或改错，测试不会红。

**建议**：在 `repositories-page.test.tsx` 加一条——mock `listSkills` 首次返回 `[A]`、同步后返回 `[A, B]`，断言同步完成后 `useDataStore.getState().skills` 含 `B`。

### R3（P2）挂载点的 `preferredTargetId` —— ~~死参数~~ **误判（第三轮实测推翻）**

> **第三轮结论：本条为误判，原建议（删除实参）不可采纳，已回退。** `preferredTargetId` 在挂载点**不是**死参数，删除它会导致初始选中回归。

**原（错误）推断**

- `use-targets-page-state.ts:449` 传 `registeredTargets[0]?.id` 作为 `preferredTargetId`。
- `applyTargetsResult` 先写桶再从桶读，`nextTargets` 与传入 `registeredTargets` 同一份；`adaptTargets` 保序。
- 据此推断 `preferredTargetId` 分支（`:91-93`）返回值 = 兜底分支 `nextTargets[0]?.id`（`:99`），**并假设挂载时 `currentTargetId` 必为 `null`**，从而「传与不传等价」。

**为何推断不成立（实测发现的真实时序）**

1. `loadSharedPageData`（`data-store.ts:79-83`）内部 `set({ registeredTargets, status: "ready" })` 是 **zustand store 写入**，会**先触发一次组件重渲染**，而此刻 `.then` 回调里的 `applyTargetsResult` **尚未执行**，`selectedTargetId` 仍是 `null`。
2. 该次重渲染中 `visibleTargets` 已就绪（按当前 `sort` 默认 `"name"` 排序 → `[Design scratch, Local project]`）；下方「可见性归一化」effect（`:529-542`）看到 `currentTargetId === null` → 选中 `visibleTargets[0]` = **Design scratch**，写入 `selectedTargetId`。
3. 之后 `applyTargetsResult` 执行，其选中逻辑：
   ```ts
   setSelectedTargetId((currentTargetId) => {
     if (preferredTargetId && nextTargets.some(t => t.id === preferredTargetId)) return preferredTargetId; // 分支①
     if (currentTargetId && nextTargets.some(t => t.id === currentTargetId)) return currentTargetId;        // 分支②
     return nextTargets[0]?.id;                                                                              // 分支③（兜底）
   });
   ```
   - **保留 `preferredTargetId` 时**：分支①命中 → 强制返回 `registeredTargets[0]`（Local project），覆盖第 2 步的 Design scratch → 初始选中正确。
   - **删除 `preferredTargetId` 后**（第三轮初版实测）：`currentTargetId` 已是 Design scratch 且合法 → 分支②命中 → **保留 Design scratch**，初始选中错误。Targets 页 4 条用例（`renders database targets…`、`opens the delete confirmation dialog…`、`edits a custom target name…`、`confirms a custom agent folder…`）全部回归。

**根因**：原推断错在「挂载时 `currentTargetId` 必为 `null`」。由于 zustand store 写入先于 `applyTargetsResult` 触发一次重渲染，归一化 effect 已把 `selectedTargetId` 置为排序首个，等到 `applyTargetsResult` 运行时走的是分支②而非兜底分支③，故 `preferredTargetId` 与兜底**并不等价**——它真正的作用是**强制锚定初始选中**，抵消归一化 effect 的副作用。

**处置**：保留挂载点的 `preferredTargetId` 实参（即 `applyTargetsResult({ registeredTargets }, registeredTargets[0]?.id)`），并将注释改写为陈述真实时序（store.set → 归一化 effect 先改选中 → applyTargetsResult 用 preferredTargetId 强制锚定）。原 R3「删实参 + 精简注释」的建议**作废**。

### R4（P2）`pruneSkillTargets` 的裁剪口径与 DB 口径不一致（当前不可达，属埋雷）

**证据**

- DB 侧 `skill.targets` 的语义是**仅 enabled 的 target**：`skillRepository.list()` 用 `getEnabledTargetsBySkillId(db)`（`db/repositories/skillRepository.ts:60`）填充 `targets`（`:76`）。
- 而 `pruneSkillTargets`（`skill-data.ts:67-80`）用**全量** `registeredTargets`（含 `enabled: false`）作为保留集合。
- 于是「某个 target 被置为 disabled」的场景下，prune **不会**把它从 `skill.targets` 里剔掉，而 DB / 一次 `listSkills` 会。届时 P0-2 的症状会在禁用场景复现：`目标数` 列偏大、`selectedSkill.targets.length === 0` 门禁误判（`use-skills-page-state.ts:272` 附近）、分发按钮假就绪。

**可达性判断**：当前 renderer **没有任何禁用 target 的入口**（全仓 grep 无 `setTargetEnabled` / `toggleTargetEnabled` 类 API，targets 页只有 增 / 删 / 转全局），所以这条**不是当前活跃 bug**，属潜在不一致。若将来加「禁用 target」，prune 需改为按 `enabled` 过滤，或直接改为走 `refresh()`。

### R5（P2）`setRegisteredTargets` 变成了「有破坏性的 setter」

**证据**：`setRegisteredTargets` 现在带裁剪副作用（`data-store.ts:110-116`），而它的入参是**全量替换语义**。`applyTargetsResult` 在 `result` 缺失时会走 `result?.registeredTargets ?? []`（`use-targets-page-state.ts:73`）→ 传 `[]` → **把所有 `skill.targets` 清空**。

**可达性判断**：`rescanTargets` / `listTargets` 在生产 preload 中均存在，`TargetsRescanResult` 也始终带 `registeredTargets`（`main/ipc/targets.ts:32-34`），所以现实路径不可达。但这是一个容易踩的隐式契约：任何未来调用方为「清空目标」而传 `[]`，都会连带抹掉技能的目标关联。

**建议**：要么在 store 层区分「整体替换」与「裁剪同步」两个动作，要么在空数组时跳过裁剪并加注释说明。

### R6（P2）注释失实与遗留死代码

- `data-store.ts:85` 注释写「回退到 **idle**」，代码实际 `set({ status: "error" })`（`:88`）—— 注释与实现不一致。
- `use-skills-page-state.ts:23` 导入的 `type Skill` 已无任何引用（原先服务于已删除的 `useState<Skill[]>`）。`tsconfig.renderer.json` 未开 `noUnusedLocals`，`tsc` 不报错。
- `skills-page-data.ts:6` re-export 的 `adaptSkillRecord` 已无外部消费者（只有 `adaptTargetOption` 仍被 `use-skills-page-state.ts` 使用）。
- 上一轮报告 `2026-09-18-dev-zustand-review.md` 的头部信息已过期：`:5` 仍写「审查范围：工作区未提交改动（**6 改 + 1 新增**）」，本轮实际是 **8 改 + 2 新增**。

> **已核实为「不算问题」的一条**：`stores/skill-data.ts:1-2` 用相对路径 `../../core/...` 而 `data-store.ts` 混用 `@/` 与相对路径 —— 这**不是**风格不统一：`tsconfig.renderer.json` 的 `paths` 只把 `@/*` 映射到 `./src/renderer/*`，`@/core/...` 会解析到不存在的 `src/renderer/core/...`，所以 `core` 必须走相对路径。上一轮报告 §7 的 P2.4 说明正确，此处不列为问题。

### R7（P3）同步全部失败时也无条件 `refresh()`

`runSyncRepositories`（`use-repositories-page-state.ts:309-319`）在 `syncRepositories` resolve 后**无条件**刷新，即使每个 `result` 都带 `error`（`:343-347` 才判断失败）或 `status === "skipped"`。此时数据并未变化，却多付一次 `listSkills` + `listTargets` 的全量 IPC。可用 `results.some(r => !r.error && r.status !== "skipped")` 收口。

---

## 4. 建议优先级与第三轮落实状态

| 编号 | 原建议 | 第三轮状态 |
| --- | --- | --- |
| R1 | `confirmDeleteRepository` 成功分支补 `refresh()` | **已落实**：`confirmDeleteRepository` + `saveRepository` 编辑分支均补 `refresh()` |
| R2 | 为「同步 → refresh → Skills 页更新」补断言 | **已落实**：`repositories-page.test.tsx` 新增断言用例 |
| R3 | 删挂载点 `preferredTargetId` 实参 | **误判，已回退**：该实参非死参数，删除导致初始选中回归；保留之（见 §3 R3 修订） |
| R4 | prune 口径对齐 `enabled` | **已落实**：`pruneSkillTargets` 保留集按 `enabled` 过滤（`skill-data.ts:73-75`） |
| R5 | 拆分「替换」与「裁剪」动作 | **部分**：未拆动作，但在 `setRegisteredTargets` 注释写明隐式契约（传 `[]` 会清空 `skill.targets`）；现实不可达，留作后续 |
| R6 | 注释纠偏、清死代码 | **已落实**：`data-store.ts` catch 注释、`use-skills-page-state.ts` 死导入、`skills-page-data.ts` 死 re-export 均清理 |
| R7 | 给 `refresh()` 加条件 | **已落实**：仅当存在「成功且非 skipped」的同步结果才 `refresh()` |

---

## 5. 复审遗留物（需用户清理，沙箱内无法删除）

1. **基线 worktree**：为做对照创建了 `D:\code\skills-manager-base`（detached at `c4c1f5b`），并在其中建了两个 junction：`node_modules`、`apps/desktop/node_modules` → 指向主仓同名目录。
   - 清理方式（在真实环境执行）：先删两个 junction（**不要**用 `Remove-Item -Force`，会递归删到主仓的 `node_modules` 内容），再 `git worktree remove --force D:/code/skills-manager-base`。
2. **临时日志**（仓库根目录，本次新增 5 个）：`tmp-r2-four.log`、`tmp-r2-seq.log`、`tmp-r2-full.log`、`tmp-base-seq.log`、`tmp-base-full.log`。
3. 上一轮遗留的 `tmp-review-test.log`、`tmp-repo-test.log` 仍在。

---

## 6. 明确未做的验证

- **未**在真实 Electron 中手工验证（`pnpm run dev`）—— 上述结论均来自代码路径核对 + vitest。R1 的表现（删除来源后 Skills 页仍显示旧技能）是**代码路径推断**，建议真机走一遍确认。
- **未**运行 `main` / `db` 层测试与 `pnpm run build`（沙箱内 `pnpm` shim 不可用）。本轮改动全部落在 renderer，影响面收敛。

---

## 7. 修复落实（第三轮：R1–R7 代码改动 + 验证）

> 实施时间：2026-09-18。改动全部落在 renderer，**未 commit**（遵循「显式请求才提交」约定）。

### 7.1 代码改动映射

| 编号 | 文件 | 改动 |
| --- | --- | --- |
| R1 | `renderer/features/repositories/hooks/use-repositories-page-state.ts` | `confirmDeleteRepository` 成功分支 `loadRepositories()` 之后补 `useDataStore.getState().refresh();`；`saveRepository` 编辑分支成功路径同样补 `refresh()` |
| R1 / R7 | 同上（`runSyncRepositories`） | 原无条件 `refresh()` 收口为：仅当 `syncResult.results.some(r => !r.error && r.status !== "skipped")` 为真时才 `refresh()` |
| R2 | `renderer/features/repositories/repositories-page.test.tsx` | 新增用例：mock `listSkills` 首次返回 `[A]`、同步后返回 `[A, B]`，断言同步完成后 `useDataStore.getState().skills` 含 `B`（覆盖「同步 → refresh → Skills 页更新」链路） |
| R3 | `renderer/features/targets/hooks/use-targets-page-state.ts` | **回退**：保留挂载点 `applyTargetsResult({ registeredTargets }, registeredTargets[0]?.id)`；注释改为陈述真实时序（store.set → 归一化 effect 先改选中 → `preferredTargetId` 强制锚定）。**未删除实参** |
| R4 | `renderer/stores/skill-data.ts` | `pruneSkillTargets` 保留集由「全量 `registeredTargets`」改为「`registeredTargets.filter(t => t.enabled)`」，与 DB `getEnabledTargetsBySkillId` 口径一致 |
| R5 | `renderer/stores/data-store.ts` | `setRegisteredTargets` 注释写明隐式契约：入参为全量替换语义，传 `[]` 会连带清空 `skill.targets`；现实不可达，留作后续拆分 |
| R6 | `renderer/stores/data-store.ts` | `catch` 注释由「回退到 idle」修正为「置为 `"error"`（注意：此处不是 idle）」 |
| R6 | `renderer/features/skills/hooks/use-skills-page-state.ts` | 删除已无引用的 `type Skill` 导入 |
| R6 | `renderer/features/skills/components/skills-page-data.ts` | 删除无消费者的 `adaptSkillRecord` re-export（仅保留 `adaptTargetOption`） |

### 7.2 验证结果

类型检查（renderer）：

```
cd apps/desktop && node ../../node_modules/typescript/bin/tsc -p tsconfig.renderer.json --noEmit
→ EXIT=0
```

受影响的 4 个测试文件（修复 R3 回归后重跑）：

```
cd apps/desktop && node ../../node_modules/vitest/vitest.mjs run \
  src/renderer/features/skills/skills-page.test.tsx \
  src/renderer/features/targets/targets-page.test.tsx \
  src/renderer/app/keep-alive-pages.test.tsx \
  src/renderer/features/repositories/repositories-page.test.tsx
→ Test Files 4 passed (4) | Tests 95 passed | 1 skipped (96)
```

对照第二轮基线（`94 passed / 1 skipped`）：新增的 1 个 passing 即 R2 用例；Targets 页原 4 条因 R3 误删实参而回归的用例已全部转绿。**无新增失败。**

### 7.3 过程记录（重要）

- **R3 初版修复曾引入回归**：第三轮最初按 R3 原建议删除了挂载点 `preferredTargetId` 实参，重跑后 Targets 页 4 条用例由绿转红（初始选中变为排序首个 Design scratch 而非 registeredTargets[0] 的 Local project）。经加调试日志核对时序，确认 `loadSharedPageData` 的 zustand store.set 会先触发一次重渲染、归一化 effect 先把 `selectedTargetId` 置为 `visibleTargets[0]`，待 `applyTargetsResult` 运行时 `currentTargetId` 已非 `null`，故走「保留旧选中」分支而非兜底——`preferredTargetId` 与兜底**不等价**。据此判定 R3 为误判并**回退**。
- 该结论已回填 §3 R3 与 §4，原「删实参」建议作废；本文件 §0–§6 其余内容（含 R1 级联删除次序，已于 R1 处勘误）均经实测核对无误。
- 临时日志 `tmp-r3-debug.log` / `tmp-r3-final.log` 为本次验证产物，沙箱内无法删除，需用户在真实环境清理。
