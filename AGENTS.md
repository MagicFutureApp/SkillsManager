# Agent Instructions

本文件面向在此仓库工作的 AI coding agent。

## 项目概览

Skills Manager 是一个本地优先的桌面应用，用于管理 agent 技能。产品目标是从 Git 提供商和技能市场聚合 skill unit，在本地建立索引，并把选中的技能分发到 Codex、Claude Code、Gemini CLI 或自定义目录等 agent 目标。

当前基线：

- Electron main process 位于 `src/main`
- 通过 `tsconfig.main.json` 构建 TypeScript 6 main process
- 已配置 Prettier
- pnpm workspace 使用 hoisted node linker
- 设计文档和初始化计划位于 `docs/superpowers`

docs 中规划的 v1 技术栈：

- Electron
- React
- TypeScript
- Vite
- SQLite
- Drizzle ORM
- `better-sqlite3`
- `drizzle-kit`
- 系统 `git`

## 信息来源

做架构、范围或实现顺序决策前，优先阅读：

- `README.md`：项目简述。
- `docs/superpowers/specs/2026-04-28-skills-manager-design.md`：产品范围、架构和 v1 排除项。
- `docs/superpowers/specs/2026-04-28-skills-manager-data-model-explanation.md`：实体意图和数据模型边界。
- `docs/superpowers/plans/2026-05-22-skills-manager-initialization.md`：当前分阶段初始化实现计划。

如果 docs 与代码不一致，先检查当前代码，再更新相关 docs 或在最终回复中明确说明差异。

## 工作规则

- 默认工作语言为中文；代码、命令、API 名称、错误信息和已有英文术语按原文保留。
- 变更应小步推进，并尽量对齐 `docs/superpowers/plans` 中的阶段计划。
- 不要跳到后续产品区域，除非用户明确要求。
- 保持 v1 的本地优先范围。
- 优先遵循现有项目约定，不要引入不必要的新结构。
- 使用 TypeScript，并保持边界清晰。
- 使用 `pnpm` 执行依赖和脚本命令。
- 安装任何新包时默认使用最新稳定版本；只有在 Electron、Vite、TypeScript、Node.js 或现有依赖存在兼容性问题时，才选择较旧版本，并在回复中说明原因。
- 使用 Prettier 格式化，不要手动大面积调整格式。
- 避免无关重构。
- 不要覆盖用户已有改动。
- 不要提交 commit，除非用户明确要求，或当前已批准的计划步骤要求提交。

## 架构规则

- Renderer 代码不得直接访问 Git、SQLite 或文件系统。
- 会改变状态的操作必须经过类型化 IPC 边界。
- Electron 专属代码保留在 `src/main`。
- 后续 renderer 代码放在 `src/renderer`。
- 可移植业务逻辑尽量放在 `src/core`。
- 数据库 schema、client、migration 和 query/repository helper 放在 `src/db`。
- Drizzle schema 是 SQLite 结构的 TypeScript 单一事实来源。
- 同步和安装类操作必须先生成计划，再执行文件系统变更。

## 产品规则

- 标准业务单元是 `skill unit`，不是 repository。
- 一个 repository 可以包含零个、一个或多个 skill unit。
- 技能发现应优先解析 manifest，再回退到约定式 `SKILL.md` 扫描。
- 安装必须解析到精确 `commit_sha`，以支持可复现和审计。
- Git 认证委托给用户系统 Git 环境。
- v1 只使用手动同步。
- v1 不包含应用内 OAuth、后台同步、webhook、共享远程数据库、团队权限、在线技能编辑或跨机器安装状态同步。

## 数据模型边界

一致使用以下含义：

- `sources`：GitHub、GitLab、Gitea、Bitbucket、本地 Git 或 `skills.sh` 等来源配置。
- `repositories`：本地仓库缓存、同步状态和扫描状态。
- `skill_units`：可发现、可安装的技能。
- `skill_versions`：锁定到 commit 的可安装快照。
- `agent_targets`：Codex、Claude Code、Gemini CLI 或自定义目录等安装目标。
- `skill_target_preferences`：用户期望的技能到目标选择；不代表已经安装成功。
- `install_instances`：已安装技能版本的事实记录。
- `distribution_plans` 和 `distribution_plan_items`：安装、更新、移除的 dry-run 和执行记录。
- `sync_runs`：仓库同步和扫描历史。
- `app_settings`：本地应用设置。

## 当前命令

当前基线可用验证命令：

```bash
pnpm run format:check
pnpm run check
pnpm run build:main
pnpm run electron:version
```

当前 `package.json` 中已有脚本：

- `pnpm run dev`
- `pnpm run electron:version`
- `pnpm run build:main`
- `pnpm run check`
- `pnpm run format`
- `pnpm run format:check`

每次变更后运行最窄但足够证明结果的验证命令。

## 执行计划纪律

当前初始化计划使用任务级检查点。执行该计划时：

1. 只完成当前任务。
2. 运行该任务列出的验证命令。
3. 清楚报告验证结果。
4. 当计划要求停止时，等待用户确认后再进入下一个任务。

## UI 指南

后续 renderer 工作应遵循：

- 构建桌面工具界面，而不是营销页面。
- 优先支持信息密度、可读性和重复操作效率。
- v1 主要区域是 `Sources`、`Repositories`、`Skills`、`Targets`、`Distribution`。
- 视觉风格保持克制，符合本地工作工具定位。
- 所有用到的组件，先去 shadcn 的 baseUI 找一找，尽量使用现成组件，必要时稍微调整样式，但不要大幅改动结构或交互。这是地址：https://base-ui.com/llms.txt
