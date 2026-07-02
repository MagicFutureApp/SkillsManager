# Copy-Only Skill Distribution 设计

日期：2026-07-02

## 1. 背景

当前系统的早期设计把分发建模为持久化的 dry-run plan：

- `distribution_plans`
- `distribution_plan_items`
- `sync_runs`
- 目标级 `default_install_strategy`
- symlink 优先、copy 回退

新的产品方向是把技能分发简化为 copy-only：

1. 通过 Git 或本地路径把 Skills 同步到本地缓存目录。
2. 同步扫描后，根据用户在 Skills/Targets 中保存的目标设置，支持手动分发。
3. 设置页提供“同步后自动分发到已设置目标”的开关，默认关闭。
4. Skills 页只保留一次性的分发预览，不再把预览写入数据库。
5. 去掉“同步记录 / dry-run 分发计划 / 持久化分发计划”这整组功能。

本次可以按新项目处理，不考虑旧数据库数据兼容。

## 2. 目标

本设计要完成以下目标：

- 分发方式统一为 copy，不再支持 symlink。
- 删除持久化分发计划模型，只保留即时预览。
- 删除独立同步历史模型，把最近一次同步状态收敛到 repository 当前状态。
- 同步扫描不能清掉用户已经设置的 skill-target 关系。
- 手动分发和自动分发共用同一套 preview/classification/executor 逻辑。
- Renderer 仍然不能直接访问文件系统、Git 或 SQLite。

## 3. 非目标

以下内容不进入本次改造：

- 跨机器安装状态同步。
- 团队审批、发布模板、计划重放。
- 应用内 OAuth。
- 后台定时同步。
- Webhook。
- symlink、hardlink 或 junction 安装方式。
- 完整历史审计页。

## 4. 数据模型

### 4.1 删除表

删除以下表和所有对应 repository/API/UI：

- `distribution_plans`
- `distribution_plan_items`
- `sync_runs`

原因：

- 分发预览不再持久化。
- 分发执行结果以 `install_instances` 的当前事实为准。
- 同步历史页被移除，repository 只需要显示最近一次同步状态。

### 4.2 修改 `repositories`

`repositories` 继续表示来源和本地缓存目录，同时承载最近一次同步状态。

建议字段：

```text
id
provider_id
name
remote_url
local_cache_path
default_branch
last_scanned_commit_sha
last_sync_status: idle | running | success | failed | interrupted
last_sync_started_at
last_sync_finished_at
last_sync_summary_json
last_sync_error_message
last_sync_log_path
config_json
created_at
updated_at
```

`last_sync_summary_json` 保存最近一次同步摘要和受影响 skill 的轻量明细，例如：

```json
{
  "scan": {
    "counts": {
      "added": 2,
      "changed": 3,
      "removed": 1,
      "warnings": 0
    },
    "added": [
      {
        "skillUnitId": "repo-team-skills__review-bot",
        "skillKey": "review-bot",
        "name": "Review Bot",
        "commitSha": "abc123456789"
      }
    ],
    "changed": [
      {
        "skillUnitId": "repo-team-skills__release-notes",
        "skillKey": "release-notes",
        "name": "Release Notes",
        "previousCommitSha": "abc123456789",
        "commitSha": "def456789abc"
      }
    ],
    "removed": [
      {
        "skillUnitId": "repo-team-skills__old-helper",
        "skillKey": "old-helper",
        "name": "Old Helper",
        "previousCommitSha": "abc123456789"
      }
    ],
    "warnings": []
  },
  "distribution": {
    "eligible": 4,
    "installed": 0,
    "updated": 0,
    "skipped": 0,
    "conflicts": 0,
    "failed": 0,
    "autoDistributionEnabled": false
  }
}
```

`scan.added`、`scan.changed`、`scan.removed` 只保存 UI 展示和稳定定位需要的最小字段。其中 `skillUnitId` 是数据库内唯一标识，`skillKey` 是同一 repository 内的稳定业务标识，`name` 用于 UI 显示。summary 不保存完整 `SKILL.md` 内容，不保存 `entryPath`、`rootPath` 或细分 diff 类型。

当自动分发关闭时，`distribution.eligible` 表示本次同步后有多少 skill-target 组合可以手动分发。

### 4.3 修改 `agent_targets`

`agent_targets` 只表示目标身份、路径和启用状态，不再保存安装策略。

删除字段：

- `default_install_strategy`

保留字段：

```text
id
type
name
path
normalized_path
detection_status
scan_message
enabled
scope
created_at
updated_at
```

仍然保留唯一约束：

```text
unique(type, normalized_path)
```

### 4.4 保留 `skill_target_preferences`

`skill_target_preferences` 继续表示用户希望某个 skill unit 分发到哪些目标。

关键要求：

- 同步扫描时，同一个 repository 中同一个 skill key 的 skill unit 必须稳定复用同一个 id。
- 如果 skill 仍存在，则同步不能删除它的 target preference。
- 如果 skill 被移除，可以删除对应 preference，避免 UI 显示无效关系。

这解决当前代码中“重新扫描会删除所有 preferences，导致同步后没有已设置目标可分发”的问题。

### 4.5 修改 `install_instances`

`install_instances` 是分发执行后的当前事实记录。

建议字段：

```text
id
skill_unit_id
skill_version_id
agent_target_id
target_snapshot_json
installed_path
installed_commit_sha
status: installed | failed | removed | conflict
installed_at
updated_at
last_error
```

说明：

- `skill_unit_id` 作为稳定查询入口，避免每次 join `skill_versions` 才能定位 skill-target 状态。
- 不再需要 `install_strategy`，因为唯一策略就是 copy。
- `target_snapshot_json` 保留执行时目标名称、类型、原始路径和规范化路径。
- 删除 target 时不删除历史安装事实；但本次 v1 不展示历史页，只用于当前状态和冲突判断。

### 4.6 修改 `app_settings`

新增设置项：

```text
autoDistributeOnSync: boolean
```

默认值：

```text
false
```

默认关闭的原因：

- copy 会真实写入目标目录。
- 首次同步或目标设置还没整理好时，自动写入风险更高。
- 用户明确打开后，系统才在来源同步后自动分发到已设置目标。

## 5. 分发预览模型

分发预览是一次性计算结果，不写数据库。

输入：

```text
skillUnitIds
triggerSource: skill_detail | skills_bulk | post_sync
```

输出：

```text
summary
items
```

item 字段：

```text
id
skillUnitId
skillName
agentTargetId
targetName
commitSha
sourcePath
targetPath
action: install | update | skip | conflict | blocked
reason
```

动作含义：

- `install`：目标路径不存在，且 skill 尚未安装到该目标。
- `update`：同一 skill-target 已安装，但 commit 不同。
- `skip`：同一 skill-target 已安装，且 commit 相同。
- `conflict`：目标路径存在且无法确认由本应用当前 skill 拥有，执行时不能覆盖。
- `blocked`：目标未启用、目标路径缺失、目标不可写、源路径缺失或路径安全检查失败。

预览只用于 UI 告知和执行前确认。用户点击执行时，main process 必须重新计算一次预览，并执行重新计算后的可写条目。

## 6. Copy Executor

### 6.1 复制规则

执行 install/update 时：

1. 解析 skill root 的绝对源路径。
2. 解析目标目录下的 skill key 目标路径。
3. 确认源路径存在且是目录。
4. 确认目标父目录存在或可创建。
5. 确认目标目录安全：
   - 目标不存在：可以 copy。
   - 目标存在且 `install_instances` 证明是同一个 skill-target 的已安装路径：可以先删除再 copy。
   - 目标存在但没有本应用当前 skill 的安装事实：标记 conflict，不覆盖。
6. 删除旧目标目录。
7. copy 源 skill root 到目标路径。
8. upsert `install_instances`。

### 6.2 路径安全

executor 必须拒绝以下情况：

- source path 为空。
- target path 为空。
- target path 等于 target root。
- source path 包含 target path 或 target path 包含 source path。
- skill key 生成空字符串。
- normalized target path 在同一次执行中重复。

这些情况返回 `blocked` 或 `conflict`，不执行文件写入。

### 6.3 文件系统错误

权限、磁盘、锁文件、路径不存在等错误归为 `failed` 结果，并写入 `install_instances.last_error`。

执行结果返回给 UI：

```text
installed
updated
skipped
conflicts
blocked
failed
```

## 7. 同步流程

### 7.1 手动同步来源

Repositories 页同步流程：

1. 用户触发一个或多个 repository 同步。
2. main process 把 sync 状态写到 `repositories.last_sync_status = running`。
3. Git 来源 clone/fetch/pull 到 source worktree，本地路径来源 copy 到缓存。
4. 根据 discovery entries 物化 skill-only cache。
5. 扫描 `SKILL.md`。
6. 对 skill units 和 skill versions 做 upsert。
7. 移除本次不再存在的 skill units 及其 preferences。
8. 写入 `repositories.last_sync_*` 成功或失败状态。
9. 读取 `autoDistributeOnSync`：
   - 关闭：只计算 eligible count，返回同步摘要。
   - 开启：对本次同步影响到的 skills 执行 copy 分发，返回同步和分发摘要。

### 7.2 自动分发范围

自动分发只覆盖本次同步中仍存在、且拥有 enabled target preference 的 skills。

如果一个 repository 同步后有 3 个 skills，其中 2 个有目标设置，则只对这 2 个 skills 的 enabled targets 计算和执行分发。

自动分发不为没有 target preference 的 skills 猜测目标。

## 8. UI 设计

### 8.1 侧边栏和路由

移除：

- `Distribution`
- `Sync history`

保留主要入口：

- Repositories
- Skills
- Targets
- Settings

Providers 仍按当前隐藏策略处理，不在本次设计中展开。

### 8.2 Settings 页面

新增一组“分发”设置：

- 标题：`技能分发`
- 开关：`同步后自动分发到已设置目标`
- 默认：关闭
- 说明：开启后，来源同步完成并扫描到更新时，会自动 copy 到已经在 Skills/Targets 中设置的目标目录。

### 8.3 Repositories 页面

同步完成提示要包含两段信息：

- 扫描摘要：新增、更新、移除、警告。
- 分发摘要：
  - 自动分发关闭：显示“有 N 个已设置目标的 Skill 可手动分发。”
  - 自动分发开启：显示 installed/updated/skipped/conflict/failed 数量。

不再提供“查看同步历史”入口。

### 8.4 Skills 页面

Skills 页保留：

- skill 列表。
- 单个 skill 目标设置。
- 批量选择。
- 一次性分发预览。
- 手动分发执行。

文案调整：

- 避免 `dry-run`。
- 避免 `plan` / `计划`。
- 使用 `预览分发`、`分发`、`分发结果`。

按钮行为：

- `预览`：调用即时 preview API，不写数据库。
- `分发`：调用 execute API，main process 重新计算 preview 后执行 copy。
- 批量分发要求所选 skills 都至少有一个 enabled target preference。

### 8.5 Targets 页面

Targets 页面继续负责：

- 扫描系统目标。
- 添加 custom directory。
- 删除非内置目标。
- 展示有哪些 skills 选择了该 target。

不再展示或编辑 install strategy。

## 9. API 边界

新增或替换 IPC：

```text
distribution:preview
distribution:execute
settings:get
settings:updateDistributionSettings
repositories:sync
```

删除 IPC：

```text
syncHistory:list
```

`distribution:preview` 不写数据库。

`distribution:execute` 只允许 main process 执行文件写入和数据库更新。

Renderer 只通过 preload 类型化 API 调用，不直接访问文件系统或 SQLite。

## 10. 错误处理

同步错误：

- Git 认证失败。
- 网络失败。
- 本地路径不可读。
- 没有发现 `SKILL.md`。
- 缓存目录不可写。

分发错误：

- 源 skill root 不存在。
- 目标目录不可写。
- 目标路径被非本应用内容占用。
- copy 中途失败。

UI 表达原则：

- 同步失败显示在 Repositories 行状态和详情中。
- 分发失败显示在 Skills 页的结果摘要中。
- 冲突不会自动覆盖，需要用户手动清理目标目录或移除旧安装事实后重试。

## 11. 测试策略

### 11.1 数据层

覆盖：

- schema 中不存在 `distribution_plans`、`distribution_plan_items`、`sync_runs`。
- `agent_targets` 不再保存 `default_install_strategy`。
- repository sync status 写入 `repositories.last_sync_*`。
- `last_sync_summary_json.scan` 写入并读出 added/changed/removed 的 skill 明细，而不是只保存数量。
- 同步 upsert skill units 时保留仍存在 skill 的 target preferences。
- 删除已移除 skill 时清理对应 preferences。

### 11.2 Core 分发逻辑

覆盖：

- install/update/skip/conflict/blocked 分类。
- skill key 到目标路径的稳定生成。
- 路径嵌套和重复目标安全检查。

### 11.3 Main IPC / executor

覆盖：

- preview 不写数据库。
- execute 重新计算 preview。
- install copy 到目标目录并写入 `install_instances`。
- update 删除旧目标目录后重新 copy。
- conflict 不覆盖目标目录。
- autoDistributeOnSync 关闭时只返回 eligible count。
- autoDistributeOnSync 开启时同步后执行 copy。

### 11.4 Renderer

覆盖：

- Settings 开关默认关闭并可保存。
- Sidebar 不显示 Distribution / Sync history。
- Skills 页预览文案不包含 dry-run/plan。
- Skills 页手动分发展示结果摘要。
- Repositories 页同步完成显示自动分发关闭或开启时的摘要。
- Repository 详情可从 `last_sync_summary_json.scan.added/changed/removed` 展示最近一次同步影响到的具体 Skills。

### 11.5 验证命令

每个实现阶段运行最窄验证命令。最终整体验证：

```bash
pnpm run check
pnpm run format:check
pnpm run build:main
```

涉及 renderer 页面行为时，补充对应 Vitest 页面测试。涉及真实 Electron 行为时，用 Electron 应用验证，而不是只启动独立 Vite 网站。

## 12. 实施顺序

推荐实现顺序：

1. 数据模型重塑：schema、client ensure SQL、repository 层和测试。
2. 分发 preview 纯计算：不写数据库。
3. copy executor：文件系统 copy + `install_instances`。
4. 同步流程接入：保留 preferences，自动分发默认关闭。
5. Settings 页面开关。
6. Skills 页面手动 preview/execute。
7. Repositories 页面同步摘要。
8. 删除 Sync History / Distribution route、navigation、IPC 和旧测试。
9. 更新旧设计文档中明显过时的 v1 范围描述，避免后续实现误读。

## 13. 成功标准

完成后，用户可以：

- 添加 Git 或本地来源。
- 同步来源到本地缓存。
- 扫描出 skill units。
- 为 skill 设置一个或多个目标目录。
- 在 Skills 页一次性预览即将 copy 的分发动作。
- 手动 copy 分发到目标目录。
- 在 Settings 中开启同步后自动分发。
- 自动分发开启后，同步来源会把有目标设置的 updated skills copy 到目标目录。
- 应用中不再出现独立同步历史页面、Distribution 页面、dry-run plan 持久化记录或 symlink 安装策略。
