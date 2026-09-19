# dev-zustand 第六轮复审（R6）：改动意图梳理 + 问题全量汇总

- **日期**：2026-09-18
- **分支**：`dev-zustand`（HEAD `c4c1f5b`，全部改动仍未提交）
- **审查对象**：当前工作区全部未提交改动（**12 个源码/测试文件修改 + 2 个新文件**）
- **审查性质**：只读审查 + 探针实证；**未修改任何业务代码，未 commit / 未 push**
- **前置轮次**：r1（P0-1）、r2（R1–R7）、r3（R8–R11）、r4（R12–R16）、r5（R17–R21）

## 0. 本轮定位（先说清楚）

对比 r5 §0 的改动清单与当前工作区：**内容一致**（同样的 12 改 + 2 新，`data-store.ts` 的关键行号 `:83-87 / :146 / :148-172 / :241 / :246-259` 完全对齐）。

即：**r5 之后没有再产生新代码改动，而 r5 §4 提出的 5 条修复（R17–R21）一条也没有落地。**

因此 r6 的价值不在"再看一遍新代码"，而在于：

1. **把「这批改动到底解决了什么」从上几轮的"逐条核对"上升为一次完整的意图归纳**（§1）；
2. **把 r1–r6 全部问题合并成一张总表**，消除"每轮只报几个"的信息碎片（§4）；
3. **补上前五轮的漏检项**——本轮新挖出 **7 条**（R22–R28），其中 2 条有探针实证（§3）。

---

## 1. 这批改动解决了什么问题

整体是一件事：**把 `KEEP_ALIVE_ENABLED` 从 `false` 翻到 `true`，并为此还清"页面不再重挂载"带来的全部状态一致性债务。**

拆成 5 条主线：

### 1.1 主开关：保活真正打开

| 位置 | 改动 |
| --- | --- |
| `app/keep-alive-pages.tsx:33` | `KEEP_ALIVE_ENABLED` `false → true`；注释从"短路口说明"改写为"保活行为说明" |

**解决**：切 Tab 不再卸载页面，页面内的查询词、分页、选中项等局部状态得以保留。此前 r1–r4 所有"保活页不会重挂载"的推理都是**假设**，从这一行起变成生产事实——同时也意味着"切回 Tab 会重新挂载 = 隐式重新拉取"这条兜底路径**彻底消失**。

### 1.2 共享数据桶：让保活页也能拿到最新数据

| 文件 | 改动 |
| --- | --- |
| `stores/data-store.ts`（新） | 模块级 zustand 单例，持有 `skills` + `registeredTargets` + `badgeCounts` 两个跨 tab 真源；`loadSharedPageData` 按 `status` 去重；`refresh()` 强制重拉；`refreshSkills()` 只重拉技能侧 |
| `stores/skill-data.ts`（新） | 中性领域模块：`Skill` / `TargetOption` 类型、`adaptSkillRecord` / `adaptTargetOption`、`pruneSkillTargets`；刻意放在 `stores` 层以切断 store→features 反向依赖 |
| `features/skills/hooks/use-skills-page-state.ts` | 删本地 `skills` / `targetOptions` state（**-128 行**），改由 store 派生；4 处原地更新收敛为 store action |
| `features/targets/hooks/use-targets-page-state.ts` | `targets` 改由 store 派生；`applyTargetsResult` 先写桶再读桶 |
| `features/skills/components/skills-page-data.ts` | 删重复类型与适配器（-60 行），改 re-export |
| `features/shell/app-shell.tsx` | `badgeCounts` 从 store 读，不再本地 `useState` |

**解决**：保活页隐藏期间其它 Tab 改了底层数据，切回时看到的是**最新快照**而不是"挂载时刻的旧快照"（这正是"保活"最容易踩的坑：状态保住了，数据却死了）。

### 1.3 口径统一：把"DB 严 / 渲染宽"的分裂从 DB 层根治

| 位置 | 改动 |
| --- | --- |
| `db/repositories/skillRepository.ts:110-119` | `getEnabledTargetsBySkillId` 加 `innerJoin(agentTargets)` + `and(pref.enabled, target.enabled)`；import 补 `and` / `agentTargets` |
| `db/repositories/skillRepository.test.ts` | 新增 1 条用例守护该口径（+67 行） |

**解决**（R12 治本）：此前 `listSkills` 只按 `skill_target_preferences.enabled` 过滤，而真正分发时的 `countEnabledTargetPreferences` 要求**两个** `enabled`——导致"UI 把不可用 target 算进目标数、分发时又排除"。现在 `listSkills` 与分发口径完全一致，启动路径（`loadSharedPageData`）与 rescan 路径（`refreshSkills`）都直接产出 enabled-only 的 `skill.targets`，`pruneSkillTargets` 退化为兜底。

### 1.4 「变更后刷新」责任补齐（保活的前提）

因为 §1.1 关掉了"重挂载=重拉"的兜底，**任何改变底层数据的操作都必须显式刷新桶**。本轮补齐的调用点：

| 操作 | 位置 | 动作 |
| --- | --- | --- |
| 同步来源成功 | `use-repositories-page-state.ts:320-325` | 有"成功且非 skipped"结果时 `refresh()`（R7 的条件收口） |
| 启停来源开关 | `:471` | `refresh()`（R8） |
| 编辑来源 | `:597` | `refresh()`（R1） |
| 删除来源 | `:678` | `refresh()`（R1） |
| 新建来源 | `:625` | `refreshBadgeCounts()`（R13） |
| Targets 页 rescan | `use-targets-page-state.ts:152` | `refreshSkills()`（R10②，只重供货 target 侧，不覆盖刚 rescan 的 targets） |
| Targets 增删/编辑/转换 | `applyTargetsResult` → `setRegisteredTargets` | 内含 `refreshBadgeCounts()`（R13） |
| store 整体替换 | `setRegisteredTargets:146` | `refreshBadgeCounts()`（R13） |

### 1.5 测试隔离与新用例

| 文件 | 改动 |
| --- | --- |
| `skills-page.test.tsx` / `targets-page.test.tsx` / `keep-alive-pages.test.tsx` | `beforeEach` 加 `useDataStore.getState().reset()`——store 是**模块级单例**，隔离不干净就会跨用例复用 `ready` 状态而根本不发 IPC |
| `repositories-page.test.tsx` | 新增 2 条用例：同步后桶刷新、启停后桶刷新（+166 行） |
| `keep-alive-pages.test.tsx` | 新增 1 条"保留自身 UI 状态 + 反映其它 tab 的 mutation"用例；提交了 `useState(() => new Set([...]))` 相关的时序断言；`Release Notes → Review Bot` 与 `v8f2c91a` 断言随数据改动同步 |

---

## 2. 复核：r5 §4 建议的落地情况（**5 条全未落地**）

| 项 | r5 建议 | 当前代码事实 | 结论 |
| --- | --- | --- | --- |
| **R17**（P2） | `applySkillTargetsResult` 末尾补 `refreshBadgeCounts()` | 函数体 `:148-172` 内 `refreshBadgeCounts` 出现 **0 次**（grep + 探针双证，见 §3.5） | ❌ 未修 |
| **R18**（P1） | `loadSharedPageData` 区分"接口不可用"与"空结果"，不要静默置 `ready` | `:83-87` 仍无条件 `status: "ready"` | ❌ 未修 |
| **R19**（P2） | 兑现或删掉注释里的"保留滚动位置" | `keep-alive-pages.tsx:36-38` 仍写"保留…滚动位置"；`hidden` + 共享 `<main>` 滚动容器未变 | ❌ 未修 |
| **R20**（P3） | `refreshBadgeCounts` 补 `.catch()` | `:246-259` 仍是裸 `void fetchBadgeCounts.then(...)` | ❌ 未修 |
| **R21**（P3） | `ShellNavigationBadgeCounts` 迁到中性模块 | `data-store.ts:11` 仍 `import type ... from "@/features/shell/shell-navigation"` | ❌ 未修 |
| **R16**（P3，r4 遗留） | 把 `setHasLoadedTargets(true)` 移到早退之前 | `use-targets-page-state.ts:72-76` 仍是 `if (!result) return;` 在置位**之前** | ❌ 未修 |

---

## 3. 本轮新发现（R22–R28）

### R22（P2）—— keep-alive 切到「未访问过」的 Tab 必然闪一帧空白

`keep-alive-pages.tsx:64-66`：

```jsx
const isRendered = KEEP_ALIVE_ENABLED
  ? mountedRouteIds.has(routeId)      // ← 只看 state，不含「当前路由恒渲染」
  : routeId === activeRouteId;
```

而 `mountedRouteIds` 的更新在 `useEffect` 里（`:47-59`），注释自己也写着"首次访问才挂载"。

**问题**：`useEffect` 是 passive effect，**在 commit 并完成绘制之后才异步执行**。所以切到一个新 Tab 时：

1. 第 1 次渲染：`activeRouteId` 已变，但 `mountedRouteIds` 还**没有**新路由 → `isRendered = false` → 该页面返回 `null` → **屏幕上什么都不渲染**（`<main>` 空）
2. effect 执行 → `setMountedRouteIds` → 第 2 次渲染才出现页面

**对照**：`KEEP_ALIVE_ENABLED=false` 时走 `routeId === activeRouteId` 分支，同一次渲染就出结果，**没有这一帧**。所以这是翻开关**新引入**的行为差异——正是"每轮只报几个"最容易漏掉的那类"开关副作用"。

**为什么测试抓不到**：`navigateTo()` 包在 `act()` 里（`:43-47`），act 会 flush effects，中间帧在 jsdom 中不存在。**需真机确认**。

**修法**（1 行）：

```jsx
const isRendered = mountedRouteIds.has(routeId) || routeId === activeRouteId;
```

（`KEEP_ALIVE_ENABLED=false` 时可保持现分支；或统一成上式——false 时 `mountedRouteIds` 只有初值，效果等价。）

---

### R23（P3）—— `getTargetOptionsForSkill` 是第 5 个偏好口径读取点，与 `skill.targets` 不同源

r4 §3.5 列过 `skills[].targets` 的 4 个读取点。**漏了第 5 个**：

`skills-page-data.ts:23-34`：

```js
export const getTargetOptionsForSkill = (targets, skill) =>
  targets.filter((target) => {
    if (target.scope === "global") return true;
    return skill ? target.skillPreferenceIds.includes(skill.id) : false;   // ← 只看「偏好行存在」
  });
```

调用点 `use-skills-page-state.ts:136-138` → sider 的"同步目标"列表（`skills-page-sider.tsx:31,71-72`）。

| 判定 | 依据 | 是否要求 `pref.enabled` |
| --- | --- | --- |
| sider 列表是否**出现**某 target | `target.skillPreferenceIds`（`adaptTargetOption` 只取 pref 的 `id`） | ❌ 不要求 |
| 该行是否**已勾选** | `skill.targets`（DB join 双 enabled） | ✅ 要求 |
| 分发门禁 / 目标数 | `skill.targets` | ✅ 要求 |

**后果**：取消勾选 independent target 且**保留偏好**时，该行仍显示（未勾选）——这是合理交互；但由于 `TargetOption` 在适配时**丢弃了 `skillPreferences[].enabled`**，"偏好存在但已停用"与"偏好启用"在 UI 侧不可区分，`getTargetOptionsForSkill` 也就无法表达"这条只是可重新勾选、当前不可分发"。

**当前不构成误分发**（门禁另读 `skill.targets`），但它是 R4/R12 那条"口径必须单一"原则的**最后一个残留读取点**。

**修法**：让 `TargetOption` 保留 `enabled`（或直接保留 `skillPreferences`），把过滤条件从"行存在"升级为"行存在且启用"，与 `skill.targets` 同源。

---

### R24（P3）—— 本地偏好写入的两处语义错位 + 一处死分支

`data-store.ts:173-236`。

**(a) `toggleSkillTargetPreferenceLocally` 的 `enabled=false` 分支是死代码。**
唯一调用点 `use-skills-page-state.ts:407-427` 里，`enabled === false` 时**提前 `return`**（转去弹 `SkillTargetRemovalDialog`），因此传进来的 `enabled` 恒为 `true`。`:180-182` 的 false 分支永远走不到。

**(b) `removeSkillTargetLocally` 在"保留偏好"时新增 `enabled: true`，与刚落库的 `enabled=false` 相反。**
`:225-232`：

```js
skillPreferences: removeTargetPreference
  ? target.skillPreferences.filter((pref) => pref.id !== skillId)
  : target.skillPreferences.some((pref) => pref.id === skillId)
    ? target.skillPreferences
    : [...target.skillPreferences, { enabled: true, id: skillId, name: "", repository: "" }]  // ← 刚「取消启用」，却写 enabled: true
```

**(c) 两处都不更新**已存在 pref 的 `enabled`，导致 store 内 `registeredTargets[].skillPreferences[].enabled` **永远是 `true`**（从不落 `false`），与 DB 真实值分裂。因 `adaptTargetOption` 丢弃该字段，目前不可见。

**当前不可达/不可见**（(b) 的新增分支需 pref 不存在，而能触发取消勾选的入口已保证 pref 存在），属埋点：一旦 R23 的修法开始消费 `enabled`，这三处会立刻互相矛盾。

---

### R25（P3）—— 每次"整体替换 targets"都无条件多付一次徽标 IPC（**探针实证**）

`data-store.ts:137-147`：`setRegisteredTargets` 无条件 `get().refreshBadgeCounts()`。
而 `applyTargetsResult`（`use-targets-page-state.ts:69-112`）**每次**都调 `setRegisteredTargets`——它被 Targets 页 5 个入口共用：挂载 effect、rescan、编辑、删除、新增目录目标、转换全局。

其中"编辑名称/路径""转换 scope"未必改变 targets 计数，仍会发一次 `getNavigationBadgeCounts` IPC。

**实测**（探针，已删）：

```
[PROBE] badgeCalls after loadSharedPageData        = 0    ← 启动不刷徽标（设计如此，由 app-shell 负责）
[PROBE] badgeCalls after setRegisteredTargets      = 1    ← 即使传入的是同一个数组引用
[PROBE] badgeCalls after applySkillTargetsResult   = 0    ← R17 复验：Skills 页新增目标不刷徽标
```

**修法**：`applyTargetsResult` 里先比较新旧 `registeredTargets` 是否等价（或让 `setRegisteredTargets` 在引用相同时早退），仅在真正变化时刷徽标。

---

### R26（P3）—— `pruneSkillTargets` 永不复用入参数组，导致 `skills` 引用恒变（**探针实证**）

`skill-data.ts:80-86`：

```js
return skills.map((skill) => {
  if (skill.targets.every((id) => registeredIds.has(id))) return skill;   // 单个 skill 复用 ✓
  return { ...skill, targets: skill.targets.filter(...) };
});
```

单个 `Skill` 对象确实复用了，但 `skills.map(...)` **永远返回新数组**。而两个写入点都直接赋值：

- `setRegisteredTargets:143` → `skills: pruneSkillTargets(state.skills, registeredTargets)`
- `applySkillTargetsResult:165-170` → 同上

**实测**：

```
[PROBE] skills 引用在「无需裁剪」的整体替换后是否变化 = true
```

**后果**：每次 Targets 侧写操作（含挂载 effect 那一次）都会让 `state.skills` 换引用 → `use-skills-page-state` 的 `filterSkills` useMemo 失效 → Skills 页（保活时通常处于隐藏态）整表重算重渲染。无正确性问题，纯浪费。

**修法**：函数开头加 `const registeredIds = ...; if (skills.every((s) => s.targets.every((id) => registeredIds.has(id)))) return skills;`

---

### R27（P3）—— 乐观更新与"整桶重拉"之间没有写屏障

`use-skills-page-state.ts:427-433`：

```js
useDataStore.getState().toggleSkillTargetPreferenceLocally(skillId, targetId, enabled);  // 乐观写
void window.skillsManager?.setSkillTargetPreference?.({ agentTargetId: targetId, enabled, skillUnitId: skillId });
//   ^ 不 await、不 catch、失败不回滚、无提示
```

两条独立问题：

1. **IPC 失败静默**：本地已勾选，DB 未写入；用户看到勾选态与真实状态不符，且没有任何提示（对比 `confirmTargetRemoval` 失败时会 `showDistributionNotice`）。
2. **与整桶重拉竞态**：当偏好写入在途时若发生 `refresh()`（Repositories 同步/删改来源/启停开关）或 `refreshSkills()`（Targets rescan），重拉会用**尚未包含该偏好**的 DB 快照覆盖 `skills` → 用户刚勾选的项回退。触发需要跨页快速操作，概率低。

**修法**：把偏好写入改为 `await` + 失败回滚（或失败后 `refreshSkills()` 纠正），至少在 catch 里提示。

---

### R28（P2）—— `status` 是"只有写入者、没有读者"的状态机

`DataStore.status: "idle" | "loading" | "ready" | "error"`（`:29`）被 4 处写入，但**全仓没有任何 UI 读取它**：

```
use-skills-page-state.ts:59   state.skills
use-skills-page-state.ts:60   state.registeredTargets
use-targets-page-state.ts:66  state.registeredTargets
app-shell.tsx:16              state.badgeCounts
```

**后果**（与 R18 互为因果、但角度不同）：

- 启动首次加载**失败**时，页面呈现的是"零技能 / 零目标的空界面"，**没有 loading、没有错误提示、没有重试入口**；
- 保活下"切 Tab 重挂载"这条隐式重试路径已消失（§1.1），用户唯一出路是触发某个会 `refresh()` 的操作（同步/删除/编辑来源、开关、Targets rescan）；
- `:88-93` 的 catch 注释仍写着"使后续 refresh / **重新挂载**能再次触发拉取"——"重新挂载"这个前提在 keep-alive 下已不成立（R18 已指出，此处补上"UI 无消费者"这一半）。

**修法**：UI 消费 `status`（至少 `error` 态给出提示 + 重试按钮），并同步修正 R18 的状态写入语义；两件事应一起做。

---

## 4. 全量问题总表（r1–r6，一次性看全）

| 编号 | 级别 | 一句话 | 状态 |
| --- | --- | --- | --- |
| **P0-1** | P0 | 保活页在其它 tab 增删技能后不更新 | ✅ 已修（→ store） |
| R1 | P1 | 删除来源后共享桶不刷新 | ✅ 已修 |
| R2 | P1 | P0-1 修复无测试覆盖 | ✅ 已修（新增用例） |
| R3 | P2 | `preferredTargetId` 被判死参数 | ✅ 误判已回退（实测删除会退化） |
| R4 | P2 | `pruneSkillTargets` 口径与 DB 不一致 | ✅ 治本（R12，DB join） |
| R5 | P2 | `setRegisteredTargets` 是破坏性 setter | ⏸ 注释写明契约，未拆分 |
| R6 | P2 | 注释失实 + 死代码 | ✅ 已修 |
| R7 | P3 | 同步全失败仍无条件 `refresh()` | ✅ 已修（加成功条件） |
| R8 | P1 | 停/启来源后共享桶不刷新 | ✅ 已修 |
| R9 | P1 | Settings 重建库后桶未重置 | ⏸ 用户明确跳过 |
| R10 | P2 | R4 注释依据写错 / prune 有损 | ✅ 注释修，`refreshSkills` 加固保留 |
| R11 | P3 | 零散项（死代码 / `void` / 徽标搬迁） | ✅ 大部分已修 |
| R12 | P1 | `skills[].targets` 4 写入点 2 口径 | ✅ 治本 + 探针复验 |
| R13 | P2 | 徽标刷新不完整（2 处漏） | ⚠️ 修了 2 处，**第 3 处仍漏** → R17 |
| R14 | P2 | `refreshSkills` 无 catch / 无 epoch 守卫 | ✅ 已修 |
| R15 | P3 | `reset` 不清 `badgeCounts` 等 | ✅ 已修（feature 层 re-export 中转按低性价比跳过） |
| R16 | P3 | 早退跳过 `setHasLoadedTargets` | ❌ **未修** |
| R17 | P2 | `applySkillTargetsResult` 不刷徽标 | ❌ **未修**（探针复验） |
| R18 | P1 | 空结果/接口缺失被固化 `ready`，永久短路 | ❌ **未修** |
| R19 | P2 | 注释承诺"保留滚动位置"架构上不成立 | ❌ **未修**（需真机） |
| R20 | P3 | `refreshBadgeCounts` 无 `.catch` | ❌ **未修** |
| R21 | P3 | `data-store` 反向依赖 `features` | ❌ **未修** |
| **R22** | P2 | 切未访问 Tab 首帧空白（`isRendered` 缺"当前路由恒渲染"） | 🆕 本轮新发现 |
| **R23** | P3 | `getTargetOptionsForSkill` 是第 5 个偏好口径读取点 | 🆕 本轮新发现 |
| **R24** | P3 | 本地偏好写入：死分支 + 写反 `enabled` + 从不落 false | 🆕 本轮新发现 |
| **R25** | P3 | 每次整体替换都多付一次徽标 IPC（实测） | 🆕 本轮新发现 |
| **R26** | P3 | `pruneSkillTargets` 永不复用数组，`skills` 引用恒变（实测） | 🆕 本轮新发现 |
| **R27** | P3 | 乐观更新无回滚 + 与整桶重拉无写屏障 | 🆕 本轮新发现 |
| **R28** | P2 | `status` 只有写入者没有读者，失败态静默 | 🆕 本轮新发现 |

**未修合计 11 条**：R16、R17、R18、R19、R20、R21、R22、R23、R24、R25、R26、R27、R28 中，**P1 一条（R18）、P2 四条（R17/R19/R22/R28）、P3 七条**；另有 R5/R9 两条按你/前轮的判断搁置。

**测试守护缺口**（r5 §2.4 变异结论沿用）：R13/R14/R15 的修复**全部零守护**（摘掉后 4 文件仍 96 passed 全绿）；本轮新增的 3 条用例只覆盖"同步后刷新"与"启停后刷新"两条路径。

---

## 5. 验证记录（可复现）

### 5.1 类型与测试

| 检查 | 结果 |
| --- | --- |
| `tsc -p tsconfig.renderer.json --noEmit` | **EXIT=0** |
| `tsc -p tsconfig.main.json --noEmit` | **EXIT=0** |
| 4 个受影响测试文件（`--fileParallelism=false`） | **Test Files 4 passed / Tests 96 passed / 1 skipped (97)**，与 r5 一致，无新增失败 |

### 5.2 探针实测（脚本已删）

```js
[PROBE] badgeCalls after loadSharedPageData      = 0
[PROBE] badgeCalls after setRegisteredTargets    = 1
[PROBE] skills 引用在「无需裁剪」的整体替换后是否变化 = true
[PROBE] badgeCalls after applySkillTargetsResult = 0
```

→ 分别支撑 R25、R26、R17 复验。

### 5.3 格式检查的说明（避免误报）

`prettier --check apps/desktop/src/**/*.{ts,tsx}` → **146 个文件不合规，包含大量本轮未改动的文件**（如 `app-sidebar.tsx`、`provider-data.ts`、`core/**`）。

结论：这是**既有环境问题**（大概率 `core.autocrlf` 导致的 CRLF/LF 差异，`git diff` 也一直在报 `LF will be replaced by CRLF`），**不是本轮改动引入**，不能作为"改动有格式问题"的证据。（唯一可疑点：`skillRepository.ts:11` 的 import 长 104 字符，若 `printWidth=100` 会被换行——但在全仓不合格的前提下无法据此判定。）

### 5.4 未做

- **未跑真实 Electron（`pnpm run dev`）**：R19（滚动位置）、R22（首帧空白）都是"代码事实 + 渲染时序"推断，**jsdom + act 均无法观测**，需真机走查。
- **未跑 DB 用例**：`skillRepository.test.ts` 在本沙箱因 `better-sqlite3` ABI（Electron 145 vs Node 137）无法执行，属既有技术债；r5 已用 Python `sqlite3` 等价 SQL 补证 join 语义（5/5 PASS）。

---

## 6. 建议的修复顺序（合并成一份可执行清单）

| 优先 | 项 | 改动量 |
| --- | --- | --- |
| 1 | **R18 + R28**：把"接口不可用 / 空结果 / 真实失败"三态分清，并让 UI 消费 `error`（提示 + 重试）。这是目前唯一的 P1，且两者必须一起改 | ~20 行 |
| 2 | **R22**：`isRendered` 补 `|| routeId === activeRouteId`。1 行换掉每次首访 Tab 的空白帧 | 1 行 |
| 3 | **R17**：`applySkillTargetsResult` 末尾补 `get().refreshBadgeCounts()` | 1 行 |
| 4 | **R20**：`refreshBadgeCounts` 补 `.catch(() => {})` | 1 行 |
| 5 | **R16**：`setHasLoadedTargets(true)` 移出早退保护范围（与写桶解耦） | 2 行 |
| 6 | **R26 + R25**：`pruneSkillTargets` 无裁剪时直接返回入参；`setRegisteredTargets` 检测无变化时跳过徽标 IPC | ~6 行 |
| 7 | **R21**：`ShellNavigationBadgeCounts` 迁到 `stores/` 或 `core/` 中性模块 | 小重构 |
| 8 | **R23 + R24**：`TargetOption` 保留 `preferences[].enabled`，把 5 个读取点收敛到同一口径，清掉死分支与写反的 `enabled` | 中等 |
| 9 | **R27**：偏好写入改 `await` + catch 回滚/提示 | 小 |
| 10 | **R19**：真机确认滚动行为 → 要么改 `content-visibility: hidden`，要么删掉注释里的"滚动位置" | 需真机 |
| 11 | **测试守护**：给 `stores/data-store.ts` 建专属单测（`pruneSkillTargets` 两种 target 状态、`refreshSkills` 与 `refresh` 的交互、`reset` 的完整重置、徽标刷新时机）——r5 的 M1–M3 已证明这些修复**零守护**，本轮 R25/R26 也是靠探针才挖出来的 | 新增 1 个测试文件 |

---

## 7. 本轮产生的文件与清理

- 本轮临时日志：`tmp-r6-tests.log`、`tmp-r6-probe.log`（仓根，`.log` 已被 gitignore；如不需要可直接删）
- 探针脚本 `apps/desktop/src/renderer/stores/r6-probe.test.ts` 与中间 diff/tsc 日志**已删除**
- 前几轮遗留（**非本轮产生，未动**）：`D:\code\skills-manager-base`（HEAD 基线 worktree，含 2 个指向主仓的 `node_modules` junction）、`D:\code\skills-manager-tmpbackup\`、仓根若干 `tmp-*.log` / `skills-*.log`

> 清理基线 worktree 时**别用 `Remove-Item -Force`**（会递归删到主仓内容）：
>
> ```powershell
> (Get-Item "D:\code\skills-manager-base\node_modules").Delete()
> (Get-Item "D:\code\skills-manager-base\apps\desktop\node_modules").Delete()
> git worktree remove --force D:/code/skills-manager-base
> ```

---

## 8. 修复落实（R16/R17/R18/R20/R21/R23/R24/R25/R26/R27，R19/R22 跳过）

按用户指令，除 R19（滚动位置，需真机）、R22（切未访问 Tab 首帧空白，需真机）外，其余 11 条全部落实。R23 与 R24 合并处理（见 §8.7）。

### 8.1 R16 — `setHasLoadedTargets(true)` 移出早退保护范围
`use-targets-page-state.ts` `applyTargetsResult`：把 `setHasLoadedTargets(true)` 提到 `if (!result) return;` 之前，确保空结果也不会卡在加载态（与写桶保护解耦）。

### 8.2 R17 — `applySkillTargetsResult` 补徽标刷新
`data-store.ts:179` `applySkillTargetsResult` 末尾加 `get().refreshBadgeCounts()`，与 `setRegisteredTargets` 行为对齐（Skills 页新增目标后侧边栏 targets 徽标同步）。

### 8.3 R18 + R28 — 接口不可用区分 + UI 消费 status
`data-store.ts` `loadSharedPageData`：接口不可用（`skillsResult` 与 `targetsResult` 均不存在）时置 `status: "error"` 而非 `ready`，避免被固化后永久短路； legitimately 空结果仍置 `ready`。catch 注释改写为「重试只能靠显式 refresh」。
`app-shell.tsx`：读取 `state.status`，`error` 时渲染顶部错误条（提示 + 「重试」按钮调用 `refresh()`），落实 R28 的 UI 消费者。

### 8.4 R20 — `refreshBadgeCounts` 补 `.catch`
`data-store.ts:254` `.then(...)` 链补 `.catch(() => {})`，消除 unhandled rejection。

### 8.5 R21 — `ShellNavigationBadgeCounts` 迁中性模块
类型从 `@/features/shell/shell-navigation` 迁到 `@/stores/skill-data.ts`（导入 `AppRouteId` 自 `@/app/route-config`），`data-store.ts` 改从中性模块导入，`shell-navigation.ts` 保留 `export type { ShellNavigationBadgeCounts }` re-export 兼容 `app-sidebar.tsx`。切断 `data-store → features` 反向依赖。

### 8.6 R25 + R26 — 徽标 IPC / 引用优化
- R25：`data-store.ts` 新增 `sameRegisteredTargetIds` 辅助；`setRegisteredTargets` 仅在 target id 集合真正变化时刷 `refreshBadgeCounts`，避免每次整体替换（含同引用重设）多付 1 次 IPC。
- R26：`skill-data.ts` `pruneSkillTargets` 开头加「无需裁剪时直接 `return skills`」，复用入参数组引用，避免 `state.skills` 无谓换引用触发 Skills 页整表重算。

### 8.7 R23 + R24 — 保留 `enabled` + 本地写入语义修正
- `skill-data.ts` `TargetOption` 新增 `skillPreferences: { id, enabled }[]`，`adaptTargetOption` 映射 `skillPreferences[].enabled`（此前丢弃该字段）。
- `data-store.ts` `removeSkillTargetLocally`：保留偏好时把匹配 pref 的 `enabled` 置 `false`（含 pref 不存在时补 `enabled: false` 行），修正原「写反成 `enabled: true`」；`toggleSkillTargetPreferenceLocally`：pref 存在时同步更新 `enabled` 为传入值（此前从不更新，store 内恒 `true`）。
- **R23 处理说明**：`getTargetOptionsForSkill`（`skills-page-data.ts`）的过滤**保留「按偏好行存在」判定**（sider「同步目标」列表需显示有偏好的 target 以便重新勾选），不改为「行存在且启用」——后者会隐藏可重新启用的 target，造成 UX 回归。R23 真正的根因（enabled 数据丢失）已由 R24 的 `adaptTargetOption` 保留修复，勾选态仍另读双 enabled 的 `skill.targets`，口径一致。

### 8.8 R27 — 偏好写入 await + 回滚 + 提示
`use-skills-page-state.ts` `toggleSkillTargetPreference` 改为 `async`：`await setSkillTargetPreference`，失败时回滚本地写入（`toggleSkillTargetPreferenceLocally(skillId, targetId, !enabled)`）并 `showDistributionNotice("skills.actions.targetPreferenceSyncFailedStatus")`；新增该 i18n key（zh/en，`resources.ts`）。

### 验证
- `tsc -p tsconfig.renderer.json --noEmit` + `tsconfig.main.json` → **0 / 0**。
- 6 相关测试文件（`--fileParallelism=false`）：**117 passed / 1 skipped / 0 failed**（skills 28、targets 25、repositories 40、keep-alive 4/1 skipped、app-shell、app-sidebar）。
- 未 commit / push（用户未要求）。改动均在 `dev-zustand` 分支未提交工作区。
- 注意：R19 / R22 按用户要求跳过，二者均属「代码事实成立、用户可见严重度需真机走查」类。

