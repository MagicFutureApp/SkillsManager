# dev-zustand 第三轮复审：R1–R7 修复核对 + 一处误判复盘

- **审查对象**：分支 `dev-zustand` 工作区（HEAD = `c4c1f5b`），11 个改动文件 + 2 个新增文件（`stores/data-store.ts`、`stores/skill-data.ts`）
- **审查性质**：只读审查 + 变异测试/探针验证。**未保留任何代码改动**：所有为验证而做的临时修改均已还原（md5 一致），临时探针测试已删除
- **本轮重点**：① R1–R7 的修复是否真的成立；② R3 回退（`preferredTargetId` 不是死参数）我原来的判断错在哪

---

## 1. 结论速览

| 项 | 内容 | 结论 |
| --- | --- | --- |
| R1 | `confirmDeleteRepository` 补 `refresh()` | ✅ 成立（`:673`） |
| R1 附带 | `saveRepository` 编辑分支补 `refresh()` | ✅ 成立（`:594`），属防御性，代价是 2 次多余 IPC |
| R7 | 同步路径 refresh 收口为「存在成功且非 skipped 项」 | ✅ 成立（`:320-325`），条件与既有 `:345` 的 skipped 判定口径一致 |
| R2 | 新增「同步 → refresh → 桶更新」断言 | ✅ 成立**且测试有牙**（去掉 `refresh()` 该用例即失败，实测） |
| R4 | prune 保留集按 enabled 过滤 | ⚠️ **行为可接受，但注释里的依据写错了**，且引入了有损裁剪，见 §4 R10 |
| R5 | `setRegisteredTargets` 隐式契约注释 | ✅ 成立（`data-store.ts:113-115`） |
| R6 | catch 注释纠偏 + 清理死导入/死 re-export | ✅ 成立（`data-store.ts:85-86`；`skills-page-data.ts`；`use-skills-page-state.ts`），余一处死代码见 §4 R11 |
| R3 | 回退 `preferredTargetId`，注释改写为陈述真实时序 | ✅ **我的判断是误判，你的回退正确**，实测见 §3 |
| — | 新发现 | **R8 / R9 两条同类漏网（P1）** + R10/R11 若干，见 §4 |

方向性结论：这一轮把「来源侧变更 → 共享桶刷新」这条主线补齐了，且补的那条断言确实能拦住回归。但**同一类漏网还剩两条 UI 可达的路径没有收口**（R8 来源启用开关、R9 重建本地数据库），根因是「刷新责任靠调用方手写」而没有任何机制保证。

---

## 2. R1–R7 逐条核对（含验证方式）

| # | 声称的修复 | 代码证据 | 我怎么验证的 |
| --- | --- | --- | --- |
| R1 | `confirmDeleteRepository` 成功分支补 `refresh()` | `use-repositories-page-state.ts:673`（`await deleteRepository` 之后、`setCheckedIds` 之前） | 读代码 + 确认 `repositoryRepository.delete` 会级联删 `skill_units`/`skill_versions`/`install_instances`/`skill_target_preferences`（`db/repositories/repositoryRepository.ts:195-196`） |
| R1 | `saveRepository` 编辑分支补 `refresh()` | `:594`（`setRepositories` 之后） | 读代码；确认 `repository_config_json.enabled` 参与 `isSkillSourceEnabled` 过滤（`skillRepository.ts:57,127-134`），故编辑确有可能改变技能集合 |
| R7 | 仅「成功且非 skipped」才刷新 | `:320-325`：`results.some(r => !r.error && r.status !== "skipped")` | 与既有跳过判定 `:345` 同口径；`buildSkippedSyncResult`（`main/ipc/repositories.ts:755`）确实产出 `status: "skipped"` |
| R2 | 新增桶刷新断言 | `repositories-page.test.tsx`（新增用例，含 `listSkills` 两次 `mockResolvedValueOnce`） | **变异测试**：把 `refresh()` 调用摘掉 → 该用例失败（详见 §5） |
| R5/R6 | 注释与死代码 | `data-store.ts:85-86`（"注意：此处不是 idle"）、`:113-115`（隐式契约）；`skills-page-data.ts` 删除 `adaptSkillRecord` re-export；`use-skills-page-state.ts` 删掉 `adaptSkillRecord` / `type Skill` 导入 | 读代码 + 全仓 grep：`adaptSkillRecord` 现仅 `stores/skill-data.ts` 定义、`data-store.ts` 消费 ✔；`type TargetOption` 仍在用（`:592` `TargetOption["scope"]`），保留正确 ✔ |
| R3 | 保留 `preferredTargetId`，注释陈述时序 | `use-targets-page-state.ts:443-452` | **三次独立实验**（§3） |

补充：`hasLoadedTargets` 改由 `applyTargetsResult` 统一置真（`:70`）、初始加载改走 `loadSharedPageData`（`:441-454`）——我核对了两条加载路径（冷 / 热 store）与 Targets 页的可见性归一化 effect（`:529-542`）的交互，除 §3 讨论的初始选中外无异常。

---

## 3. R3 误判复盘：我错在哪

### 3.1 我原来的推理（错误）

r2 里我写的是：「`applyTargetsResult` 先写桶再读桶 + `adaptTargets` 是保序纯 map ⇒ `preferredTargetId` 分支恒等于兜底 `nextTargets[0]?.id`」。

**拆开看，两个前提里有一个是我没验的：**

- 「先写桶再读桶」（`:73-76`）—— 成立；
- 「`adaptTargets` 保序」—— 成立（`targets-page-data.ts:30-36`，`.map(adaptRegisteredTarget)`，不过滤）；
- 「`setSelectedTargetId` 更新函数里 `currentTargetId` 会是 `null`」—— **我默认了这个，且从未验证**。这恰恰是错的：`setSelectedTargetId` 用的是**函数式更新**，`currentTargetId` 是**更新被处理时**的状态，不是调用时的状态。而在该更新被处理之前，「可见性归一化」effect（`:529-542`）已经排进队列并把选中改成了 `visibleTargets[0]`（名称排序首个）。

于是没有 `preferredTargetId` 时走的是 `:97-99` 的「保留旧选中」分支，返回的是 `Design scratch`，**不是**兜底值 `Local project`——两者只有在「`currentTargetId` 仍为 null」时才等价。

教训（跟我 r2 里那条一样，但这次错在别处）：写「A 恒等于 B」这类等价性判断时，函数式更新里的 `prev` 到底取到哪一版状态，必须实测，不能按同步直觉推。

### 3.2 实测证据

| 实验 | 场景 | 结果 |
| --- | --- | --- |
| 变异 1 | 冷 store（现有 `targets-page.test.tsx` 场景）：摘掉 `preferredTargetId` | **4 个用例失败**；详情面板 heading 从 `Local project` 变成 `Design scratch` |
| 探针 A | 热 store（先 `loadSharedPageData()` 预热再挂载 Targets 页，即生产常见时序），**带**参数 | 初始选中 = `Local project` ✅ |
| 探针 B | 同上场景，**摘掉**参数 | 初始选中 = `Design scratch` ❌ |

探针是临时文件（`__probe-r3-warm.test.tsx`），已删除；待验证文件已还原，md5 与变异前一致。

结论：**`preferredTargetId` 是当前唯一能锚定「store 顺序首个」的机制，删除它会静默退化为「名称排序首个」。你的回退正确，注释也写得准。**

### 3.3 一个顺带的语义提醒（不是 bug）

锚定值 `registeredTargets[0]` 来自 DB：`targetRepository.list()` 用 `orderBy(asc(agentTargets.name))`（`db/repositories/targetRepository.ts:54`），是 **SQLite BINARY 排序**；而 UI 的 `visibleTargets[0]` 走 `localeCompare`（`targets-page-data.ts:52-54`）。两者在纯 ASCII 小写名场景下一致，遇到**大小写混排或中文名**就可能不同。

也就是说：「初始选中哪一项」这个规则目前是**由实现细节决定**的（谁排前面选中谁），不完全是设计意图。现在注释已把这个事实写明，可以接受；如果以后想做「记住上次选中的 target」「按最近使用排序」，建议把初始选中规则提到显式参数/设置里，而不是继续依赖 effect 顺序。

---

## 4. 新发现的问题

### R8（P1）停用 / 启用来源后共享桶不刷新 —— **实测复现**

- `toggleRepositoryEnabled`（`use-repositories-page-state.ts:450-476`）成功分支只 `loadRepositories() → setRepositories()`，**没有 `refresh()`**（对比同步 `:324`、删除 `:673`、编辑 `:594` 都补了）。
- 但「是否启用」是会改变 `listSkills` 结果的：`skillRepository.list()` 用 `isSkillSourceEnabled`（`skillRepository.ts:57`）读 `repository_config_json.enabled`（`:127-134`），为 `false` 时该来源的技能被整批过滤；`update()` 会把 `enabled` 写回 config JSON（`repositoryRepository.ts:913`）。
- UI 入口是列表里的开关：`repository-list.tsx:159-163` 的 `<Switch aria-label="启用 {name}">` → `repositories-page-main.tsx:94`。

**探针实测**（临时文件，已删除）：预热桶拿到 2 个技能 → 点开关停用来源 → 等 50ms → `listSkills` 调用次数仍为 **1**，桶内仍为 **2 个技能**（而同一次 mock 里，重新拉取会返回 1 个）。

后果与 R1 相同：停用来源后切到 Skills 页（保活 + `status === "ready"` 短路），该来源的技能仍在列表中，**且仍可点「分发」**。

修法：`:466-469` 的 `.then((nextRepositories) => { setRepositories(nextRepositories); useDataStore.getState().refresh(); })`（失败回滚分支不用动）。

### R9（P1）Settings「重建本地数据库」后共享桶未重置 —— 代码路径推断

- 主进程 `resetLocalDatabase` 会**删库文件并重建空库**（`main/ipc/settings.ts:117-126` → `main/app-storage.ts:64-78`：`rm(db, -wal, -shm)` + `createDatabase`）。
- 渲染侧成功分支只做 `setSettings / setStoragePaths / setGithubToken("") / setStorageStatus("reset")`（`features/settings/settings-page.tsx:379-388`），**完全不碰共享桶**。

后果：重建后 Skills / Targets 页仍展示已经不存在的技能与目标（保活不重挂载 + store 一次加载守卫，重挂载也救不回来），侧边栏计数同样不动。

修法：成功分支补 `useDataStore.getState().refresh()`（或 `reset()`）。这条我只做了代码链路核对，未跑探针（与 R8 同机制，未重复造测试）。

### R10（P2）R4 的注释依据写错了；且按 `enabled` 裁剪是**有损**的

两件事：

1. **依据写错**。`stores/skill-data.ts:71-72` 写「DB 侧 skill.targets 仅含 enabled target（getEnabledTargetsBySkillId），这里保持一致」。但 `getEnabledTargetsBySkillId`（`skillRepository.ts:106-125`）过滤的是 **`skill_target_preferences.enabled`**（用户的技能→目标偏好），而渲染侧 `RegisteredTargetRecord.enabled` 来自 **`agent_targets.enabled`**，由扫描状态决定：`saveScannedTargets` 里 `enabled = target.status === "detected"`（`targetRepository.ts:329,343`）。**两个 enabled 是不同表的字段**，所以「对齐」这个说法不成立。
   - 真正被对齐的其实是另一条查询：`countEnabledTargetPreferences`（`repositoryRepository.ts:806-826`）在自动分发资格里**同时**要求 `skillTargetPreferences.enabled = true` **和** `agentTargets.enabled = true`。代码行为因此是**可接受甚至更合理**的（比 DB 的 `listSkills` 更严），但注释该改成这个依据。
   - 顺带修正我 r2 的 R4 判断：我当时说「当前无禁用 UI 入口故不可达」也不准确 —— 不需要 UI 开关，**扫描状态**就会让 target 变成 `enabled: false`（`path-missing` / `not-writable` / `app-missing`，见 `core/targets/target-scanner.test.ts:81-123`）。所以这条修复是**真生效**的，不是空转。

2. **有损裁剪**。`pruneSkillTargets` 只做「从 `skill.targets` 里剔除」，而 `skill.targets` 的 id 只有 `listSkills` 能补充。于是：
   - 路径 1：某 target 因目录暂时不可用被扫描标记为 `path-missing`（`enabled=false`）→ 在 Targets 页重扫 → prune 把该 id 从所有技能的 `targets` 里剥掉；
   - 路径 2：把目录/CLI 恢复后再重扫，target 回到 `detected` → **但桶里的 `skills[].targets` 不会把 id 加回来**（`refreshTargets` 只经 `applyTargetsResult` → `setRegisteredTargets`，不重拉 `listSkills`）；
   - 结果：Skills 页的勾选态 / 目标数 / 分发门禁持续显示「未选该目标」，直到下一次「同步 / 删除 / 编辑来源」偶然触发 `refresh()`。

  修法二选一：① `refreshTargets` 重扫成功后直接调 `useDataStore.getState().refresh()`（让 DB 成为唯一真源，顺带解决本条）；② 把裁剪从「写时裁剪」改为「读时派生」（`skill.targets ∩ enabled target ids`），不污染 store 里的原始快照。①更小。

### R11（P3）其余零散项

- `data-store.ts:31,109` 的 `setSkills` **全仓无任何调用方**（`grep -rn "setSkills" apps/desktop/src` 只命中它自己 + 无关的 `setSkillsPage`）——R6 那轮清掉了 `adaptSkillRecord` re-export，这条漏了。
- 三处 `refresh()` 都是 fire-and-forget 且未写 `void`（`:324`、`:594`、`:673`），与 `void useDataStore.getState().loadSharedPageData()`（`use-skills-page-state.ts`）风格不一致；不会产生 unhandled rejection（`loadSharedPageData` 内部 catch），仅一致性问题。
- `applyTargetsResult`（`:69-73`）对 `undefined` 结果做 `setRegisteredTargets(result?.registeredTargets ?? [])`，会把**共享桶的目标写空并连带 prune 掉所有 `skill.targets`**。生产上 `rescanTargets ?? listTargets` 至少有一个存在，故当前不可达；但这是「测试专用 mock 不全 → 静默清空全局状态」的坑，建议 `if (!result) return;` 早退。
- 侧边栏徽标计数走独立 API 且只在 shell 挂载时拉一次（`features/shell/app-shell.tsx:52-58`）。这是 HEAD 就有的老问题，但**这轮之后会变得可见**：同步/删除来源后 Skills 页刷新了、侧边栏数字不动，两处数字会不一致。建议把 `getNavigationBadgeCounts` 也挂到 `refresh()` 之后（或在 store 里维护计数）。

---

## 5. 验证记录（可复现）

命令统一在 `apps/desktop` 下用 node 直跑（bash 下 pnpm shim 会坏，见项目记忆）：

```
node ../../node_modules/typescript/bin/tsc -p tsconfig.main.json --noEmit      → EXIT=0
node ../../node_modules/typescript/bin/tsc -p tsconfig.renderer.json --noEmit  → EXIT=0
node ../../node_modules/vitest/vitest.mjs run <files>
```

| 项 | HEAD 基线 `c4c1f5b` | 当前工作区 |
| --- | --- | --- |
| tsc（main + renderer） | 0 / 0 | **0 / 0** |
| 4 个受影响测试文件（串行） |（上轮）94 passed / 1 skipped | **95 passed / 1 skipped**（+1 为新增 R2 用例） |
| 全量 `vitest run src/renderer` | 4 failed / 156 passed / 2 skipped | **3 failed / 160 passed / 1 skipped** |
| 失败明细 | 3× i18n + 1× `skills-page`（`v8f2c91a` 断言） | 仅 3× i18n（`skills.actions.addSkill`、`skills.filters.sortRecommended` 缺 key 等，本轮未碰任何 i18n 文件） |
| `act` 警告 | 171 | **54** |

### 变异测试 / 探针记录（全部已还原）

| # | 变异 / 探针 | 预期 | 实测 |
| --- | --- | --- | --- |
| 1 | `use-targets-page-state.ts:452` 去掉 `preferredTargetId` 实参 | 初始选中退化 | ✅ `targets-page.test.tsx` **4 failed / 21 passed**，选中变 `Design scratch` |
| 2 | `use-repositories-page-state.ts:324` 摘掉 `refresh()` | 新断言应失败 | ✅ 该用例 failed，其余 38 passed → **R2 的测试有牙** |
| 3 | 探针：热 store 下带 / 不带 `preferredTargetId` | 应为 `Local project` / `Design scratch` | ✅ 与预期一致 |
| 4 | 探针：停用来源后观测 `listSkills` 调用次数与桶内容 | 应重拉（次数 2、桶 1 个） | ❌ 实测**次数 1、桶 2 个** → R8 成立 |

还原校验：`md5sum` 与变异前逐字节一致（`61bbf23f…` / `06d5c89f…`），`git status --short` 无探针残留。

---

## 6. 遗留清理（沙箱内删不掉，需你处理）

1. **基线 worktree** `D:\code\skills-manager-base`（detached at `c4c1f5b`），内含 2 个 junction 指向主仓 `node_modules`。清理时**不要用 `Remove-Item -Force`**（会递归删进主仓）：先对两个 junction 用 `(Get-Item <link>).Delete()` 拆掉，再 `git worktree remove --force`。
2. 仓库根的临时日志（前几轮遗留）：`tmp-review-test.log`、`tmp-repo-test.log`、`tmp-r2-*.log`、`tmp-base-*.log` 等。
3. 本轮的新增验证产物都在 `D:\code\skills-manager-tmpbackup\`（两个文件备份 + `md5-before.txt` + 4 个日志），可直接整个目录删除；根目录未新增日志。

按惯例：**未修改任何业务代码、未 commit、未 push**。

---

## 7. 修复落实（第四轮代码改动，R8 / R10 / R11，R9 跳过）

用户指令："审核 r3 新发现的问题，除 R9 不管外，其他先从代码层面看是否正确……修改吧。" → 先独立核对 R8/R10/R11 代码依据全部成立，再落实修复。

### 代码改动（全部落在 renderer，未 commit）

| 项 | 文件 / 位置 | 改动 |
| --- | --- | --- |
| **R8（P1）** | `use-repositories-page-state.ts:471`（toggleRepositoryEnabled 成功分支） | 补 `void useDataStore.getState().refresh();`，与同步 `:324` / 删除 `:676` / 编辑 `:597` 一致，覆盖「启用/停用来源 → 共享桶刷新」这条漏网路径。 |
| **R10①（P2）** | `stores/skill-data.ts:71-72` 注释 | 修正依据：prune 保留集按 `agent_targets.enabled`（扫描状态）过滤，与 `getEnabledTargetsBySkillId`（`skill_target_preferences.enabled`）**不是同表字段**；真实对齐的是 `countEnabledTargetPreferences`（两 enabled 同时要求）。注释改写为陈述真实依据，行为不变。 |
| **R10②（P2）** | `use-targets-page-state.ts:142` + `stores/data-store.ts` 新增 `refreshSkills` | `refreshTargets` 重扫成功后补 `void useDataStore.getState().refreshSkills()`（仅重拉 `listSkills` 重新供货 `skill.targets`）。**未用整段 `refresh()`**：整段 refresh 会重拉 `listTargets` 并覆盖刚 rescan 得到的 `registeredTargets`，导致「rescans targets」用例回归（`Codex` 按钮丢失）——已实测踩中并改回。store 新增 `refreshSkills`（`set({ skills: listSkills.skills.map(adaptSkillRecord) })`），不触动 `registeredTargets`。 |
| **R11-3（P3）** | `use-targets-page-state.ts:69-73`（`applyTargetsResult`） | 开头加 `if (!result) return;` 早退，避免 mock 不全时把共享桶目标写空、连带 prune 掉所有 `skill.targets`。 |
| **R11（死代码）** | `stores/data-store.ts:31,109` 的 `setSkills` | 删除类型声明与实现（全仓无调用方，R6 那轮漏网）。 |
| **R11（void 风格）** | `use-repositories-page-state.ts:324/597/676` + `:471` | 四处 `refresh()` 调用均加 `void` 前缀，与 `use-skills-page-state.ts` 的 `void loadSharedPageData` 一致。 |
| **R11（侧边栏徽标）** | `stores/data-store.ts` + `features/shell/app-shell.tsx` | 把 `getNavigationBadgeCounts` 收进 store（`badgeCounts` 状态 + `refreshBadgeCounts` 动作）；`refresh()` / `reset()` 成功后自动重拉徽标；`app-shell` 改为从 store 读 `badgeCounts`、挂载时触发一次 `refreshBadgeCounts`，删掉本地 `useState` 与死 import。解决「同步/删除/编辑来源后徽标数与 Skills 页不一致」。 |
| **R8 回归测试** | `features/repositories/repositories-page.test.tsx` | 新增「toggles source enabled → 共享桶 refresh → Skills 页反映」断言，与 R2 同款「有牙」（变异测试已证：摘掉 `:471` 的 `refresh()` 该用例即失败）。 |

### 验证结果

- renderer `tsc -p tsconfig.renderer.json --noEmit` → **EXIT=0**。
- 受影响 6 测试文件（`skills` / `targets` / `keep-alive` / `repositories` / `app-shell` / `app-sidebar`）：**Test Files 6 passed / Tests 117 passed / 1 skipped**（比修复前 +1，为新 R8 用例）。
- 变异测试：`use-repositories-page-state.ts:471` 摘掉 `refresh()` → R8 用例 **failed**，还原后 **passed** → 用例有牙。
- 临时日志（需用户清理）：`tmp-r4-final.log`、`tmp-r4-mutate.log`。

### 说明

- R9（Settings「重建本地数据库」后共享桶未重置）按用户要求**跳过**，未改。
- R10② 初版用整段 `refresh()` 触发了 targets 页回归，已改为 `refreshSkills()`（只重拉 skills）。若日后希望 target 重扫也走 DB 单一真源，可将 `refreshSkills` 扩展为同时重拉 `registeredTargets`，但需注意不要覆盖 rescan 的即时结果。

