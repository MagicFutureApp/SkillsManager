# Skills Manager 数据模型实体说明

日期：2026-04-28

本文用于详细解释 `Skills Manager 设计` 中 `## 6. 数据模型` 的各个实体作用。

## 1. 总体理解

这组实体可以按三条主线理解：

1. 技能从哪里来：`sources`、`repositories`、`skill_units`、`skill_versions`
2. 技能要装到哪里：`agent_targets`、`skill_target_preferences`、`install_instances`
3. 技能如何同步和分发：`sync_runs`、`distribution_plans`、`distribution_plan_items`

整体关系可以概括为：

```text
sources
  -> repositories
    -> skill_units
      -> skill_versions
        -> install_instances
              ^
              |
agent_targets
  -> skill_target_preferences
  -> distribution_plans / distribution_plan_items

sync_runs 记录 repositories 的同步和扫描历史
app_settings 记录全局配置
```

一句话总结：

- `skill_units` 管“技能是什么”
- `skill_versions` 管“技能的确定版本”
- `agent_targets` 管“要装到哪里”
- `skill_target_preferences` 管“用户希望哪些技能默认同步到哪些目标”
- `install_instances` 管“实际装了什么”
- `distribution_plans` 和 `distribution_plan_items` 管“准备怎么装以及执行结果”
- `sync_runs` 管“仓库同步扫描过程”
- `sources` 和 `repositories` 管“技能从哪里来”

## 2. `sources`：来源配置

`sources` 表示技能来源的入口。它不是具体某个技能，也不一定是某个仓库，而是告诉系统：用户登记了一个什么类型的来源。

例如：

- GitHub
- GitLab
- Gitea
- Bitbucket
- 本地 Git 仓库
- `skills.sh` 市场

它通常保存这些信息：

```text
id
type: github | gitlab | gitea | bitbucket | local_git | skills_sh
name
url / base_url / local_path
config_json
created_at
updated_at
```

举例：

```text
用户添加了一个 GitHub 仓库地址：
https://github.com/foo/ai-skills

这个 GitHub 来源配置会先进入 sources。
后续系统再基于这个来源创建或更新对应的 repositories。
```

`sources` 的主要作用是把“来源类型和来源配置”独立出来。这样未来同一个系统可以支持不同 provider，而不是把 GitHub、GitLab、本地仓库、市场来源的逻辑全部塞进 `repositories`。

## 3. `repositories`：仓库记录

`repositories` 表示一个实际可同步、可扫描的仓库。

它比 `sources` 更具体。`sources` 说明“这个来源是什么”，`repositories` 说明“这个仓库现在在本地缓存在哪里、同步到哪个 commit、最后扫描结果是什么”。

它通常保存：

```text
id
source_id
remote_url
default_branch
local_cache_path
last_fetched_commit_sha
last_scanned_commit_sha
last_sync_run_id
status
created_at
updated_at
```

举例：

```text
source: GitHub
repository: https://github.com/foo/ai-skills
local_cache_path: AppData/.../repo-cache/foo-ai-skills
last_scanned_commit_sha: abc123
```

它的核心价值是：系统不需要每次都直接从远端读取技能，而是把仓库 clone/fetch 到本地缓存，然后从本地扫描 skill unit。

这也符合本地优先设计。

## 4. `skill_units`：技能单元

`skill_units` 是这套模型里最核心的业务实体。

设计文档中明确说：规范单元是 `skill unit`，不是仓库。也就是说，一个仓库只是容器，真正可安装、可浏览、可分发的是 skill unit。

一个仓库可能长这样：

```text
repo/
  skills/
    prompt-basic/SKILL.md
    code-review/SKILL.md
    debugging/SKILL.md
```

这个仓库应该产生三个 `skill_units`，而不是一个。

`skill_units` 通常保存：

```text
id
repository_id
skill_key / slug
name
description
entry_path
root_path
tags_json
agent_compatibility_json
discovery_method: manifest | fallback
status: active | removed | ambiguous
created_at
updated_at
```

几个关键点：

- `entry_path` 通常指向 `SKILL.md`
- `root_path` 是技能根目录
- `discovery_method` 标记它是从 manifest 解析出来，还是兜底扫描推断出来
- `status` 可以处理被删除、扫描有歧义等情况

它解决的问题是：用户打开 `Skills` 页面时，看到的是统一的技能列表，而不是一堆仓库列表。

## 5. `skill_versions`：技能版本

`skill_versions` 表示某个 skill unit 在某个确定版本上的可安装快照。

设计中强调 v1 安装默认锁定到固定 `commit_sha`。所以 `skill_versions` 的作用，就是把“我要安装这个技能”变成“我要安装这个技能在这个 commit 上的确定版本”。

它通常保存：

```text
id
skill_unit_id
repository_id
commit_sha
version_label
branch
tag
entry_path_at_commit
metadata_snapshot_json
created_at
```

不要直接只在 `skill_units` 上记录当前 commit，因为 `skill_units` 更像“这个技能是什么”，而 `skill_versions` 是“这个技能的某个可复现版本”。

举例：

```text
skill_unit: code-review
skill_version A: commit abc123
skill_version B: commit def456
```

用户当前安装的是 `abc123`，但仓库同步后发现了 `def456`。这时系统就可以清楚地知道：

- 当前安装版本是什么
- 新版本是什么
- 是否需要更新
- 出问题时可以回滚到哪个 commit

这是审计、回滚和可复现安装的基础。

## 6. `agent_targets`：安装目标

`agent_targets` 表示技能要安装到哪里。

v1 支持：

- Codex
- Claude Code
- Gemini CLI
- 自定义目录

它通常保存：

```text
id
type: codex | claude_code | gemini_cli | custom_directory
name
path
config_json
default_install_strategy: symlink | copy
enabled
created_at
updated_at
```

举例：

```text
Codex target:
path: C:\Users\andrewliang\.codex\skills

Claude Code target:
path: C:\Users\andrewliang\.claude\skills

Custom target:
path: D:\my-agent-skills
```

它的作用是把“技能本身”和“安装位置”分开。

同一个 skill version 可以安装到多个 target：

```text
prompt-basic@abc123 -> Codex
prompt-basic@abc123 -> Claude Code
prompt-basic@abc123 -> custom directory
```

这就是为什么需要单独的目标表。

## 7. `skill_target_preferences`：技能目标偏好

`skill_target_preferences` 表示用户希望某个 skill unit 默认同步到某个目标。

它主要服务于 UI 勾选状态和批量同步选择。它不表示技能已经安装成功，也不替代 `install_instances`。

比如界面是：

```text
技能A
  [x] 目标目录A
  [ ] 目标目录B

技能B
  [x] 目标目录A
  [x] 目标目录C
```

这些勾选关系应该存到 `skill_target_preferences`：

```text
skill_target_preferences
- 技能A -> 目标目录A -> enabled
- 技能A -> 目标目录B -> disabled 或无记录
- 技能B -> 目标目录A -> enabled
- 技能B -> 目标目录C -> enabled
```

它通常保存：

```text
id
skill_unit_id
agent_target_id
enabled
desired_version_mode: latest | pinned
desired_commit_sha
created_at
updated_at
```

建议增加唯一约束：

```text
unique(skill_unit_id, agent_target_id)
```

这样同一个技能和同一个目标目录只会有一条偏好记录。

这里选择 `skill_unit_id`，而不是 `skill_version_id`，是因为勾选偏好通常表达“这个技能以后默认同步到这个目标”。具体同步到哪个 commit，由同步执行时解析出的 `skill_versions` 决定。

如果用户需要锁定某个固定版本，可以使用：

```text
desired_version_mode: pinned
desired_commit_sha: abc123
```

如果用户希望每次同步到最新扫描版本，可以使用：

```text
desired_version_mode: latest
desired_commit_sha: null
```

App 每次启动后，可以通过它恢复 UI Checkbox 状态：

```text
1. 查询所有 skill_units
2. 查询所有 enabled agent_targets
3. 查询 skill_target_preferences，恢复 Checkbox 勾选状态
4. 查询 install_instances，显示实际安装状态
```

它和 `install_instances` 的边界是：

```text
skill_target_preferences:
  用户想让技能同步到哪里。

install_instances:
  技能实际上已经安装到了哪里，安装的是哪个 commit，安装状态如何。
```

## 8. `install_instances`：已安装实例

`install_instances` 记录实际安装结果。

它回答的问题是：

```text
哪个技能版本，安装到了哪个目标，安装在哪里，是用 symlink 还是 copy，当前状态是什么？
```

通常保存：

```text
id
skill_version_id
agent_target_id
installed_path
install_strategy: symlink | copy
installed_commit_sha
status: installed | failed | removed | drifted
installed_at
updated_at
last_error
```

这个实体非常重要，因为它是“事实记录”。

`distribution_plans` 是计划，`install_instances` 是执行后的状态。

举例：

```text
skill_version: prompt-basic@abc123
target: Codex
installed_path: C:\Users\...\ .codex\skills\prompt-basic
install_strategy: symlink
status: installed
```

以后用户打开 UI，系统要显示“这个技能已经安装到 Codex”，依赖的就是 `install_instances`。

它也能帮助检测问题：

- 目标目录被用户手动删除
- symlink 指向失效
- 当前安装内容和记录的 commit 不一致
- copy 安装后源技能更新了，但目标还停留在旧版本

这些都可以通过 `install_instances` 做状态追踪。

## 9. `distribution_plans`：分发计划

`distribution_plans` 表示一次安装、更新或卸载操作的整体计划。

设计文档强调 plan-first execution，也就是先计划，再执行。这个表就是计划的头部记录。

它通常保存：

```text
id
plan_type: install | update | uninstall | mixed
status: draft | ready | executing | completed | failed | cancelled
summary_json
created_by
created_at
confirmed_at
executed_at
```

例如用户选择：

```text
安装 prompt-basic 和 code-review 到 Codex、Gemini CLI
```

系统不会立刻写文件，而是先生成一个 plan：

```text
distribution_plan #42
type: install
status: draft
summary: 2 skills x 2 targets = 4 actions
```

这个实体的价值是让 UI 可以展示 dry-run 预览：

- 将安装哪些技能
- 安装到哪些目录
- 哪些会跳过
- 哪些有冲突
- 哪些可能覆盖已有文件
- 使用 symlink 还是 copy

批量同步时，系统可以读取所有启用的 `skill_target_preferences`，再生成对应的 `distribution_plan`。

## 10. `distribution_plan_items`：分发计划条目

`distribution_plan_items` 是计划里的每一个动作。

如果 `distribution_plans` 是“这次分发任务”，那 `distribution_plan_items` 就是“这次任务里的每一个具体步骤”。

通常保存：

```text
id
distribution_plan_id
skill_version_id
agent_target_id
action: install | update | skip | conflict | remove
source_path
target_path
install_strategy
status: pending | running | succeeded | failed | skipped
reason
error_message
created_at
updated_at
```

举例，一个 plan 可能有四个 item：

```text
1. install prompt-basic@abc123 -> Codex
2. install prompt-basic@abc123 -> Gemini CLI
3. install code-review@def456 -> Codex
4. conflict code-review@def456 -> Gemini CLI
```

这样做的好处是粒度足够细。

如果第 1、2、3 项成功，第 4 项失败，系统可以准确展示：

```text
3 succeeded, 1 conflict
```

而不是只知道“整个安装失败了”。

这对恢复、重试、审计都很重要。

## 11. `sync_runs`：同步/扫描历史

`sync_runs` 记录仓库同步和扫描操作的历史。

每次用户点“同步”，系统都应该创建一条 `sync_run`。

通常保存：

```text
id
repository_id
status: running | succeeded | failed | skipped
started_at
finished_at
before_commit_sha
after_commit_sha
force_rescan
summary_json
warnings_json
error_message
```

它记录的是过程，而不是最终技能状态。

比如：

```text
sync_run #100
repository: ai-skills
before_commit: abc123
after_commit: def456
summary:
  added: 2
  removed: 1
  changed: 3
  ambiguous: 1
```

它的作用包括：

- UI 展示最近一次同步结果
- 失败时显示诊断信息
- 判断是否需要重新扫描
- 审计“这个技能列表是什么时候、从哪个 commit 扫出来的”
- 帮助排查 Git 认证、网络、仓库结构问题

`repositories.last_scanned_commit_sha` 是当前状态，`sync_runs` 是历史过程。

## 12. `app_settings`：应用设置

`app_settings` 存储本地应用配置。

它不属于某个具体仓库、技能或目标，而是全局配置。

通常包括：

```text
key
value_json
updated_at
```

可能存这些东西：

```text
repo_cache_dir
default_install_strategy
default_target_ids
ui_preferences
sync_preferences
diagnostics_level
future_profile_id
future_policy_scope
```

它也可以为未来的 `profile/policy` 控制项留空间。意思是 v1 虽然是个人本地工具，但不要把模型设计死成“永远只有一个用户、一个配置、一个策略”。

## 13. 一次完整流程示例

假设用户添加一个 GitHub 仓库，并安装其中一个技能到 Codex：

1. 用户添加 GitHub 仓库，写入 `sources`
2. 系统 clone/fetch 仓库，写入或更新 `repositories`
3. 用户点击同步，创建 `sync_runs`
4. 扫描仓库里的 `SKILL.md`，写入 `skill_units`
5. 把某个技能解析到当前 commit，写入 `skill_versions`
6. 用户配置 Codex 技能目录，写入 `agent_targets`
7. 用户勾选技能要同步到 Codex，写入 `skill_target_preferences`
8. 用户点击同步，创建 `distribution_plans`
9. 系统生成每个安装动作，写入 `distribution_plan_items`
10. 用户确认执行，更新 plan/item 状态
11. 安装成功后，写入 `install_instances`
