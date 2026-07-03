# Agent Instructions

本文件面向在此仓库工作的 AI coding agent。它是给 agent 的项目 README：优先写清楚项目事实、可执行命令、架构边界、验证方式和禁止事项，避免泛泛而谈。

## 项目概览

Skills Manager 是一个本地优先的桌面应用，用于管理 agent 技能。产品目标是从 Git 提供商和技能市场聚合 `skill unit`，在本地建立索引，并把选中的技能分发到 Codex、Claude Code、Gemini CLI 或自定义目录等 agent 目标。

当前实现和技术栈以 `package.json` 与 `src/` 为准：

- Electron main/preload：`src/main`
- React renderer：`src/renderer`
- 可移植业务逻辑：`src/core`
- SQLite/Drizzle 数据层：`src/db`
- 构建与验证：TypeScript 6、Vite 8、Vitest、Prettier、pnpm
- 数据库访问：Drizzle ORM、`better-sqlite3`、`drizzle-kit`
- 系统 Git：由 main process 调用，认证委托给用户系统 Git 环境

## 常用命令

优先使用 `pnpm`。当前 `package.json` 中可用脚本包括：

```bash
pnpm run dev
pnpm run electron:version
pnpm run build:main
pnpm run build:renderer
pnpm run build
pnpm run check
pnpm test
pnpm run db:generate
pnpm run db:check
pnpm run format
pnpm run format:check
```

常用验证组合：

- 文档或说明性变更：至少运行 `git diff --check -- <changed-file>`。
- TypeScript 类型或 IPC/API 变更：运行 `pnpm run check`。
- Main process 变更：运行 `pnpm run build:main`，并补充相关 `pnpm test <path>`。
- Renderer 页面或交互变更：运行相关 Vitest 页面测试；涉及真实桌面行为时使用 Electron 应用验证，不要只启动独立 Vite 网站。
- 数据库 schema 或 repository 变更：运行相关 `src/db/repositories/*.test.ts`，必要时运行 `pnpm run db:generate` 或 `pnpm run db:check`。
- 收尾前如改了 `src/` 或配置文件，运行最窄但足够证明结果的检查；不要为了小改动盲目跑全量慢命令。

## 信息来源

做架构、范围或实现顺序决策前，优先阅读：

- `README.md`：项目简述和本地 native dependency 注意事项。
- `package.json`：当前脚本、依赖和真实版本。
- `docs/superpowers/specs/2026-07-02-copy-only-distribution-design.md`：copy-only 分发、最近一次同步状态、旧 dry-run/sync history 移除后的当前设计。分发相关内容以此为准。
- `docs/superpowers/specs/2026-04-28-skills-manager-design.md`：产品范围、架构和 v1 排除项。若分发章节与 2026-07-02 文档冲突，以 2026-07-02 文档为准。
- `docs/superpowers/specs/2026-04-28-skills-manager-data-model-explanation.md`：实体意图和数据模型边界。若仍出现旧 `distribution_plans`、`distribution_plan_items` 或 `sync_runs` 表述，以当前 code 和 copy-only 文档为准。
- `docs/superpowers/plans/2026-05-22-skills-manager-initialization.md`：初始化阶段历史计划。
- `docs/superpowers/plans/2026-07-02-copy-only-distribution-implementation.md`：copy-only 分发实现计划和当前任务级检查点。

如果 docs 与代码不一致，先检查当前代码，再更新相关 docs 或在最终回复中明确说明差异。

## 工作规则

- 默认工作语言为中文；代码、命令、API 名称、错误信息和已有英文术语按原文保留。
- 开始改动前先查看 `git status --short` 和相关文件 diff，确认哪些是用户已有改动。
- 不要覆盖、回滚或重排用户已有改动。只在任务要求的范围内编辑。
- 变更应小步推进，并尽量对齐 `docs/superpowers/plans` 中的任务级计划。
- 不要跳到后续产品区域，除非用户明确要求。
- 保持 v1 的本地优先范围。
- 优先遵循现有项目约定，不要引入不必要的新结构。
- 能抽成共通函数的逻辑必须抽成共通函数；已有对应函数或方法时必须复用，不要新增重复实现。
- 使用 TypeScript，并保持边界清晰。
- 使用 Prettier 格式化，不要手动大面积调整格式。
- 避免无关重构、命名 churn 和纯风格性改写。
- 安装任何新包前先确认确实需要；安装时默认使用最新稳定版本。只有在 Electron、Vite、TypeScript、Node.js 或现有依赖存在兼容性问题时，才选择较旧版本，并在回复中说明原因。
- 不要提交 commit，除非用户明确要求，或当前已批准的计划步骤明确要求提交。

## 架构规则

- Renderer 代码不得直接访问 Git、SQLite、Node 文件系统或操作系统命令。
- 会改变状态的操作必须经过类型化 preload/IPC 边界。
- Electron 专属代码保留在 `src/main`，包括窗口生命周期、系统 Git、文件复制、路径安全检查、SQLite 写入和外部 URL/目录打开。
- Renderer 页面和状态逻辑放在 `src/renderer`，通过 `window.skillsManager` 调用类型化 API。
- 可移植业务逻辑尽量放在 `src/core`，避免依赖 Electron。
- 数据库 schema、client、migration 和 query/repository helper 放在 `src/db`。
- Drizzle schema 是 SQLite 结构的 TypeScript 单一事实来源；如果改 schema，同时检查 `src/db/client.ts` 的 bootstrap SQL、repository 测试和 migration。
- Main IPC 层负责把 renderer 意图转成受控的文件系统、Git 和数据库操作；renderer 不能绕过 IPC 自己执行。
- Good：renderer 调用 `window.skillsManager.previewDistribution(...)`。
- Bad：renderer 里 `import fs from "node:fs"` 或直接打开 SQLite。

## 产品规则

- 标准业务单元是 `skill unit`，不是 repository。
- 一个 repository 可以包含零个、一个或多个 `skill unit`。
- 当前扫描以约定式 `SKILL.md` 为主；扩展 manifest 支持时，必须仍输出同一套 `skill unit` 模型，并保留 `SKILL.md` 回退。
- 扫描本地项目目录时，不要把依赖或构建目录当作技能来源，例如 `node_modules`、`vendor`、`.venv`、`target`、`.terraform`、`dist-packages`。
- 分发必须解析到精确 `commit_sha`，以支持可复现和审计。
- 分发执行统一使用 copy，不支持 symlink、hardlink 或 junction。
- 分发预览是一次性计算结果，不写入持久化 plan 表。
- Renderer 只能发起预览、确认和设置意图；实际文件写入、覆盖冲突处理、路径安全检查和 `install_instances` 写入必须在 main process 的类型化 IPC 后完成。
- v1 来源同步默认手动；用户可在 Settings 中选择同步完成后自动分发到已设置目标。
- 自动分发只覆盖已有 enabled target preference 的 skills，不为没有目标设置的 skills 猜测目标。
- v1 不包含应用内 OAuth、后台同步、webhook、共享远程数据库、团队权限、在线技能编辑或跨机器安装状态同步。
- 不要重新引入独立 `Distribution` 页面、`Sync History` 页面、持久化 dry-run plan 或 `sync_runs` 模型。

## 数据模型边界

一致使用以下含义：

- `sources`：GitHub、GitLab、Gitea、Bitbucket、本地 Git 或 `skills.sh` 等来源配置。
- `repositories`：本地仓库缓存、同步状态和扫描状态。
- `skill_units`：可发现、可安装的技能。
- `skill_versions`：锁定到 commit 的可安装快照。
- `agent_targets`：Codex、Claude Code、Gemini CLI 或自定义目录等安装目标。
- `skill_target_preferences`：用户期望的技能到目标选择；不代表已经安装成功。
- `install_instances`：分发执行后的当前事实记录。
- `repositories.last_sync_*`：仓库最近一次同步和扫描状态，包括 added/changed/removed 的具体 skill 摘要及分发摘要。
- `app_settings`：本地应用设置，例如 `autoDistributeOnSync`。

不要把 `skill_target_preferences` 当成安装事实；安装状态以 `install_instances` 为准。删除 target 时不要删除历史安装事实，除非设计文档和用户请求明确改变该语义。

## 当前代码结构

- `src/main/index.ts`：Electron app 生命周期和 IPC 注册入口。
- `src/main/preload.ts`：暴露给 renderer 的类型化桥。
- `src/main/ipc/*`：main process IPC handlers。
- `src/core/skills/*`：skill 扫描和 key 生成。
- `src/core/repositories/*`：repository API、source inspection 和路径/配置工具。
- `src/core/distribution/*`：copy-only 分发预览和执行类型。
- `src/core/targets/*`：agent target 扫描和工具函数。
- `src/db/schema.ts`：Drizzle schema。
- `src/db/client.ts`：SQLite client 和新项目 schema bootstrap。
- `src/db/repositories/*`：数据库 repository/query 层。
- `src/renderer/app/*`：路由配置。
- `src/renderer/features/*`：按页面划分的 UI、state hooks 和组件。
- `src/renderer/components/ui/*`：本地 UI 基础组件。
- `docs/superpowers/specs/*` 和 `docs/superpowers/plans/*`：产品设计与实施计划。

## 实现流程

1. 先确认当前 worktree 状态和相关文件上下文。
2. 读相关 docs 和当前代码；当前代码优先于旧文档。
3. 对行为变更、IPC/API、数据库和 UI 交互，优先写或更新能失败的测试，再实现。
4. 做最小可用改动，复用现有 helper、repository、组件和 i18n 结构。
5. 如果变更跨 `core`、`main`、`db`、`renderer` 边界，同步更新类型、preload/global 声明和测试 fixture。
6. 运行最窄相关验证命令。
7. 最终回复中说明改了什么、验证了什么、哪些命令因环境限制未运行。

当前初始化和 copy-only 实施计划使用任务级检查点。执行这些计划时：

1. 只完成当前任务。
2. 更新该任务 checklist。
3. 运行该任务列出的验证命令。
4. 清楚报告验证结果。
5. 当计划要求停止时，等待用户确认后再进入下一个任务。

## 测试与验证

- 单元和集成测试使用 Vitest，测试文件通常与实现文件同区域并以 `.test.ts` 或 `.test.tsx` 结尾。
- 数据层变更优先跑对应 `src/db/repositories/*.test.ts`。
- IPC 变更优先跑对应 `src/main/ipc/*.test.ts`。
- Renderer 状态和页面变更优先跑对应 `src/renderer/features/**/*.test.tsx`。
- 跨层类型变更跑 `pnpm run check`。
- main process 构建问题跑 `pnpm run build:main`。
- UI 或端到端行为需要真实 Electron 验证时，使用 `pnpm run dev` 启动 Electron 应用，不要用独立 Vite 页面替代。
- 如果 native dependency 或 pnpm no-TTY preflight 阻塞验证，记录具体错误，并在可能时用等价的底层 `tsc` 或 targeted Vitest 命令补充证明。

## UI 指南

- 构建桌面工具界面，而不是营销页面。
- 优先支持信息密度、可读性和重复操作效率。
- v1 主要区域是 `Sources`、`Repositories`、`Skills`、`Targets`、`Settings`；当前路由以 `src/renderer/app/route-config.ts` 为准。
- 视觉风格保持克制，符合本地工作工具定位。
- 所有用到的组件，先去 shadcn/base-ui 找一找，尽量使用现成组件，必要时稍微调整样式，但不要大幅改动结构或交互。参考：https://base-ui.com/llms.txt
- 样式中的数字单位尽量使用 shadcn/Tailwind v4 的主题化格式，例如 `w-23`、`gap-3`、`rounded-xl`；只有在需要精确像素、外部规格对齐或主题格式无法表达时，才使用 `w-[92px]` 这类 arbitrary value。
- 使用已有 i18n 资源，不要把新 UI 文案散落在组件内部，除非当前文件已有同样模式。
- Copy-only 分发文案避免 `dry-run`、`plan`、`计划`；使用 `预览分发`、`分发`、`分发结果`。

## Git 与安全边界

- 不要执行破坏性 Git 或文件系统操作，除非用户明确要求并确认范围。
- 不要提交、push、切分支或清理未跟踪文件，除非用户明确要求。
- 不要提交 secrets、tokens、真实凭据或本机私有路径样例。
- v1 不在应用内存储 Git 凭据或 provider token；Git 认证委托系统 Git。
- 对会写入用户目录、目标目录或缓存目录的操作，必须在 main process 做路径规范化和安全检查。
