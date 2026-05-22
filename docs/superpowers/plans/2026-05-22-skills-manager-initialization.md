# Skills Manager Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Skills Manager desktop application foundation in small confirmed steps, starting from the existing Electron shell and ending with a typed React/Vite renderer plus the first SQLite/Drizzle data layer skeleton.

**Architecture:** The app keeps Electron main/preload code separate from the React renderer. Renderer code talks to main through typed IPC only. SQLite and Drizzle live behind the `src/db` and `src/main` boundary so the renderer never opens the database directly.

**Tech Stack:** Electron 42.2.0, Node.js 24.11.1, React, TypeScript 6.0.3, Vite, SQLite, Drizzle ORM, `better-sqlite3`, `drizzle-kit`, Prettier, pnpm with `nodeLinker: hoisted`.

---

## Current Baseline

The repository already has:

- `package.json` with Electron, TypeScript, Prettier scripts, and Electron main build scripts
- `pnpm-workspace.yaml` with `nodeLinker: hoisted`
- `tsconfig.main.json`
- `src/main/index.ts`
- `src/main/preload.ts`
- Prettier project configuration

Baseline verification before continuing:

```bash
pnpm run format:check
pnpm run check
pnpm run electron:version
```

Expected:

```text
All matched files use Prettier code style!
tsc exits with code 0
v42.2.0
```

## Confirmation Rule

After each task:

1. Run the listed verification commands.
2. Commit the task if verification passes.
3. Stop and wait for user confirmation before starting the next task.

## File Structure Target

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

## Task 1: Electron Shell Baseline

**Status:** Complete.

**Files:**

- Created: `package.json`
- Created: `pnpm-lock.yaml`
- Created: `pnpm-workspace.yaml`
- Created: `tsconfig.main.json`
- Created: `src/main/index.ts`
- Created: `src/main/preload.ts`

- [x] **Step 1: Create minimal Electron package scripts**

`package.json` contains:

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

- [x] **Step 2: Configure pnpm for Electron compatibility**

`pnpm-workspace.yaml` contains:

```yaml
nodeLinker: hoisted
```

- [x] **Step 3: Create Electron main and preload entries**

`src/main/index.ts` creates a `BrowserWindow`.

`src/main/preload.ts` exposes the initial `skillsManager` preload bridge.

- [x] **Step 4: Verify Electron baseline**

Run:

```bash
pnpm run format:check
pnpm run check
pnpm run build:main
pnpm run electron:version
```

Expected:

```text
format:check passes
check passes
build:main passes
electron:version prints v42.2.0
```

- [x] **Step 5: Commit**

Completed commits:

```text
7012918 Initialize Electron app shell
e72d25b Add Prettier formatting setup
8c190a6 Adjust Electron welcome text layout
```

## Task 2: React + Vite Renderer

**Files:**

- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.renderer.json`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles.css`
- Modify: `package.json`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Install renderer dependencies**

Run:

```bash
pnpm add react react-dom
pnpm add -D @vitejs/plugin-react vite @types/react @types/react-dom
```

Expected:

```text
react, react-dom, vite, and @vitejs/plugin-react are added to package.json
pnpm-lock.yaml is updated
```

- [ ] **Step 2: Add renderer TypeScript config**

Create `tsconfig.renderer.json`:

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

- [ ] **Step 3: Add Vite config**

Create `vite.config.ts`:

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

- [ ] **Step 4: Create React renderer entry**

Create `src/renderer/main.tsx`:

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

Create `src/renderer/App.tsx`:

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

Create `src/renderer/styles.css`:

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

Create `src/renderer/index.html`:

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

- [ ] **Step 5: Update Electron to load renderer**

Modify `src/main/index.ts` so development loads Vite and production loads built HTML:

```ts
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

if (devServerUrl) {
  void mainWindow.loadURL(devServerUrl);
} else {
  void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}
```

- [ ] **Step 6: Update scripts**

Modify `package.json` scripts:

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

Install helper dev dependencies:

```bash
pnpm add -D concurrently cross-env
```

- [ ] **Step 7: Verify renderer**

Run:

```bash
pnpm run format
pnpm run format:check
pnpm run check
pnpm run build
```

Expected:

```text
format passes
format:check passes
check passes
build creates dist/main and dist/renderer
```

- [ ] **Step 8: Commit and stop**

Run:

```bash
git add -A
git commit -m "Initialize React renderer"
```

Stop and wait for user confirmation.

## Task 3: Typed Preload and Health IPC

**Files:**

- Create: `src/main/ipc/health.ts`
- Create: `src/renderer/global.d.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Add health IPC handler**

Create `src/main/ipc/health.ts`:

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

- [ ] **Step 2: Register IPC in main process**

Modify `src/main/index.ts`:

```ts
import { registerHealthIpc } from "./ipc/health";

void app.whenReady().then(() => {
  registerHealthIpc();
  createMainWindow();
});
```

- [ ] **Step 3: Expose typed preload API**

Modify `src/main/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from "electron";
import type { AppHealth } from "./ipc/health";

contextBridge.exposeInMainWorld("skillsManager", {
  getHealth: () => ipcRenderer.invoke("app:getHealth") as Promise<AppHealth>
});
```

Create `src/renderer/global.d.ts`:

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

- [ ] **Step 4: Show health in React UI**

Modify `src/renderer/App.tsx`:

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

- [ ] **Step 5: Verify IPC**

Run:

```bash
pnpm run format
pnpm run format:check
pnpm run check
pnpm run build
```

Expected:

```text
all commands exit with code 0
```

- [ ] **Step 6: Commit and stop**

Run:

```bash
git add -A
git commit -m "Add typed Electron health IPC"
```

Stop and wait for user confirmation.

## Task 4: Drizzle SQLite Schema Skeleton

**Files:**

- Create: `drizzle.config.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`
- Create: `src/db/repositories/appSettingsRepository.ts`
- Modify: `package.json`

- [ ] **Step 1: Install database dependencies**

Run:

```bash
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3
```

Expected:

```text
drizzle-orm and better-sqlite3 are added to dependencies
drizzle-kit and @types/better-sqlite3 are added to devDependencies
```

- [ ] **Step 2: Add Drizzle config**

Create `drizzle.config.ts`:

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

- [ ] **Step 3: Add schema tables**

Create `src/db/schema.ts` with the v1 tables:

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

- [ ] **Step 4: Add database client**

Create `src/db/client.ts`:

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

- [ ] **Step 5: Add migration scripts**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:check": "drizzle-kit check"
  }
}
```

- [ ] **Step 6: Verify schema**

Run:

```bash
pnpm run format
pnpm run format:check
pnpm run check
pnpm run db:generate
```

Expected:

```text
format passes
format:check passes
check passes
drizzle migration files are generated under drizzle/
```

- [ ] **Step 7: Commit and stop**

Run:

```bash
git add -A
git commit -m "Add Drizzle SQLite schema"
```

Stop and wait for user confirmation.

## Task 5: First App Shell UI

**Files:**

- Create: `src/renderer/features/shell/AppShell.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Create app shell component**

Create `src/renderer/features/shell/AppShell.tsx`:

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

- [ ] **Step 2: Wire App to shell**

Modify `src/renderer/App.tsx`:

```tsx
import { AppShell } from "./features/shell/AppShell";

export const App = () => {
  return <AppShell />;
};
```

- [ ] **Step 3: Style dense desktop shell**

Modify `src/renderer/styles.css` with a restrained desktop tool layout:

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

- [ ] **Step 4: Verify UI shell**

Run:

```bash
pnpm run format
pnpm run format:check
pnpm run check
pnpm run build
```

Expected:

```text
all commands exit with code 0
```

- [ ] **Step 5: Commit and stop**

Run:

```bash
git add -A
git commit -m "Add desktop app shell UI"
```

Stop and wait for user confirmation.

## Plan Self-Review

- Spec coverage: This plan covers the v1 foundation from the existing Electron shell through React renderer, typed IPC, Drizzle/SQLite schema, and the first desktop UI shell. Deeper source sync, Git adapters, scanning, planning, and installer behavior should be separate implementation plans.
- Placeholder scan: No banned placeholder markers or undefined task references remain.
- Type consistency: Table and API names match the current design docs, including `skill_target_preferences`.
