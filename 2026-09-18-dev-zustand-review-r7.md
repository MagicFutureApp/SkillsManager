# dev-zustand 第七轮复审（R7）：§8 修复批次核对

- **日期**：2026-09-18
- **分支**：`dev-zustand`（HEAD `c4c1f5b`，全部改动仍未提交）
- **审查对象**：r6 报告 §8「修复落实」这批改动（**7 个业务文件**）
- **审查性质**：只读审查 + 探针实测；**未改动任何业务代码，未 commit / 未 push**
- **报告范围**：按你的要求只列重要项；「可改可不改」的项一律不列

## 0. 本轮定位

r6 审查时工作区 = r5 之后那一版（12 改 + 2 新）。当前工作区在 r6 之上多出一批改动，即 r6 报告尾部 `§8` 记录的 11 条修复：

| 文件 | 性质 |
| --- | --- |
| `stores/data-store.ts`（新文件，未跟踪） | R17 / R18 / R20 / R24 / R25 / R27(回滚接口) |
| `stores/skill-data.ts`（新文件，未跟踪） | R21(类型) / R23 / R24 / R26 |
| `features/shell/app-shell.tsx` | R28（错误条 + 重试） |
| `features/shell/shell-navigation.ts` | R21（re-export 迁移） |
| `features/skills/hooks/use-skills-page-state.ts` | R27（await + 回滚 + 提示） |
| `features/targets/hooks/use-targets-page-state.ts` | R16 |
| `i18n/resources.ts` | R27 的 i18n key（zh/en 各 1 条） |

**关键事实（后面 R32 依赖它）**：这批改动**不含任何测试文件**——`git diff --stat` 里的 5 个测试文件（`skillRepository.test.ts` +67、`keep-alive-pages.test.tsx` +48、`repositories-page.test.tsx` +166、`skills-page.test.tsx` +6、`targets-page.test.tsx` +4）全部属于 r1–r5 那批，与 r6 记录完全一致。

---

## 1. 逐条核对：声称 vs 代码事实

| 项 | §8 声称 | 代码事实（行号已核） | 结论 |
| --- | --- | --- | --- |
| **R16** | `setHasLoadedTargets(true)` 移出早退 | `use-targets-page-state.ts:72` 在 `if (!result) return;`（`:76`）**之前** | ✅ 落地（但该分支如今只有「两个 IPC 同时缺失」才走到，属防御性） |
| **R17** | `applySkillTargetsResult` 补徽标刷新 | `data-store.ts:198`；探针实测 = **1 次** | ✅ 落地 |
| **R18** | 接口不可用置 `error` | `data-store.ts:100-105`，条件是 **`!skillsResult && !targetsResult`** | ⚠️ **只覆盖一半**，见 R30 |
| **R20** | `refreshBadgeCounts` 补 `.catch` | `data-store.ts:315` `.catch(() => {})` | ✅ 落地 |
| **R21** | `ShellNavigationBadgeCounts` 迁中性模块 | `skill-data.ts:39` 定义；`shell-navigation.ts:14` re-export；`app-sidebar.tsx:10` 走 re-export | ✅ 落地，反向依赖已切断 |
| **R23** | `TargetOption` 保留 `skillPreferences[].enabled` | `skill-data.ts:35,64` 确实写入了，但**全仓无任何读取方** | ⚠️ **数据加了、UI 没变**，见 R31 |
| **R24** | 修正本地写入的 `enabled` 语义 | `data-store.ts:223-233`（pref 存在时同步 `enabled`）、`:272-287`（保留偏好时置 `false`）。**已核对主进程落库语义**：`main/ipc/skills.ts:82-98` 在 `removeTargetPreference=false` 时 upsert `enabled:false` → 本地写 `false` 与 DB **真对齐** | ✅ 落地（这条我专门去 DB 写入侧验证过） |
| **R25** | 同 id 集合时跳过徽标 IPC | `data-store.ts:56-66` + `:168-170`；探针：同引用 1→1、同 id 但 `enabled` 翻转 1→1、新增 id → 2 | ✅ 落地，且**判定安全**：三个徽标数都是 `count(*)` 行数（`navigation-badges.ts:24-28`、`targetRepository.ts:47-51`），与 target 内容无关 |
| **R26** | 无需裁剪时复用入参数组 | `skill-data.ts:90-92`；探针实测「引用是否变化 = **false**」 | ✅ 落地 |
| **R27** | 偏好写入改 await + 回滚 + 提示 | `use-skills-page-state.ts:407-441`；i18n key `resources.ts` zh/en 双份 | ✅ 落地 |
| **R28** | UI 消费 `status` | `app-shell.tsx:17,93-107`（`role="alert"` + 重试按钮） | ⚠️ 消费者有了，但文案硬编码（R29）、且无测试（R32） |

**总评**：11 条**代码层面全部落地**，其中 R24 / R25 我还做了跨层核对（DB 写入语义、徽标口径），没有发现"声称改了实际没改"的情况。剩下的问题集中在这批修复**本身不完整/无守护**。

---

## 2. 重要问题（必须处理的只有这几条）

### R29（P2）—— 新写的错误条硬编码中文，未走 i18n

`app-shell.tsx:98` 与 `:103`：

```jsx
<span>数据加载失败，技能与目标可能为空。请重试。</span>
...
  重试
```

**为什么这是缺陷，不是风格问题**：

- 应用**真的支持英文**：`core/i18n/locale.ts:1` `supportedLocales = ["zh-CN", "en-US"]`，locale 来自系统（`i18n-provider.tsx:12` 调 `window.skillsManager.getLocale()`）。英文系统用户看到的是**全英文界面 + 一条中文报错**。
- 同一个目录的 `app-sidebar.tsx:2,30` 就用 `useTranslation`；`resources.ts` 里 zh/en 成对维护。
- 反证：这轮**为 R27 专门加了 i18n key**（`targetPreferenceSyncFailedStatus`），却没给这条新 UI 加 key——同一批改动内部标准不一致。
- `AGENTS.md` UI 指南明确写着「使用已有 i18n 资源，不要把新 UI 文案散落在组件内部」。

**修法**：`shell.dataLoadFailed` / `shell.retry` 两个 key（zh/en），组件里改用 `useTranslation`。

### R30（P2）—— R18 只修了「两侧接口都缺失」，单侧缺失仍静默 `ready`

`data-store.ts:100`：`const interfaceUnavailable = !skillsResult && !targetsResult;`

探针实测：

```
[PROBE] only listSkills → status = ready      ← 只有 listSkills 时，技能有数据、目标静默为空，且 status=ready 永久短路
[PROBE] no api          → status = error      ← 两侧都缺才判 error
```

**后果**：接口演进/部分可用（例如新增或改动 `listTargets` 而 `listSkills` 正常，或反之）时，仍会走 r6 判为 P1 的那条老路——**一次空结果被固化成永久 `ready`，不报错、不重试**。R18 声称闭环，实际只覆盖了最极端的一种。

**顺带一条同分支事实**：`interfaceUnavailable` 分支会把 `skills` / `registeredTargets` **清成 `[]`**（`:102-103`）。也就是说这个"接口缺失"路径会主动抹掉桶里已有数据。catch 分支不抹（保留旧数据），两者行为不一致。

**修法建议**：把判定改成"逐项判定"——某一项接口缺失时保留该项已有数据、并至少保证不被固化为 `ready`。

### R31（P3）—— R23 的修复是「只写不读」的死字段，UI 行为与修复前完全一致

§8.7 的结论是「R23 真正的根因（enabled 数据丢失）已由 R24 的 `adaptTargetOption` 保留修复」。核对结果：

```
渲染侧对 TargetOption 的偏好读取点，只有一处：
  skills-page-data.ts:32 → target.skillPreferenceIds.includes(skill.id)     ← 仍是「偏好行存在」
而新加的 target.skillPreferences（skill-data.ts:64）→ 零读取方（grep 全仓实测）
```

所以：`TargetOption` 现在同时挂着 `skillPreferenceIds: string[]` 和 `skillPreferences: {id, enabled}[]`（同一份数据的两种表示），而**能区分"停用/启用"的那个字段没有任何消费者**。R23 声称的 UI 效果，实际不存在。

**要么**把 sider 的过滤/展示真的接上 `skillPreferences`，**要么**删掉这个字段、把 R23 明确标为「按 UX 优先保留现状、不修」。

### R32（P2）—— 这批 11 条修复新增测试 0 个；新写的错误 UI 完全没有断言

实测（不用跑变异，静态即可证明）：

| 检查 | 结果 |
| --- | --- |
| 改动文件里是否含 `.test.*` | **0 个**（见 §0 表） |
| 测试引用 R27 的 `targetPreferenceSyncFailedStatus` | **0 命中** |
| 测试引用 `hasLoadedTargets`（R16） | **0 命中** |
| 测试断言错误条 / 重试按钮（R28、R29） | **0 命中**（`app-shell.test.tsx` 11 个用例全是布局/徽标/版本相关） |

**为什么这条是重要而非洁癖**：r6 §6 第 11 条建议「给 `stores/data-store.ts` 建专属单测」，这一版仍然没有；而 r6 §2.4 的变异实验已经证明过——**这批 store 逻辑的既有修复全都没有牙**（摘掉代码测试照样全绿）。同一模式再叠 11 条，下一次改动会静默回退：

- 错误条是新写的 UI，改了没人知道；
- R18/R30 的 `status` 分支只在特定 mock 下才走到，没有测试就等于没有契约；
- R25/R26 是**性能优化**（少发 IPC、少换引用），一旦被"顺手简化"回去，功能测试全绿、只有性能退化——这类回归必须靠单测锁住（探针写法可直接搬成用例）。

**建议**：新增 `apps/desktop/src/renderer/stores/data-store.test.ts`，至少覆盖 4 条——`loadSharedPageData` 的三态（就绪空 / 单侧缺失 / 双侧缺失）、`applySkillTargetsResult` 刷徽标、`setRegisteredTargets` 的徽标门禁（同引用 / 同 id 内容变 / id 增删三例）、`pruneSkillTargets` 引用复用。本报告 §3 的探针脚本已经把这些场景验证过一遍，直接改写成断言即可。

---

## 3. 验证记录（可复现）

### 3.1 类型与测试

| 检查 | 结果 |
| --- | --- |
| `tsc -p tsconfig.renderer.json --noEmit` | **EXIT=0** |
| `tsc -p tsconfig.main.json --noEmit` | **EXIT=0** |
| 6 个受影响测试文件（`--fileParallelism=false`） | **Test Files 6 passed / Tests 117 passed / 1 skipped**，与 r6 一致，无新增失败 |

### 3.2 探针实测（脚本已删）

```js
[PROBE] only listSkills → status = ready                     ← R30
[PROBE] no api          → status = error, skills = 0
[PROBE] status after failure = error → after refresh = ready  ← R18/R28 重试链路成立
[PROBE] badgeCalls after applySkillTargetsResult = 1          ← R17
[PROBE] badgeCalls 同引用 1→1 / 同 id 且 enabled 翻转 1→1 / 新增 id → 2   ← R25
[PROBE] t1 翻为 disabled 后 skills[0].targets = []            ← 裁剪仍生效
[PROBE] skills 引用在无需裁剪后是否变化 = false                 ← R26
```

### 3.3 未做

- **未跑真实 Electron**：`app-shell.tsx` 错误条是**在共享滚动容器 `<main>` 内、`{children}` 之前**插入的普通流元素（`:89-107`），出错时会把页面内容整体下推约一行高度。是否观感可接受需真机看，但这是错误态、非阻断项，本轮不列为问题。
- **未跑 DB 用例**：`better-sqlite3` ABI 145(Electron) vs 137(Node)，既有技术债。R24 的落库语义改用**直读 `main/ipc/skills.ts`** 核对，未执行。

---

## 4. 遗留（你已明确跳过，仅记录状态未变）

| 项 | 现状 |
| --- | --- |
| R22 切未访问 Tab 首帧空白 | `keep-alive-pages.tsx:64-66` 仍是 `mountedRouteIds.has(routeId)`，**未修**（需真机） |
| R19 「保留滚动位置」注释不成立 | `keep-alive-pages.tsx:36-38` 注释未改，滚动容器仍是共享 `<main>`，**未修**（需真机） |
| R9 Settings 重建库后桶未重置 | 跳过 |

---

## 5. 本轮文件与清理

- 报告：`2026-09-18-dev-zustand-review-r7.md`（本文件）
- 探针 `apps/desktop/src/renderer/stores/r7-probe.test.ts`：**已删除**（`node -e fs.unlinkSync`）
- 中间日志：`tmp-r7-tsc-renderer.log`、`tmp-r7-tsc-main.log`、`tmp-r7-tests.log`、`tmp-r7-probe.log`（仓根，`.log` 已 gitignore；报告内已含原文）
- **业务代码一行未动，未 commit。** 工作区仍是 `dev-zustand` 未提交状态。

---

## 8. 修复落实（R29 / R30 / R31 / R32，用户指令「继续修。」）

用户要求修 r7 新发现的 4 条（R19/R22 按既定约定跳过，需真机）。全部落在 renderer，未 commit / 未 push。

### 8.1 代码改动

- **R29（错误条 i18n）**：
  - `i18n/resources.ts` 在 `shell:` 组新增 `dataLoadFailed`（zh：数据加载失败，技能与目标可能为空。请重试。 / en：Failed to load data. Skills and targets may be empty. Please retry.）与 `retry`（zh：重试 / en：Retry）。
  - `features/shell/app-shell.tsx`：加 `import { useTranslation } from "react-i18next"` + `const { t } = useTranslation()`；错误条文案与重试按钮改为 `t("shell.dataLoadFailed")` / `t("shell.retry")`。消除「全英文界面 + 中文报错」的不一致。

- **R30（status 逐项判定）**：
  - `stores/data-store.ts` 把 `const interfaceUnavailable = !skillsResult && !targetsResult;` 改为逐项判定：
    ```ts
    const skillsUnavailable = !skillsResult;
    const targetsUnavailable = !targetsResult;
    const anyUnavailable = skillsUnavailable || targetsUnavailable;
    set({
      skills: skillsUnavailable ? get().skills : (skillsResult?.skills ?? []).map(adaptSkillRecord),
      registeredTargets: targetsUnavailable ? get().registeredTargets : (targetsResult?.registeredTargets ?? []),
      status: anyUnavailable ? "error" : "ready"
    });
    ```
  - 行为变化：单侧接口缺失时**保留该项已有桶数据**（不再清 `[]`），且 `status` 正确置 `error`（不再静默 `ready`）；与 catch 分支「保留旧数据」语义对齐。R18 的那条老路（单侧缺失固化为 ready）闭环。

- **R31（删除死字段 `skillPreferences`）**：
  - `stores/skill-data.ts`：从 `TargetOption` 类型删 `skillPreferences: { id: string; enabled: boolean }[]`；`adaptTargetOption` 删对应 `skillPreferences: record.skillPreferences.map(...)` 映射行。
  - `data-store.ts` 内 R24 写 `enabled` 的本地逻辑未动（R24 已与主进程落库对齐，是有效修复）。删除后 `TargetOption` 只保留「偏好行存在」的 `skillPreferenceIds`（R23 的 UX 取舍：保留可重新勾选、不隐藏启用项），不再挂着零消费者的「只写不读」字段。

- **R32（新增 store 专属单测）**：
  - 新增 `stores/data-store.test.ts`（9 用例）：`loadSharedPageData` 三态（双侧缺失→error / 单侧缺失→error 且保留另一侧数据 / 双侧就绪→ready）、`applySkillTargetsResult` 调 1 次 `getNavigationBadgeCounts`、`setRegisteredTargets` 徽标门禁（同引用→不刷 / 同 id 内容变→不刷 / 新增 id→刷 1 次）、`pruneSkillTargets` 引用复用（无裁剪→同引用 / 需裁剪→新引用并去缺失）。fixture 用 `makeSkill`/`makeTarget`；`window.skillsManager` mock + `beforeEach` `reset()`。把 §3.2 探针直接改写成断言。

### 8.2 验证

| 检查 | 结果 |
| --- | --- |
| `tsc -p tsconfig.renderer.json --noEmit` | **EXIT=0** |
| `tsc -p tsconfig.main.json --noEmit` | **EXIT=0** |
| 7 受影响测试文件（`--fileParallelism=false`，含新 `data-store.test.ts`） | **Test Files 7 passed / Tests 126 passed / 1 skipped**，无新增失败（新文件贡献 9 passed） |
| `act(...)` 警告 | 既有 worker 噪音，非失败 |

- 修复前阻塞点：测试 fixture `makeSkill` 用了非法字面量 `"detected"`（`SkillApiStatus` 仅 `"ready" \| "review" \| "installed"`），已改为 `"installed"`；`makeTarget` 的 `"registered"` 在 `RegisteredTargetStatus` 合法范围内，无需改。
- 未 commit / push（用户未要求）。R19/R22 仍跳过（需真机）。
