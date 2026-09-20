# dev-zustand 第八轮审核（R8）：当前改动全景 + 问题收敛

- **日期**：2026-09-19
- **分支**：`dev-zustand`（HEAD `c4c1f5b`，全部改动仍未提交）
- **审查对象**：**整个未提交工作区**（15 个已跟踪改动 + 3 个新文件），不再只看某一批
- **审查性质**：只读审查 + 探针实测；**未改动任何业务代码，未 commit / 未 push**
- **本轮新增问题编号**：R33 – R41（延续 R1–R32 的编号序列）
- **一句话结论**：这批改动把「跨 tab 共享数据桶 + keep-alive」这条主线**功能上打通了**（技能/目标/徽标三处口径归一，同步/删除/编辑/启停四条来源路径都补了刷新），但**「谁负责在 enabled 翻转后重拉 listSkills」仍然靠调用方手写**，于是同类漏网从来源侧（r2/r3）转移到了目标侧（本轮 **R33**，P1）；同时 **R34/R35 是这批改动自身引入/激活的新缺陷**。

---

## 0. 本轮定位：与 r5/r6/r7 的关系

| 轮次 | 审查对象 | 状态 |
| --- | --- | --- |
| r1–r2 | 首次改造（共享桶 + 4 处来源刷新 + 单测） | 已核 |
| r3–r4 | R8/R10/R11/R13 修复批次 | 已核 |
| r5–r6 | 目标数口径（R12/R16…R21） | 已核 |
| r7 | r6 §8 的 11 条修复（R29–R32） | 已核，代码层面全落地 |
| **r8（本轮）** | **工作区全量**，重点回答「这批改动到底加了什么、还差什么」 | 新增 9 条（R33–R41） |

r7 §8 记录的那 4 条（R29 i18n / R30 逐项判定 / R31 删死字段 / R32 补 store 单测）**本轮逐条复核仍在位、且有效**，不重复计问题。

---

## 1. 这批改动做了什么

### 1.1 总览（18 个文件）

| 文件 | 改了什么 | 解决什么 |
| --- | --- | --- |
| `stores/data-store.ts`（**新**） | 跨 tab 共享数据桶：`skills`/`registeredTargets`/`status`/`badgeCounts` + 全部写动作 | 保活页不再各持一份快照 |
| `stores/skill-data.ts`（**新**） | 中性领域模块（`Skill`/`TargetOption`/`adapt*`/`pruneSkillTargets`） | 切断 store → features 反向依赖（R21） |
| `stores/data-store.test.ts`（**新**） | store 专属单测 9 例 | R32 |
| `db/repositories/skillRepository.ts` | `getEnabledTargetsBySkillId` 加 `innerJoin(agentTargets)` + 双 `enabled` 条件 | **R12 治本**：启动路径 `listSkills` 与分发口径 `countEnabledTargetPreferences` 归一 |
| `app/keep-alive-pages.tsx` | `KEEP_ALIVE_ENABLED: false → true` | 打开 keep-alive（保留筛选/分页/选中），是整批改动的**前提** |
| `features/skills/hooks/use-skills-page-state.ts` | 本地 `skills`/`targetOptions` → 从桶读；4 个写动作全部委托 store；`toggleSkillTargetPreference` 改 async + 回滚 | 技能页成为桶的消费者（R27） |
| `features/targets/hooks/use-targets-page-state.ts` | `targets` 改由桶派生；`applyTargetsResult` 先写桶再读桶；`hasLoadedTargets` 移出早退；`refreshTargets` 补 `refreshSkills()` | 单一数据源（P1-4 / R16 / R10②） |
| `features/repositories/hooks/use-repositories-page-state.ts` | 同步 / 启停 / 编辑 / 删除来源四条路径补 `refresh()`，新建补 `refreshBadgeCounts()` | 「来源侧变更 → 保活页仍显示旧技能」（R1/R7/R8/R13 主线收口） |
| `features/shell/app-shell.tsx` | 徽标改读桶；新增 `status === "error"` 错误条 + 重试；文案走 i18n | R28 消费者 + R29 闭环 |
| `features/shell/shell-navigation.ts` | `ShellNavigationBadgeCounts` 改为 re-export | R21 依赖切断 |
| `features/skills/components/skills-page-data.ts` | 领域类型/适配器改 re-export，删本地重复定义 | R6 死代码清理 |
| `i18n/resources.ts` | zh/en 各 +3 key（`dataLoadFailed`/`retry`/`targetPreferenceSyncFailedStatus`） | R29 / R27 |
| 5 个测试文件 | 补 `reset()`（3 处）+ keep-alive 跨 tab 用例 +1 + `v8f2c91a` 断言修正 | 用例隔离与既有红断言修复 |

### 1.2 归纳成三件事

1. **数据源归一**：Skills / Targets 两个页面不再各自 `useState` 快照，统一读 `stores/data-store.ts`；侧边栏徽标也收进同一个桶。→ 保活页在别处增删改后能渲染出最新数据（`keep-alive-pages.test.tsx` 新增用例即验证此点）。
2. **口径归一**：`skills[].targets` 的 4 个写入点统一为「偏好启用 **且** 目标自身启用」，DB 侧用 join 落实（`skillRepository.ts:106-118`），渲染侧用 `pruneSkillTargets` 兜底（`skill-data.ts:71-97`）。→ 「UI 显示 2 个目标、分发时只分发 1 个」这类分裂消失。
3. **失败可见**：加载失败不再静默 `ready`，`status` 有 UI 消费者（错误条 + 重试），i18n 双份。

---

## 2. 核验结果：声称 vs 代码事实

| 项 | 结论 | 证据 |
| --- | --- | --- |
| R12（DB 口径） | ✅ | `skillRepository.ts:106-118`；与 `repositoryRepository.ts` 的 `countEnabledTargetPreferences` 同构 |
| R16 | ✅ | `use-targets-page-state.ts:72` 在早退（`:76`）之前 |
| R17 | ✅ | `data-store.ts:206`；单测断言 1 次 |
| R18 / R30 | ✅（但被 R34 抵消，见 §3） | `data-store.ts:102-113` 逐项判定 |
| R20 | ✅ | `data-store.ts:323` `.catch(() => {})` |
| R21 | ✅ 且**等价** | `shell-navigation.ts:14` re-export；与旧定义 `Partial<Record<AppItem["routeId"], number>>` 完全同构（`routeId` 本就是 `AppRouteId \| "diagnostics"`） |
| R23 / R31 | ✅ | `skill-data.ts:26-33` 已无 `skillPreferences`；`skillPreferenceIds` 的唯一消费者仍是 `getTargetOptionsForSkill`（independent 才用） |
| R24 | ✅ | `data-store.ts:223-241` / `:277-295`；与 `main/ipc/skills.ts` 落库语义一致（r7 已跨层核过） |
| R25 | ✅ | `data-store.ts:56-66,176-178`；徽标三段都是 `count(*)` 行数（`navigation-badges.ts:24-28`），与 target 内容无关，门禁安全 |
| R26 | ✅ | `skill-data.ts:86-88` |
| R27 | ✅ 且**UI 可观测** | 见下方勘误 |
| R28 / R29 | ✅ | `app-shell.tsx:95-109` + `resources.ts` zh/en |
| R32 | ⚠️ **部分** | 9 例单测存在，但断言强度不足，见 **R39** |

**一处勘误（r7 遗留的推理需要修正）**：r7 认为 `TargetOption.skillPreferences` 是「只写不读的死字段」，隐含前提是「sider 的勾选态由偏好决定」。实际 `skills-page-sider.tsx:72` 是：

```tsx
const checked = selectedSkill.targets.includes(target.id);
```

即**勾选态由 `skill.targets`（分发资格）决定**，`skillPreferenceIds` 只决定 independent 目标**是否列出**。因此 §8 删字段是对的，但 R27 的乐观回滚（`data-store.ts` + `use-skills-page-state.ts:427-440`）**在 UI 上真的可见**（回滚后 `skill.targets` 去掉该 id → 勾选框弹回未选中），这条修复有效，不必担心。

---

## 3. 问题清单（一次性收敛：R33–R41）

### R33（P1）— 目标 `enabled` 被置回 true 后不重拉 `listSkills`，技能的目标永久丢失

**这是本轮最重要的一条：r2/r3 修好的「来源侧刷新漏网」，在同一机制的**目标侧**又出现一次。**

链路（全部已核行号）：

1. 自定义目标因路径失效被扫描为 `path-missing` → `saveScannedTargets` 写 `enabled: status === "detected"`（`targetRepository.ts:329,343`）→ `enabled = false`。
2. 用户点「重新扫描」→ `refreshTargets` → `setRegisteredTargets` → `pruneSkillTargets` 把该 id 从 `skills[].targets` 剪掉（`skill-data.ts:80-95`），随后 `refreshSkills()` 重拉，DB join 也只返回 enabled 目标 → 一致。
3. 用户「编辑」该目标、把路径改回正确值 → **主进程无条件 `enabled: true`**：

```ts
// db/repositories/targetRepository.ts:228-240
.set({ detectionStatus: null, enabled: true, name, normalizedPath, path, scanMessage: null, ... })
```

   而 `skill_target_preferences` 未被触碰（偏好仍 `enabled = true`）→ `listSkills` 的 join 现在**会**返回该目标。
4. 但渲染侧 `saveEditTarget`（`use-targets-page-state.ts:400`）只调 `applyTargetsResult`，**没有 `refreshSkills()`**——全仓只有 `refreshTargets`（`:155`）有这一句。
5. `pruneSkillTargets` 是**写时裁剪、只删不补**。探针实测（PROBE-2）：

```
[PROBE-2] 正常：targets = ["t1"]
[PROBE-2] disabled 后：targets = []
[PROBE-2] 重新 enabled 后：targets = []     ← 只删不补，确认
```

**后果（UI 自相矛盾）**：DB 认为「偏好启用 + 目标启用」，渲染侧 `skill.targets.length === 0` →

- 技能表格「目标数」列显示 `0`（`skills-page-main.tsx:256`）；
- sider 里目标**列出来了却未勾选**（列出来因为 pref 还在，未勾选因为 checked 读 `skill.targets`）；
- 行内/批量/单技能「分发」按钮全部 disabled，tooltip 显示**「请先添加分发目标」**——而目标明明就在下面列着。

**同源第二条入口**：`addCustomDirectoryTarget` 的 upsert 冲突分支同样硬置 `enabled: true`（`targetRepository.ts:415`），且该路径也没有 `refreshSkills()`。即「重新添加一个此前失效的目标」会踩同一个坑。

**修法（两条都要，缺一不可）**：

- 渲染侧：`saveEditTarget` / `addTargetDialog.onSaved` 成功分支补 `void useDataStore.getState().refreshSkills()`（与 `refreshTargets` 对齐）；
- 更稳的做法：把「`enabled` 集合发生变化 ⇒ 必须重拉 `listSkills`」收口进 store 自身（例如 `setRegisteredTargets` 内比较 enabled 集合，变了就自动 `refreshSkills()`），而不是继续要求每个调用点手写——r2/r3 的教训已经证明手写必漏；
- 主进程侧另议：编辑后硬置 `enabled: true` 且清空 `detectionStatus/scanMessage`，意味着「路径仍然不存在时 UI 也会显示为正常目标」。是否应该在编辑后走一次真实扫描，属设计取舍，建议单独决策。

### R34（P2）— Targets 页挂载路径用空目标集写桶，把 `skills[].targets` 剪空，**抵消 R30 的保护**

`use-targets-page-state.ts:82`：

```ts
useDataStore.getState().setRegisteredTargets(result?.registeredTargets ?? []);
```

早退守卫只挡 `!result`（`:76`），但挂载 effect（`:469`）传的是 `{ registeredTargets: <桶里的值> }`——**永远 truthy**。当桶里的 `registeredTargets` 为 `[]` 时，`setRegisteredTargets([])` 会让 `pruneSkillTargets` 以空集过滤，把**每一个** skill 的 targets 清空。

探针实测（PROBE-1，真实渲染 `TargetsPage`，`listSkills` 正常、`listTargets` 缺失 = 正是 R30 要防的「单侧接口不可用」）：

```
[PROBE-1] status = error
[PROBE-1] skills[0].targets = []          ← listSkills 明明返回了 ["codex"]
[PROBE-1] registeredTargets.length = 0
```

即：`loadSharedPageData` 里 R30 那句「保留该项已有数据」刚写完，**下一个 tick 就被 Targets 页的挂载路径撤销**。同一不变式还反过来可被 `refreshSkills()` 打破（它只写 `skills`、不碰 `registeredTargets`，于是可能出现「`skills[].targets` 有值、桶里目标为空」→ 技能页显示目标数 2 却一个勾选框都没有）。

**可达性说明（把严重度说清楚）**：DB 侧的 `listSkills` join 保证「正常完整加载」时 `skills[].targets ⊆ enabled registeredTargets`，所以这条**不是正常流程必经**，而是「接口部分可用 / 首屏空目标 / mock 不全」时的防线失效。它的价值在于：**R30 声称的保证其实并不成立**。

**修法**：挂载 effect 不应该再写一次桶（它本来就读桶）。要么改成只在 `registeredTargets.length > 0` 时才写，要么把「挂载时只做本地态初始化（`hasLoadedTargets` / 选中锚定）」与「写桶」拆开；`setRegisteredTargets` 也可加一条「传入空数组且当前非空 → 拒绝」的保护。

### R35（P2）— keep-alive 翻 `true`，把「切未访问 Tab 首帧空白」从死分支变成**线上行为**

`keep-alive-pages.tsx:33` 把 `KEEP_ALIVE_ENABLED` 翻成 `true`，同一文件 `:64-66`：

```ts
const isRendered = KEEP_ALIVE_ENABLED
  ? mountedRouteIds.has(routeId)      // ← 新路由首帧不在集合里
  : routeId === activeRouteId;        // ← 旧行为：立即渲染，无缺口
```

而 `mountedRouteIds` 只在 `useEffect`（`:47-59`）里追加。所以：

- 旧配置（`false`）：`isRendered = routeId === activeRouteId`，新路由**当场渲染**，不存在空白帧；
- 新配置（`true`）：路由切换后第一次渲染时集合还没有该 id → 该路由整块渲染 `null` → 等 passive effect 跑完再补一帧。

**这条正是 r5/r6 记录的 R22，当时以「需真机、非阻断」搁置；但翻 flag 的动作把它从「不可能发生的分支」变成了「每次首次访问某 Tab 都会发生」。** 修法一行：`mountedRouteIds.has(routeId) || routeId === activeRouteId`。

> 诚实标注：jsdom 下 `act()` 会 flush effect，**观测不到这一帧**；本条为代码推理（与 r6/r7 对 R22 的判定方式一致），建议真机确认。

### R36（P3）— `refreshBadgeCounts` 是全仓唯一没有 epoch 守卫的异步写桶路径

`data-store.ts:309-324` 没有 `loadEpoch` 比较，而 `loadSharedPageData`（`:93`）、`refreshSkills`（`:148-155`）都有。探针实测（PROBE-3）：

```
[PROBE-3] badgeCounts after stale resolve = {"skills":99}
```

即：`reset()`（`:300-306`，先清空 `badgeCounts` 再重拉）之后，**上一个 epoch 的在途响应仍会写回**。`:303` 的注释写明「避免测试隔离不足时读到上一用例残留的徽标（R15）」——但这道防线只挡了「不重拉」，没挡「过期响应落地」。真实场景：同步完成后连点刷新 / 快速切库。

**修法**：照 `refreshSkills` 抄一次 `const epoch = loadEpoch; ... if (epoch !== loadEpoch) return;`。

### R37（P3）— `applySkillTargetsResult` 缺早退守卫，与 `applyTargetsResult` 不对称

`use-targets-page-state.ts:76` 有 `if (!result) return;`（R11-3），而 store 的对应动作没有。探针实测（PROBE-4）：

```
[PROBE-4] thrown = Cannot read properties of undefined (reading 'registeredTargets')
```

可达路径：`useTargetAddDialogState.saveAddTarget`（`use-target-add-dialog-state.ts:214-216`）在 `saveTarget` resolve `undefined` 时会照样 `onSaved(undefined, ...)`；Skills 页的 `onSaved`（`use-skills-page-state.ts:142-151`）只判了 `selectedSkill`，未判 `result` → 直接进 store 抛错，且发生在事件处理器里。

**修法**：给 `applySkillTargetsResult` 补同样的 `if (!result) return;`，或让 Skills 页的 `onSaved` 与 Targets 页保持同一防御姿势。

### R38（P3）— 全局错误条的作用域越界 + 不可关闭 + 零测试

`app-shell.tsx:95-109` 在**所有路由**的顶部渲染错误条，但 `status` 只描述 Skills/Targets 的数据：

- 用户在 Sources / Repositories / Settings 时也会看到「数据加载失败，技能与目标可能为空。请重试。」——与该页内容无关；
- 它插在共享滚动容器的 `{children}` 之前（`:91-94`），随内容滚动（非 sticky），出错时把页面整体下推约一行；
- 无关闭按钮，只能靠重试成功或切页面触发重载来消除；
- **`app-shell.test.tsx`（现 9 例）无一条命中 `dataLoadFailed` / `retry`**——R32 只补了 store 单测，这条新 UI 仍然没有契约。

**修法**：把错误条收敛到真正消费该数据的页面（或加路由白名单）；补一条 app-shell 断言（mock 成 error → 出现 `role="alert"` → 点重试 → 调 `listSkills` 第二次）。

### R39（P3）— 本轮新增的单测**断言强度不足**，恰好漏掉 R34

- `data-store.test.ts:71-87`（单侧缺失用例）只断言 `status` 与 `skills.length`；fixture `makeSkill` 默认 `targets: []`（`:17`），**没有任何断言覆盖 `skills[].targets` 是否被保住** → R34 那类「剪空」在测试里完全不可见；
- `keep-alive-pages.test.tsx:114-152`（跨 tab mutation 用例）只断言「`选择 Codex` 存在」；Codex 是 `scope: "global"` 的目标，**恒定列出**，所以即便 `skill.targets` 被剪空该断言照样通过——它锁的是「跨 tab 可见性」，不是「目标归属没被破坏」；
- R34 的破坏点还在 Targets 页（跨文件），store 单测从结构上也够不到。

**修法**：给上面的用例补 `expect(state.skills[0].targets).toEqual(["codex"])` 之类的断言；R34 的修复需要一个「挂载 Targets 页不得清空既有 skills[].targets」的用例。

### R40（P3）— `react-i18n.test.ts` 3 条长期红，本轮动了 `resources.ts` 却没一并收口

实测（本轮）：

```
❯ src/renderer/i18n/react-i18n.test.ts (3 tests | 3 failed)
  × uses Chinese UI copy by default            → 'skills.actions.addSkill' 未翻译
  × keeps Chinese sort option labels to two characters → 'skills.filters.sortRecommended' 未翻译 + repositories 排序标签与期望不符
  × can initialize English UI copy             → 'skills.actions.addSkill' 未翻译
```

这批改动**新增了 3 个 i18n key**（说明开发者确实在维护 `resources.ts`），却让这 3 条红继续挂着。仓库只有 `build-desktop-installers.yml` 一个 workflow（**不跑测试**），所以「测试有没有红」没有任何机制会告诉你——**任何「测试全过」的结论在当下都不可信**。

**修法**：补 `skills.actions.addSkill` / `skills.filters.sortRecommended` 两个 key 并对齐 repositories 排序标签；或明确把这些断言改成「key 存在性」检查。

### R41（P3）— 两处注释与真实行为不符

1. `keep-alive-pages.tsx:36-38` 写「保留页面内的筛选、分页、选中项**和滚动位置**」（R19）。滚动容器是 **共享的** `<main className="... overflow-y-auto">`（`app-shell.tsx:91-94`），keep-alive 只切子节点 `hidden`，`<main>` 的 `scrollTop` 跨页共享 —— 从长列表滚到中部的 Skills 切到 Targets，Targets 会接着同一个偏移量显示。该注释不成立。
2. `data-store.ts:115-117` 写「keep-alive 下『切 Tab 重挂载 = 隐式重试』已不存在，重试只能靠显式 refresh」。实际上**尚未挂载过**的页面首次挂载时仍会调 `loadSharedPageData()`，而 `status === "error"` ≠ `"ready"`，会绕过去重守卫重新拉取 —— 隐式重试仍然存在，只是变成「每个页面一次」。

---

## 4. 验证记录（可复现）

### 4.1 类型与测试

| 检查 | 结果 |
| --- | --- |
| `tsc -p tsconfig.renderer.json --noEmit` | **EXIT=0** |
| `tsc -p tsconfig.main.json --noEmit` | **EXIT=0** |
| 8 个测试文件（`--fileParallelism=false`） | **Test Files 1 failed / 7 passed；Tests 3 failed / 126 passed / 1 skipped**。失败全部来自 `react-i18n.test.ts`（见 R40，既有红）；其余 7 个文件 126 例全绿（`data-store` 9、`app-shell` 9、`app-sidebar` 12、`keep-alive` 4（1 skip）、`skills-page` 28、`targets-page` 25、`repositories-page` 40） |
| `act(...)` 警告 | 既有 worker 噪音，非失败 |

### 4.2 探针实测（脚本已删）

`apps/desktop/src/renderer/features/targets/r8-probe.test.tsx`（4 例全过，跑完即删）：

```
[PROBE-1] status = error                       ├ R34：Targets 挂载把 skills[].targets 剪空
[PROBE-1] skills[0].targets = []               │
[PROBE-1] registeredTargets.length = 0         ┘
[PROBE-2] 正常：targets = ["t1"]               ├ R33：pruneSkillTargets 只删不补
[PROBE-2] disabled 后：targets = []            │
[PROBE-2] 重新 enabled 后：targets = []        ┘
[PROBE-3] badgeCounts after stale resolve = {"skills":99}   ← R36
[PROBE-4] thrown = Cannot read properties of undefined (reading 'registeredTargets')  ← R37
```

### 4.3 未做

- **未跑真实 Electron**：R35（首帧空白）、R41-1（跨页共享滚动偏移）都属真机观感，jsdom 观测不到。AGENTS.md 要求 UI 行为用 `pnpm run dev` 验证，本轮未执行。
- **未跑 DB 用例**：`better-sqlite3` ABI 145(Electron) vs 137(Node)，既有技术债。R33 的 DB 侧结论（`updateCustomDirectoryTarget` 硬置 `enabled: true`、`addCustomDirectoryTarget` 冲突分支同样硬置）通过**直读 `targetRepository.ts:228-240 / :415`** 得到，未执行。
- **未做变异测试**：R34–R37 的问题均已被探针直接证伪（而非「测试没红」推断），无需再补变异。

---

## 5. 遗留（此前已明确跳过，状态未变）

| 项 | 现状 |
| --- | --- |
| **R19** 注释不成立 | 已归入本轮 **R41-1**（顺带勘误，未修） |
| **R22** 切未访问 Tab 首帧空白 | 已归入本轮 **R35**，且**因 flag 翻转而升级** |
| **R9** Settings 重建库后桶不重置 | 仍未修（`resetDatabase` 只删库重建，无 `refresh()`） |

---

## 6. 本轮文件与清理

- 报告：`2026-09-19-dev-zustand-review-r8.md`（本文件）
- 探针 `apps/desktop/src/renderer/features/targets/r8-probe.test.tsx`：**已删除**（`node -e fs.unlinkSync`）
- **业务代码一行未动，未 commit / 未 push。** 工作区仍是 `dev-zustand` 未提交状态。

---

## 7. 建议的处理顺序（如果要继续修）

| 顺序 | 项 | 理由 |
| --- | --- | --- |
| 1 | **R33** | 唯一的 P1，且是「同一根因第三次复发」，建议顺手把机制收口进 store（顺带根治 R34 的前提） |
| 2 | **R34** | 与 R33 同一不变式，一起改测试一起补断言，成本最低 |
| 3 | **R35** | 一行修复，且是本轮 flag 翻转直接激活的 |
| 4 | **R36 / R37** | 都是「同类防御只做了一半」，各 3 行内 |
| 5 | **R40** | 恢复「测试全绿」这个基本基线，否则后续每轮都要手动排除 3 条红 |
| 6 | **R38 / R39 / R41** | 体验与文档收尾 |

---

## 8. 全量问题总表（R1–R41，跨轮次收敛）

编号跨轮次单调递增、永不复用；本轮新发现续在 R32 之后。状态：✅已修 / ⚠️部分 / ❌未修 / ⏸按用户要求跳过 / ↩️前轮误判已回退。

| 编号 | 级别 | 一句话 | 状态 |
| --- | --- | --- | --- |
| R1 | P1 | 删除/编辑来源后共享桶不刷新 | ✅ r2 §7（补 `refresh()`） |
| R2 | P1 | 上述修复无测试覆盖 | ✅ r2 §7（变异证有牙） |
| R3 | P2 | `preferredTargetId` 被判为死参数 | ↩️ **误判已回退**（r2 §3 实测推翻） |
| R4 | P2 | `pruneSkillTargets` 裁剪口径与 DB 不一致 | ✅ 由 R12 治本 |
| R5 | P2 | `setRegisteredTargets` 变成有破坏性的 setter | ✅ r2 §7（补隐式契约注释） |
| R6 | P2 | 注释失实 + 遗留死代码 | ✅ r2 §7 + r3 复核 |
| R7 | P3 | 同步全部失败也无条件 `refresh()` | ✅ r2 §7（收口为「有成功项才刷」） |
| R8 | P1 | 停用/启用来源后共享桶不刷新 | ✅ r3 §7（变异证有牙） |
| R9 | P1 | Settings 重建库后共享桶未重置 | ⏸ **按用户要求跳过** |
| R10 | P2 | R4 注释依据写错 + 按 enabled 裁剪有损 | ✅ r3 §7（②＝rescan 补 `refreshSkills`） |
| R11 | P3 | 零散项（死 `setSkills`／void 风格／徽标搬进 store／`!result` 早退） | ✅ r3 §7（徽标只修一半 → R13） |
| R12 | P1 | `skills[].targets` 4 写入点 2 口径 | ✅ r4 §8.1（DB join 治本，r5 等价 SQL 闭环） |
| R13 | P2 | 徽标刷新不完整（新建来源、Targets 增删 target） | ✅ r4 §8.2 |
| R14 | P2 | `refreshSkills` 无 try/catch、无 epoch 守卫 | ✅ r4 §8.3 |
| R15 | P3 | 零散项（`reset()` 清 `badgeCounts` 等） | ✅ r4 §8.3 |
| R16 | P3 | 早退让 `hasLoadedTargets` 永不为真 | ✅ r4 §8.3 + r6 §8.1 |
| R17 | P2 | 徽标第 3 处漏网（Skills 页新增目录目标） | ✅ r6 §8.2 |
| R18 | P1 | 空结果+接口缺失被静默固化为 `ready` | ⚠️ 只修一半 → R30 补齐（r7 §8） |
| R19 | P2 | 「保留滚动位置」注释不成立 | ❌ **未修** → 本轮归入 R41-1 |
| R20 | P3 | `refreshBadgeCounts` 无 `.catch` | ✅ r6 §8 |
| R21 | P3 | `data-store` 反向依赖 `features` | ✅ r6 §8（迁中性模块） |
| R22 | P2 | 切未访问 Tab 闪一帧空白 | ❌ **未修** → 本轮升级为 **R35**（flag 翻转后线上可达） |
| R23 | P3 | `getTargetOptionsForSkill` 是第 5 个偏好口径读取点 | ✅ r6 §8；**r8 勘误**：sider 勾选态读 `skill.targets`，`skillPreferenceIds` 只决定 independent 目标是否列出 |
| R24 | P3 | 本地偏好写入两处语义错位 + 一处死分支 | ✅ r6 §8（r7 跨层核过落库语义） |
| R25 | P3 | 无谓徽标 IPC | ✅ r6 §8（id 集合门禁；r8 确认门禁安全） |
| R26 | P3 | `pruneSkillTargets` 不复用入参引用 | ✅ r6 §8 |
| R27 | P3 | 乐观更新与整桶重拉之间无写屏障 | ✅ r6 §8；**r8 旁证**回滚在 UI 上真可见 |
| R28 | P2 | `status` 只有写入者没有读者 | ✅ r6 §8（错误条消费）；r8 指出作用域越界 → R38 |
| R29 | P2 | 错误条硬编码中文 | ✅ r7 §8（i18n 双份） |
| R30 | P2 | 单侧接口缺失仍静默 `ready` | ✅ r7 §8 逐项判定；⚠️ **r8 R34 抵消其实效** |
| R31 | P3 | `TargetOption.skillPreferences` 只写不读 | ✅ r7 §8（删字段） |
| R32 | P2 | 这批修复新增测试 0 个 | ⚠️ r7 §8 补 9 例 → r8 判定断言强度不足（R39） |
| **R33** | **P1** | 目标 `enabled` 置回 true 后不重拉 `listSkills`，技能目标永久丢失 | ❌ 本轮新增 |
| **R34** | **P2** | Targets 挂载用空目标集写桶，剪空 `skills[].targets`，抵消 R30 | ❌ 本轮新增 |
| **R35** | **P2** | keep-alive 翻 true 激活 R22（首帧空白成线上行为） | ❌ 本轮新增 |
| **R36** | **P3** | `refreshBadgeCounts` 无 epoch 守卫 | ❌ 本轮新增 |
| **R37** | **P3** | `applySkillTargetsResult` 缺 `!result` 早退守卫 | ❌ 本轮新增 |
| **R38** | **P3** | 错误条作用域越界 + 非 sticky + 零测试 | ❌ 本轮新增 |
| **R39** | **P3** | 新增单测断言强度不足（不覆盖 `skills[].targets`） | ❌ 本轮新增 |
| **R40** | **P3** | `react-i18n.test.ts` 3 条长期红，仓库无测试 workflow | ❌ 本轮新增 |
| **R41** | **P3** | 两处注释与真实行为不符 | ❌ 本轮新增 |

**合计（41 条）**：✅ 已修 **26**（R1,R2,R4–R8,R10–R17,R20,R21,R23–R31）、⚠️ 部分 **2**（R18→由 R30 接续、R32→由 R39 接续）、↩️ 前轮误判回退 **1**（R3）、⏸ 按用户要求跳过 **1**（R9）、❌ **未修 11**（R19 顺延为 R41-1、R22 升级为 R35，加本轮新发现 R33/R34/R36/R37/R38/R39/R40/R41）。

**级别的分布（未修部分）**：P1 × 1（R33）、P2 × 3（R34 / R35 / 以及被 R34 抵消实效的 R30），建议优先处理；其余 7 条为 P3。

**测试守护缺口（跨轮次汇总）**：r5 变异证 R13/R14/R15 零守护；r7 静态快筛证 r6 §8 那批零守护（现已被 R32 补的 9 例部分覆盖，但见 R39 的强度问题）；错误条 UI（R28/R29/R38）**至今零断言**；keep-alive 跨 tab 用例有牙，但锁的是「可见性」而非「目标归属未被破坏」（R39）。
