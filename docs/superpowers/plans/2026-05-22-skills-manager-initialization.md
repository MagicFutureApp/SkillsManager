# Skills Manager 初始化实现计划

> **给 agentic workers：** 必须使用子技能：推荐使用 superpowers:subagent-driven-development，也可以使用 superpowers:executing-plans，逐个任务执行本计划。步骤使用 checkbox（`- [ ]`）语法跟踪。

**目标：** 以小步确认的方式构建 Skills Manager 桌面应用基础，从现有 Electron 壳开始，直到具备类型化 React/Vite renderer，以及第一版 SQLite/Drizzle 数据层骨架。

**架构：** 应用将 Electron main/preload 代码与 React renderer 分离。Renderer 只通过类型化 IPC 与 main 通信。SQLite 和 Drizzle 隐藏在 `src/db` 与 `src/main` 边界之后，renderer 永远不直接打开数据库。

**技术栈：** Electron 42.2.0、Node.js 24.11.1、React、TypeScript 6.0.3、Vite、SQLite、Drizzle ORM、`better-sqlite3`、`drizzle-kit`、Prettier、pnpm with `nodeLinker: hoisted`。

---

## 当前基线

仓库当前已经包含：

- 带有 Electron、TypeScript、Prettier 脚本和 Electron main 构建脚本的 `package.json`
- 设置了 `nodeLinker: hoisted` 的 `pnpm-workspace.yaml`
- `tsconfig.main.json`
- `src/main/index.ts`
- `src/main/preload.ts`
- Prettier 项目配置

继续之前的基线验证：

```bash
pnpm run format:check
pnpm run check
pnpm run electron:version
```

预期：

```text
All matched files use Prettier code style!
tsc exits with code 0
v42.2.0
```

## 确认规则

每个任务完成后：

1. 运行列出的验证命令。
2. 如果验证通过，提交该任务。
3. 停下来等待用户确认，再开始下一个任务。

## 目标文件结构

```text
src/
  main/
    index.ts
    preload.ts
    ipc/
      health.ts
  renderer/
    index.html
    main.tsx
    App.tsx
    styles.css
    features/
      shell/
        AppShell.tsx
  db/
    schema.ts
    client.ts
    repositories/
  core/
    domain/
```

## 任务 1：Electron 壳基线

**状态：** 已完成。

**文件：**

- 已创建：`package.json`
- 已创建：`pnpm-lock.yaml`
- 已创建：`pnpm-workspace.yaml`
- 已创建：`tsconfig.main.json`
- 已创建：`src/main/index.ts`
- 已创建：`src/main/preload.ts`

- [x] **步骤 1：创建最小 Electron package scripts**

`package.json` 包含：

```json
{
  "scripts": {
    "dev": "pnpm run build:main && node node_modules/electron/cli.js .",
    "electron:version": "node node_modules/electron/cli.js --version",
    "build:main": "tsc -p tsconfig.main.json",
    "check": "tsc -p tsconfig.main.json --noEmit"
  }
}
```

- [x] **步骤 2：配置 pnpm 以兼容 Electron**

`pnpm-workspace.yaml` 包含：

```yaml
nodeLinker: hoisted
```

- [x] **步骤 3：创建 Electron main 和 preload 入口**

`src/main/index.ts` 创建 `BrowserWindow`。

`src/main/preload.ts` 暴露初始的 `skillsManager` preload bridge。

- [x] **步骤 4：验证 Electron 基线**

运行：

```bash
pnpm run format:check
pnpm run check
pnpm run build:main
pnpm run electron:version
```

预期：

```text
format:check passes
check passes
build:main passes
electron:version prints v42.2.0
```

- [x] **步骤 5：提交**

已完成提交：

```text
7012918 Initialize Electron app shell
e72d25b Add Prettier formatting setup
8c190a6 Adjust Electron welcome text layout
```

## 任务 2：React + Vite Renderer

**状态：** 已完成。

**文件：**

- 创建：`index.html`
- 创建：`vite.config.ts`
- 创建：`tsconfig.renderer.json`
- 创建：`src/renderer/main.tsx`
- 创建：`src/renderer/App.tsx`
- 创建：`src/renderer/styles.css`
- 修改：`package.json`
- 修改：`src/main/index.ts`

- [x] **步骤 1：安装 renderer 依赖**

运行：

```bash
pnpm add react react-dom
pnpm add -D @vitejs/plugin-react vite @types/react @types/react-dom
```

预期：

```text
react、react-dom、vite 和 @vitejs/plugin-react 被添加到 package.json
pnpm-lock.yaml 被更新
```

- [x] **步骤 2：添加 renderer TypeScript 配置**

创建 `tsconfig.renderer.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src/renderer/**/*.ts", "src/renderer/**/*.tsx"]
}
```

- [x] **步骤 3：添加 Vite 配置**

创建 `vite.config.ts`：

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "src/renderer",
  build: {
    outDir: "../../dist/renderer",
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
```

- [x] **步骤 4：创建 React renderer 入口**

创建 `src/renderer/main.tsx`：

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

创建 `src/renderer/App.tsx`：

```tsx
export const App = () => {
  return (
    <main className="app-shell">
      <section className="welcome-panel">
        <h1>Skills Manager</h1>
        <p>React renderer initialized. Data layer comes next.</p>
      </section>
    </main>
  );
};
```

创建 `src/renderer/styles.css`：

```css
:root {
  color: #172033;
  background: #f5f7fb;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}

body {
  margin: 0;
  min-width: 960px;
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
}

.welcome-panel {
  text-align: center;
}

.welcome-panel h1 {
  margin: 0 0 12px;
  font-size: 32px;
}

.welcome-panel p {
  margin: 0;
  color: #5c667a;
}
```

创建 `src/renderer/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Skills Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

- [x] **步骤 5：更新 Electron 以加载 renderer**

修改 `src/main/index.ts`，使开发环境加载 Vite，生产环境加载构建后的 HTML：

```ts
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

if (devServerUrl) {
  void mainWindow.loadURL(devServerUrl);
} else {
  void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}
```

- [x] **步骤 6：更新 scripts**

修改 `package.json` scripts：

```json
{
  "scripts": {
    "dev": "pnpm run build:main && concurrently -k \"pnpm run dev:renderer\" \"cross-env VITE_DEV_SERVER_URL=http://localhost:5173 node node_modules/electron/cli.js .\"",
    "dev:renderer": "vite --host 127.0.0.1",
    "build:renderer": "vite build",
    "build": "pnpm run build:main && pnpm run build:renderer",
    "check": "tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.renderer.json --noEmit"
  }
}
```

安装辅助 dev dependencies：

```bash
pnpm add -D concurrently cross-env
```

- [x] **步骤 7：验证 renderer**

运行：

```bash
pnpm run format
pnpm run format:check
pnpm run check
pnpm run build
```

预期：

```text
format passes
format:check passes
check passes
build creates dist/main and dist/renderer
```

- [x] **步骤 8：提交并停止**

运行：

```bash
git add -A
git commit -m "Initialize React renderer"
```

停下来等待用户确认。

## 任务 3：类型化 Preload 与 Health IPC

**文件：**

- 创建：`src/main/ipc/health.ts`
- 创建：`src/renderer/global.d.ts`
- 修改：`src/main/index.ts`
- 修改：`src/main/preload.ts`
- 修改：`src/renderer/App.tsx`

- [ ] **步骤 1：添加 health IPC handler**

创建 `src/main/ipc/health.ts`：

```ts
import { ipcMain } from "electron";

export type AppHealth = {
  node: string;
  chrome: string;
  electron: string;
  platform: NodeJS.Platform;
};

export const registerHealthIpc = (): void => {
  ipcMain.handle("app:getHealth", (): AppHealth => {
    return {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron,
      platform: process.platform
    };
  });
};
```

- [ ] **步骤 2：在 main process 注册 IPC**

修改 `src/main/index.ts`：

```ts
import { registerHealthIpc } from "./ipc/health";

void app.whenReady().then(() => {
  registerHealthIpc();
  createMainWindow();
});
```

- [ ] **步骤 3：暴露类型化 preload API**

修改 `src/main/preload.ts`：

```ts
import { contextBridge, ipcRenderer } from "electron";
import type { AppHealth } from "./ipc/health";

contextBridge.exposeInMainWorld("skillsManager", {
  getHealth: () => ipcRenderer.invoke("app:getHealth") as Promise<AppHealth>
});
```

创建 `src/renderer/global.d.ts`：

```ts
import type { AppHealth } from "../main/ipc/health";

declare global {
  interface Window {
    skillsManager: {
      getHealth: () => Promise<AppHealth>;
    };
  }
}

export {};
```

- [ ] **步骤 4：在 React UI 显示 health 信息**

修改 `src/renderer/App.tsx`：

```tsx
import { useEffect, useState } from "react";
import type { AppHealth } from "../main/ipc/health";

export const App = () => {
  const [health, setHealth] = useState<AppHealth | null>(null);

  useEffect(() => {
    void window.skillsManager.getHealth().then(setHealth);
  }, []);

  return (
    <main className="app-shell">
      <section className="welcome-panel">
        <h1>Skills Manager</h1>
        <p>React renderer initialized. Data layer comes next.</p>
        {health ? (
          <dl>
            <dt>Node</dt>
            <dd>{health.node}</dd>
            <dt>Electron</dt>
            <dd>{health.electron}</dd>
            <dt>Platform</dt>
            <dd>{health.platform}</dd>
          </dl>
        ) : null}
      </section>
    </main>
  );
};
```

- [ ] **步骤 5：验证 IPC**

运行：

```bash
pnpm run format
pnpm run format:check
pnpm run check
pnpm run build
```

预期：

```text
all commands exit with code 0
```

- [ ] **步骤 6：提交并停止**

运行：

```bash
git add -A
git commit -m "Add typed Electron health IPC"
```

停下来等待用户确认。

## 任务 4：Drizzle SQLite Schema 骨架

**文件：**

- 创建：`drizzle.config.ts`
- 创建：`src/db/schema.ts`
- 创建：`src/db/client.ts`
- 创建：`src/db/repositories/appSettingsRepository.ts`
- 修改：`package.json`

- [ ] **步骤 1：安装数据库依赖**

运行：

```bash
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3
```

预期：

```text
drizzle-orm 和 better-sqlite3 被添加到 dependencies
drizzle-kit 和 @types/better-sqlite3 被添加到 devDependencies
```

- [ ] **步骤 2：添加 Drizzle 配置**

创建 `drizzle.config.ts`：

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/skills-manager.sqlite"
  }
});
```

- [ ] **步骤 3：添加 schema tables**

创建 `src/db/schema.ts`，包含 v1 表：

```ts
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  configJson: text("config_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const repositories = sqliteTable("repositories", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  remoteUrl: text("remote_url").notNull(),
  localCachePath: text("local_cache_path").notNull(),
  defaultBranch: text("default_branch"),
  lastScannedCommitSha: text("last_scanned_commit_sha"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const skillUnits = sqliteTable("skill_units", {
  id: text("id").primaryKey(),
  repositoryId: text("repository_id").notNull(),
  name: text("name").notNull(),
  entryPath: text("entry_path").notNull(),
  rootPath: text("root_path").notNull(),
  discoveryMethod: text("discovery_method").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const skillVersions = sqliteTable("skill_versions", {
  id: text("id").primaryKey(),
  skillUnitId: text("skill_unit_id").notNull(),
  commitSha: text("commit_sha").notNull(),
  metadataSnapshotJson: text("metadata_snapshot_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export const agentTargets = sqliteTable("agent_targets", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  defaultInstallStrategy: text("default_install_strategy").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const skillTargetPreferences = sqliteTable(
  "skill_target_preferences",
  {
    id: text("id").primaryKey(),
    skillUnitId: text("skill_unit_id").notNull(),
    agentTargetId: text("agent_target_id").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    desiredVersionMode: text("desired_version_mode").notNull().default("latest"),
    desiredCommitSha: text("desired_commit_sha"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (table) => [
    uniqueIndex("skill_target_preferences_skill_target_uq").on(
      table.skillUnitId,
      table.agentTargetId
    )
  ]
);

export const installInstances = sqliteTable("install_instances", {
  id: text("id").primaryKey(),
  skillVersionId: text("skill_version_id").notNull(),
  agentTargetId: text("agent_target_id").notNull(),
  installedPath: text("installed_path").notNull(),
  installStrategy: text("install_strategy").notNull(),
  installedCommitSha: text("installed_commit_sha").notNull(),
  status: text("status").notNull(),
  installedAt: integer("installed_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});
```

- [ ] **步骤 4：添加数据库 client**

创建 `src/db/client.ts`：

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const createDbClient = (databasePath: string) => {
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");

  return drizzle(sqlite, { schema });
};
```

- [ ] **步骤 5：添加 migration scripts**

修改 `package.json` scripts：

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:check": "drizzle-kit check"
  }
}
```

- [ ] **步骤 6：验证 schema**

运行：

```bash
pnpm run format
pnpm run format:check
pnpm run check
pnpm run db:generate
```

预期：

```text
format passes
format:check passes
check passes
drizzle migration files are generated under drizzle/
```

- [ ] **步骤 7：提交并停止**

运行：

```bash
git add -A
git commit -m "Add Drizzle SQLite schema"
```

停下来等待用户确认。

## 任务 5：第一版 App Shell UI

**文件：**

- 创建：`src/renderer/features/shell/AppShell.tsx`
- 修改：`src/renderer/App.tsx`
- 修改：`src/renderer/styles.css`

- [ ] **步骤 1：创建 app shell component**

创建 `src/renderer/features/shell/AppShell.tsx`：

```tsx
const navItems = ["Sources", "Repositories", "Skills", "Targets", "Distribution"];

export const AppShell = () => {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h1>Skills Manager</h1>
        <nav>
          {navItems.map((item) => (
            <button key={item} type="button">
              {item}
            </button>
          ))}
        </nav>
      </aside>
      <main className="workspace">
        <header>
          <h2>Skills</h2>
          <button type="button">Sync</button>
        </header>
        <section className="empty-state">
          <h3>No skills indexed yet</h3>
          <p>Add a source repository, run manual sync, then distribute skills to targets.</p>
        </section>
      </main>
    </div>
  );
};
```

- [ ] **步骤 2：将 App 接入 shell**

修改 `src/renderer/App.tsx`：

```tsx
import { AppShell } from "./features/shell/AppShell";

export const App = () => {
  return <AppShell />;
};
```

- [ ] **步骤 3：为桌面工具布局添加样式**

修改 `src/renderer/styles.css`，使用克制的桌面工具布局：

```css
:root {
  color: #172033;
  background: #f5f7fb;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}

body {
  margin: 0;
  min-width: 960px;
  min-height: 100vh;
}

button {
  font: inherit;
}

.app-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

.sidebar {
  border-right: 1px solid #dbe1ec;
  background: #ffffff;
  padding: 20px 16px;
}

.sidebar h1 {
  margin: 0 0 24px;
  font-size: 18px;
}

.sidebar nav {
  display: grid;
  gap: 6px;
}

.sidebar button {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #33405a;
  cursor: pointer;
  padding: 9px 10px;
  text-align: left;
}

.sidebar button:hover {
  background: #eef3fb;
}

.workspace {
  padding: 24px;
}

.workspace header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.workspace h2 {
  margin: 0;
  font-size: 24px;
}

.workspace header button {
  border: 1px solid #2d6cdf;
  border-radius: 6px;
  background: #2d6cdf;
  color: #ffffff;
  cursor: pointer;
  padding: 8px 14px;
}

.empty-state {
  border: 1px dashed #c5cfdf;
  border-radius: 8px;
  background: #ffffff;
  padding: 32px;
}

.empty-state h3 {
  margin: 0 0 8px;
}

.empty-state p {
  margin: 0;
  color: #68758d;
}
```

- [ ] **步骤 4：验证 UI shell**

运行：

```bash
pnpm run format
pnpm run format:check
pnpm run check
pnpm run build
```

预期：

```text
all commands exit with code 0
```

- [ ] **步骤 5：提交并停止**

运行：

```bash
git add -A
git commit -m "Add desktop app shell UI"
```

停下来等待用户确认。

## 计划自检

- 规格覆盖：本计划覆盖 v1 基础工程，从现有 Electron 壳到 React renderer、类型化 IPC、Drizzle/SQLite schema，以及第一版桌面 UI shell。更深入的 source sync、Git adapters、scanning、planning 和 installer 行为应拆成独立实现计划。
- 占位符扫描：没有禁用的占位标记或未定义的任务引用。
- 类型一致性：表名和 API 名称与当前设计文档一致，包括 `skill_target_preferences`。
