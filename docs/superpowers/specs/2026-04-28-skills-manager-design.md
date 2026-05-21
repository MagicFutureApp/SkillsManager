# Skills Manager 设计

日期：2026-04-28

## 1. 目标

构建一个以桌面端优先的个人技能管理器，用于：

- 从多个 Git 提供商和技能市场聚合技能
- 建模 `repo -> 多个 skill unit`
- 将选中的技能分发到多个 agent 目标
- 使用本地优先的存储和执行方式
- 保持数据模型可扩展，以支持未来的团队/共享版本

v1 桌面端技术栈为：

- Electron
- React
- TypeScript
- Vite
- SQLite
- 系统 `git`

v1 有意不引入 Rust，以便在当前团队技能结构下优化实现速度和可维护性。

## 2. 产品定位

v1 是个人本地工具，不是共享团队平台。

这意味着：

- 所有数据都存储在本地
- Git 认证委托给系统环境
- 同步由用户手动触发
- 安装和分发都在本机执行

## 3. 核心需求

### 3.1 支持的来源

v1 必须支持以下来源类型：

- GitHub 仓库
- GitLab 仓库
- Gitea 仓库
- Bitbucket 仓库
- 本地 Git 仓库
- `skills.sh` 市场

这些来源彼此独立。产品不假设同一个仓库会在多个提供商之间镜像。

### 3.2 支持的目标

v1 必须支持以下 agent 目标：

- Codex
- Claude Code
- Gemini CLI
- 自定义目录

目标分为两类：

- 基于约定的目标，具有预期的技能目录
- 由用户直接配置的显式路径目标

### 3.3 版本控制

默认安装锁定方式是固定的 `commit_sha`。

UI 可以显示分支、标签或发布版本信息，但每个已安装实例都必须解析到精确的 commit，以支持可复现、审计和回滚。

### 3.4 同步行为

v1 只使用手动同步。

架构必须保留以后添加可选启动检查或定时检查的能力，但这些行为不属于默认 v1 范围。

## 4. 技能发现模型

规范单元是 `skill unit`，而不是仓库。

一个仓库可以包含零个、一个或多个 skill unit。

### 4.1 双发现策略

v1 使用双发现策略：

1. 优先解析 manifest
2. 基于约定的兜底扫描

### 4.2 Manifest 优先

如果仓库包含受支持的 manifest，则从 manifest 声明创建 skill unit。

初始 manifest 建议：

```json
{
  "id": "prompt-engineering/basic",
  "name": "Prompt Engineering Basic",
  "version": "0.1.0",
  "entry": "skills/prompt-engineering/basic/SKILL.md",
  "description": "Basic prompt engineering patterns",
  "tags": ["prompt", "writing"],
  "agentCompatibility": ["codex", "claude-code", "gemini-cli"]
}
```

v1 的 manifest 支持从每个技能根目录一个 manifest 文件开始。

仓库级索引 manifest 是未来可能的扩展，但不属于 v1 范围。

内部标准化输出必须始终使用同一个 `skill unit` 模型。

### 4.3 基于约定的兜底扫描

如果不存在 manifest，扫描器会尝试从常见布局中推断 skill unit，例如：

- `**/SKILL.md`
- `skills/*/SKILL.md`
- `.codex/skills/*/SKILL.md`
- `agents/skills/*/SKILL.md`

兜底推断规则：

- 包含 `SKILL.md` 的目录就是技能根目录
- 文件夹名成为默认 id/name 的种子
- 附近的元数据文件可以补充记录信息
- 有歧义的结果会标记为需要复核

## 5. 架构

实现采用 Electron，并使用分层的本地引擎设计。

### 5.1 高层分层

- `renderer`：UI、状态展示、用户操作
- `main`：Electron 生命周期、IPC 边界、任务编排入口
- `core`：业务逻辑，设计上尽量与 Electron 解耦
- `db`：SQLite schema 和 repository/query 层
- `adapters`：来源适配器和目标适配器
- `workers/tasks`：长时间运行的操作，例如同步、扫描、计划、安装

### 5.2 设计原则

- UI 不得直接访问 Git 或文件系统操作
- 所有会改变状态的操作都必须穿过 IPC 边界
- 业务逻辑应保持足够可移植，以便以后提取为独立服务
- 同步和分发操作必须先生成计划，再执行

## 6. 数据模型

### 6.1 必需实体

- `sources`
- `repositories`
- `skill_units`
- `skill_versions`
- `agent_targets`
- `install_instances`
- `distribution_plans`
- `distribution_plan_items`
- `sync_runs`
- `app_settings`

### 6.2 实体意图

`sources`
- 标识来源类型和来源配置

`repositories`
- 记录仓库来源、本地缓存路径、分支元数据和最后扫描的 commit

`skill_units`
- 表示仓库中的一个可分发技能

`skill_versions`
- 表示已解析的可安装版本；v1 将安装解析到 commit sha

`agent_targets`
- 存储目标类型、目标路径/配置和默认安装策略

`install_instances`
- 记录哪个技能版本以何种方式安装到了哪个目标和位置

`distribution_plans`
- 存储一次安装、更新或卸载操作的执行计划

`distribution_plan_items`
- 存储计划中的每一个可执行条目

`sync_runs`
- 存储仓库同步和扫描操作的执行历史

`app_settings`
- 存储本地配置，以及为未来预留的 profile/policy 控制项

## 7. 来源处理

v1 使用系统 Git 和现有系统凭据。

应用不管理提供商登录状态或 token。

预期行为：

- 使用本地 `git` 可执行文件
- 复用 SSH key、HTTPS credential helper、OS keychain 集成或现有 CLI 登录状态
- 在认证失败时展示诊断信息
- 不尝试应用内 OAuth 或 token 存储

这可以降低本地优先个人工具的安全范围和实现复杂度。

## 8. 同步流程

手动同步流程：

1. 用户触发同步
2. 创建 `sync_run`
3. 如果本地缓存不存在，则 clone
4. 否则 fetch 并检查仓库状态
5. 如果目标分支 HEAD commit 没有变化，默认跳过完整重新扫描，除非用户明确请求强制重新扫描
6. 扫描仓库中的 skill unit
7. 标准化并写入索引结果
8. 计算同步摘要
9. 在 UI 中展示新增、移除、变更和有歧义的结果

摘要至少应包含：

- 新增的 skill unit
- 移除的 skill unit
- 元数据变更
- 入口路径变更
- 扫描警告

## 9. 分发流程

所有分发操作都必须先计划、再执行。

### 9.1 计划

1. 用户选择 skill unit
2. 用户选择目标 agent 或者当前机器的文件目录，支持多选。
3. 系统解析期望的固定 commit 版本
4. planner 计算每个目标的操作
5. planner 将每个条目分类为 install、update、skip、conflict 或 remove
6. UI 展示 dry-run 预览

### 9.2 执行

1. 用户确认计划
2. executor 执行每个计划条目
3. 安装策略默认使用 `symlink`
4. 如果 symlink 失败，则回退到 `copy`
5. 结果写入 `install_instances`
6. UI 展示成功、失败和恢复细节

### 9.3 为什么计划是一等概念

必须采用计划优先的执行方式，因为主要产品风险不只是安装失败，还包括意外覆盖、目标污染或隐藏的版本漂移。

一等计划也为以下能力保留清晰的升级路径：

- 团队审批
- 策略校验
- 审计重放
- 已保存的发布模板

## 10. 推荐项目结构

```text
src/
  main/
    index.ts
    ipc/
      sources.ts
      repositories.ts
      skills.ts
      distribution.ts
      targets.ts
      settings.ts

  renderer/
    app/
    pages/
    components/
    features/
      sources/
      repositories/
      skills/
      distribution/
      targets/
      settings/
    stores/

  core/
    domain/
    services/
    adapters/
      sources/
      targets/
    scanning/
    git/
    planner/
    installer/
    tasks/

  db/
    schema.ts
    client.ts
    repositories/
```

## 11. v1 UI 范围

v1 应保持紧凑，并聚焦五个主要区域：

- `Sources`
- `Repositories`
- `Skills`
- `Targets`
- `Distribution`

这足以验证核心循环，同时避免过早扩展到低价值的复杂设置。

## 12. v1 范围裁剪

以下内容明确不属于 v1 范围：

- 应用内 OAuth 或 token 管理
- 持续后台同步
- webhook 或深度提供商 API 集成
- 共享远程数据库
- 技能之间的复杂依赖解析
- 在线技能编辑
- 跨机器安装状态同步
- 完整团队权限系统

## 13. 实现方案

- Electron 桌面壳
- React + TypeScript 前端
- 本地 SQLite 持久化
- 与 Electron 专用代码分离的 TypeScript core engine

## 14. 风险与缓解

### 14.1 仓库多样性

风险：
- 非标准仓库布局会产生嘈杂的扫描结果

缓解：
- 双发现模型
- 显式歧义标记
- 标准化内部模型

### 14.2 凭据差异

风险：
- 系统 Git 认证在不同机器上表现不同

缓解：
- 将认证委托给现有环境
- 保持诊断信息可操作
- v1 不承担登录问题

### 14.3 目标路径安全

风险：
- 错误的安装路径或覆盖行为可能损坏本地 agent 配置

缓解：
- 计划优先执行
- dry-run 预览
- 安装策略可见
- 安装实例跟踪

### 14.4 范围膨胀

风险：
- 团队平台诉求渗入 v1，延迟交付

缓解：
- 本地优先的产品定位
- 明确的 v1 排除项
- 可扩展但默认休眠的团队导向 schema 字段

## 15. 成功标准

如果用户能够完成以下操作，则 v1 可视为成功：

- 注册所有目标来源类别的仓库
- 手动同步仓库
- 从一个仓库中发现多个 skill unit
- 在一个统一的本地注册表中浏览技能
- 配置 Codex、Claude Code、Gemini CLI 和自定义目标
- 预览分发计划
- 将选中的 skill unit 安装到一个或多个目标，并记录 commit 锁定信息
- 检查结果，并从常见路径或凭据失败中恢复
