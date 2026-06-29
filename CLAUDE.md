# Claude Code Instructions

先遵守 `AGENTS.md`。本文件补充 Claude Code 在此仓库工作的额外提醒。

## 仓库上下文

这是 Skills Manager 桌面应用：

- 本地优先 Electron 应用。
- 当前实现是 Electron main/preload 基线。
- 计划中的 renderer 是 React + Vite。
- 计划中的持久化是 SQLite + Drizzle ORM。
- 产品行为和范围记录在 `docs/superpowers`。

## 较大变更前必须阅读

- `AGENTS.md`
- `docs/superpowers/specs/2026-04-28-skills-manager-design.md`
- `docs/superpowers/plans/2026-05-22-skills-manager-initialization.md`

涉及数据库时，还要阅读：

- `docs/superpowers/specs/2026-04-28-skills-manager-data-model-explanation.md`

## Claude 工作规则

- 默认使用中文交流；代码、命令、API 名称、错误信息和已有英文术语按原文保留。
- 回复保持简洁、面向行动。
- 编辑前先检查与任务相关的当前文件和 docs。
- 除非用户给出更新指令，否则遵循当前分阶段计划。
- 能抽成共通函数的逻辑必须抽成共通函数；已有对应函数或方法时必须复用，不要新增重复实现。
- 声称完成前不要跳过验证。
- 涉及 UI 或端到端行为验证时，应使用 Electron 应用进行测试，不要用单独启动的 Vite 网站替代 Electron 验证。
- 样式中的数字单位尽量使用 shadcn / Tailwind v4 的主题化格式，例如 `w-23`、`gap-3`、`rounded-xl`；只有在需要精确像素、外部规格对齐或主题格式无法表达时，才使用 `w-[92px]` 这类 arbitrary value。
- 不要静默改变产品范围。
- 不要引入 renderer 直接访问文件系统、Git 或 SQLite 的路径。
- v1 不在应用内存储 Git 凭据或 provider token。
- 安装新包时默认选最新稳定版本；如果因兼容性需要固定旧版本，必须说明约束。
- 除非用户明确要求，不要执行破坏性文件或 Git 操作。

## 推荐流程

1. 检查相关文件。
2. 做最小且有用的改动。
3. 如果改了代码，执行格式化。
4. 运行最窄相关检查。
5. 总结变更文件和验证结果。

## 当前基线检查

```bash
pnpm run format:check
pnpm run check
pnpm run build:main
pnpm run electron:version
```

统一使用 `pnpm`。
