# 贡献指南

本文件描述 SkillsManager 仓库的分支命名、commit message 和基本协作约定，对人和 AI coding agent 同时生效。agent 侧的额外安全边界见 `AGENTS.md`。

## 分支命名

分支从当前集成分支切出（当前为 `dev-best100`；主分支名以仓库实际为准，不强制迁移）。

| 前缀        | 用途                   | 示例                          |
| ----------- | ---------------------- | ----------------------------- |
| `feature/`  | 新功能开发             | `feature/skill-search-filter` |
| `fix/`      | 缺陷修复               | `fix/macos-gatekeeper-block`  |
| `hotfix/`   | 线上紧急修复           | `hotfix/1.2.1-launch-crash`   |
| `docs/`     | 仅文档变更             | `docs/update-readme`          |
| `refactor/` | 不改变外部行为的重构   | `refactor/preload-esm`        |
| `chore/`    | 依赖、构建、配置等杂项 | `chore/bump-electron`         |
| `release/`  | 发版准备               | `release/1.3.0`               |

规则：

- 前缀后接简短英文描述，全小写，单词之间用连字符 `-`，不用下划线或空格。
- 合并回集成分支后删除该分支。
- 一个分支只做一件事，不混入多类无关改动。
- commit type 使用 Conventional Commits 的 `feat`，分支前缀使用 `feature/`；两者不强制同名，按本规范执行。

## Commit message（Conventional Commits）

格式：

```text
<type>(<scope>): <subject>
```

`type` 取值：

| type       | 含义                     |
| ---------- | ------------------------ |
| `feat`     | 新功能                   |
| `fix`      | 缺陷修复                 |
| `docs`     | 仅文档变更               |
| `style`    | 代码格式调整，不影响逻辑 |
| `refactor` | 重构，不改变外部行为     |
| `perf`     | 性能优化                 |
| `test`     | 测试相关                 |
| `build`    | 构建系统或外部依赖变更   |
| `ci`       | CI 配置变更              |
| `chore`    | 其他杂项                 |
| `revert`   | 回滚某个提交             |

规则：

- `scope` 可选，标明影响范围，例如 `desktop`、`landing`、`main`、`preload`、`renderer`、`core`、`db`。
- `subject` 使用英文祈使句，首字母小写，结尾不加句号，建议不超过 72 字符。
- 需要补充说明时，在空行后写 body。
- 破坏性变更：type 后加 `!`，并在 footer 写 `BREAKING CHANGE: <说明>`。
- 一个 commit 只做一个逻辑变更。

示例：

```text
feat(desktop): add skill search filter

fix(preload): resolve ESM import path on Windows

chore!: drop Node 16 support

BREAKING CHANGE: requires Node 18+
```

## 基本流程

1. 从集成分支切出 `feature/xxx`（或对应前缀）分支。
2. 小步提交，commit message 符合上述规范。
3. 合并回集成分支后删除分支。
4. AI agent 工作时另须遵守 `AGENTS.md` 中的 Git 与安全边界（含未经明确确认不提交、不 push）。
