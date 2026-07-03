# Copy-Only 分发实现计划

> **给 agentic workers：** 必须使用子技能：推荐使用 superpowers:subagent-driven-development，也可以使用 superpowers:executing-plans，逐个任务执行本计划。步骤使用 checkbox（`- [ ]`）语法跟踪。

**目标：** 实现 copy-only 技能分发，移除持久化 dry-run / 同步历史模型，并支持手动分发以及可选开启的自动分发。

**架构：** main process 负责 Git、文件 copy、冲突处理和 SQLite 写入，并通过类型化 IPC 暴露给 renderer。核心分发逻辑只计算一次性预览和执行摘要，不再写入预览计划。Renderer 在分发时只显示一个确认弹窗，冲突项默认选择覆盖。

**技术栈：** Electron main/preload IPC、React renderer、TypeScript、SQLite/Drizzle、Node 文件系统 API、Vitest、pnpm。

---

## 文件结构

- 修改 `src/db/schema.ts`：移除计划/同步表，移除目标策略字段，添加 repository 同步字段，并在 install 记录中添加 `skillUnitId` 和 `lastError`。
- 修改 `src/db/client.ts`：更新新项目 schema 的 bootstrap SQL。
- 修改 `src/core/repositories/repository-api.ts`：用 repository 最近一次同步摘要替代 sync-run 形态 API，摘要中包含 skill 明细和分发摘要。
- 修改 `src/db/repositories/repositoryRepository.ts`：把同步状态写入 `repositories`，在稳定 skill id 上保留目标偏好，并移除计划/同步清理逻辑。
- 修改 `src/db/repositories/targetRepository.ts`：移除 `defaultInstallStrategy`。
- 修改 `src/core/targets/target-api.ts` 和 `src/core/targets/target-scanner.ts`：移除目标安装策略字段。
- 替换 `src/core/distribution/distribution-api.ts`：定义预览/执行类型、冲突处理选择和 copy-only 摘要。
- 替换 `src/db/repositories/distributionRepository.ts`：提供一次性预览查询和 install-instance 持久化 helper；不再写入预览记录。
- 修改 `src/main/ipc/distribution.ts`：暴露预览和执行 IPC；执行时根据覆盖/跳过的冲突选择执行文件系统 copy。
- 修改 `src/main/ipc/repositories.ts`：同步流程调用 repository 同步状态 API，并按设置可选触发自动分发。
- 修改 `src/main/ipc/settings.ts`：在 `settings:get` 中暴露分发设置，并新增更新 IPC。
- 修改 `src/main/preload.ts` 和 `src/renderer/global.d.ts`：更新类型化 bridge。
- 删除 `src/db/repositories/syncHistoryRepository.ts`、`src/core/repositories/sync-history-api.ts`、`src/main/ipc/sync-history.ts` 和 `src/renderer/features/sync-history/*`。
- 修改 `src/main/index.ts`、`src/main/ipc/navigation-badges.ts`、`src/renderer/app/routes.tsx`、`src/renderer/app/route-config.ts`、`src/renderer/features/shell/shell-navigation.ts` 以及 shell 测试，移除 Sync History / Distribution。
- 修改 `src/renderer/features/settings/settings-page.tsx`：添加自动分发开关。
- 修改 `src/renderer/features/skills/*`：实现预览、单个确认弹窗、冲突默认覆盖和执行结果展示。
- 修改 `src/renderer/features/repositories/*`：从 repository 记录展示最近一次同步和分发摘要。
- 更新 `src/db/repositories`、`src/main/ipc` 和 `src/renderer/features` 下受影响的测试。

## 任务

### 任务 1：Schema 和 Repository 状态

- [x] 在 `src/db/repositories/repositoryRepository.test.ts` 中编写失败测试，证明同步结果会写入 `repositories.lastSync*`，摘要包含 added/changed/removed skill 明细，且未变化 skill id 上的既有目标偏好会在同步后保留。
- [x] 运行 `pnpm test src/db/repositories/repositoryRepository.test.ts`，确认失败原因是缺少新的 schema/API。
- [x] 更新 `src/db/schema.ts`、`src/db/client.ts` 和 `src/core/repositories/repository-api.ts`。
- [x] 更新 `src/db/repositories/repositoryRepository.ts`，upsert 稳定 skill id，只删除已移除的 skills/preferences，并把最近一次同步状态存到 repositories。
- [x] 从 repository 清理流程中移除 `distributionPlanItems`、`distributionPlans` 和 `syncRuns` 引用。
- [x] 运行 `pnpm test src/db/repositories/repositoryRepository.test.ts`。

### 任务 2：Targets 和 Settings 模型

- [x] 在 `src/db/repositories/targetRepository.test.ts`、`src/core/targets/target-scanner.test.ts` 和 `src/main/ipc/settings` 覆盖中编写失败测试，证明 targets 不再暴露策略字段，且 settings 默认 `autoDistributeOnSync` 为 false。
- [x] 运行目标测试并确认出现预期失败。
- [x] 从 core 类型、scanner、target repository、fixtures 和 renderer adapter 中移除目标策略字段。
- [x] 添加 `distribution.autoDistributeOnSync` 的 settings get/update API。
- [x] 运行目标测试。

### 任务 3：Copy-Only 分发 Core 和 IPC

- [x] 在 `src/db/repositories/distributionRepository.test.ts` 中编写失败测试，证明预览不会写入 plan 表，会分类 install/update/skip/conflict/blocked，且 conflict 默认处理选择是 overwrite。
- [x] 在 `src/main/ipc/distribution.test.ts` 中编写失败测试，证明 execute 会 copy 目录，只在用户选择时覆盖冲突，只在用户选择时跳过冲突，并写入 `install_instances`。
- [x] 运行分发目标测试并确认出现预期失败。
- [x] 用一次性预览查询 helper 替换 preview repository 逻辑。
- [x] 实现 execute IPC：测试中注入文件操作，运行时使用 Node `rm`/`cp`。
- [x] 运行分发目标测试。

### 任务 4：带可选自动分发的同步流程

- [x] 在 `src/main/ipc/repositories.test.ts` 中编写失败测试，证明自动分发关闭时 sync 返回可分发数量，开启时执行 copy 分发。
- [x] 运行 repository IPC 测试并确认出现预期失败。
- [x] 将 `syncRepositories` 接入 repository 同步状态 API 和分发 executor。
- [x] 保留本地/Git 缓存 materialization 行为。
- [x] 运行 repository IPC 测试。

### 任务 5：Renderer 导航和 Settings

- [x] 编写失败的 renderer 测试，证明 sidebar 不再显示 Distribution/Sync History 路由，并且 settings 暴露默认关闭的自动分发开关。
- [x] 运行受影响的 renderer 测试并确认出现预期失败。
- [x] 移除 routes、navigation items、preload API、badge counts 以及 sync history 文件/测试。
- [x] 添加 settings switch UI 和类型化 bridge 调用。
- [x] 运行受影响的 renderer 测试。

### 任务 6：Skills 和 Repositories UI

- [x] 为 Skills 页编写失败测试，覆盖预览弹窗文案、分发确认弹窗、冲突默认覆盖、跳过选项和执行结果摘要。
- [x] 为 Repositories 页编写失败测试，覆盖最近一次同步的分发摘要以及具体 added/changed/removed skill 明细。
- [x] 运行受影响的 renderer 测试并确认出现预期失败。
- [x] 更新 Skills 页 state/components，使用 preview/execute API 和单个确认弹窗。
- [x] 更新 Repositories 页 state/components，适配新的同步结果形态。
- [x] 运行受影响的 renderer 测试。

### 任务 7：清理和验证

- [x] 搜索已移除概念：`distribution_plans`、`distribution_plan_items`、`sync_runs`、`default_install_strategy`、`dry-run`、`symlink`、`syncHistory:list` 和过期 route ids。
- [x] 移除或更新容易误导实现的过期 docs 引用，尤其是旧 v1 设计语言。
- [x] 使用本地 `tsc` 命令运行 TypeScript 检查，因为当前环境下 `pnpm run check` 会被 pnpm no-TTY dependency preflight 阻塞。
- [x] 运行本次改动触及的目标 Vitest suites。
- [x] 使用本地 `tsc` 运行 main build，因为 `pnpm run build:main` 会遇到同样的 pnpm preflight。
- [x] 运行 `git diff --check`。
- [x] 对照 `docs/superpowers/specs/2026-07-02-copy-only-distribution-design.md` 审计需求。
