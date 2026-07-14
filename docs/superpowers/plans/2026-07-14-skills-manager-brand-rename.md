# Skills Manager Brand Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the retired brand with the plural `Skills Manager` name throughout active source, tests, assets, package configuration, and documentation.

**Architecture:** Keep this as a naming-only change across the existing monorepo. Update test expectations before production strings, use Git-aware asset moves, and preserve the existing `.skills-manager` cache directory and `skills-manager.sqlite` database file.

**Tech Stack:** pnpm workspace, Electron 41, React 19, TypeScript 6, Vite 8, Vitest

---

### Task 1: Establish Failing Brand Expectations

**Files:**

- Modify: `apps/desktop/src/core/app-constants.test.ts`
- Modify: `apps/desktop/src/main/i18n/main-messages.test.ts`
- Modify: `apps/desktop/src/main/tray-icon.test.ts`
- Modify: `apps/desktop/src/renderer/features/shell/app-shell.test.tsx`
- Modify: `apps/desktop/src/renderer/features/shell/app-sidebar.test.tsx`
- Modify: `apps/desktop/src/renderer/features/settings/settings-page.test.tsx`

- [x] **Step 1: Change focused expectations to the approved name**

Use these exact target values:

```ts
expect(APP_META).toEqual({
  title: "Skills Manager",
  description: "Sync and Distribute Skills"
});
expect(getMainMessages("zh-CN").tray.show).toBe("显示 Skills Manager");
expect(getMainMessages("en-US").tray.show).toBe("Show Skills Manager");
const expectedIconPath = path.normalize(path.join("dist", "renderer", "skills-manager-mark.png"));
```

Update shell and settings accessible-name assertions to `Skills Manager`. Rename test-local asset
variables to `skillsManagerMark`.

- [x] **Step 2: Run focused tests and verify the old implementation fails**

Run:

```bash
pnpm --dir apps/desktop exec vitest run src/core/app-constants.test.ts src/main/i18n/main-messages.test.ts src/main/tray-icon.test.ts src/renderer/features/shell/app-shell.test.tsx src/renderer/features/shell/app-sidebar.test.tsx src/renderer/features/settings/settings-page.test.tsx
```

Expected: FAIL because production metadata, messages, UI strings, and asset paths still use the
retired brand.

### Task 2: Rename Runtime Brand And Assets

**Files:**

- Modify: `apps/desktop/src/core/app-constants.ts`
- Modify: `apps/desktop/src/main/index.ts`
- Modify: `apps/desktop/src/main/i18n/main-messages.ts`
- Modify: `apps/desktop/src/main/tray-icon.ts`
- Modify: `apps/desktop/vite.config.ts`
- Modify: `apps/desktop/src/renderer/index.html`
- Modify: `apps/desktop/src/renderer/features/settings/settings-page.tsx`
- Modify: `apps/desktop/src/renderer/features/shell/app-shell.tsx`
- Modify: `apps/desktop/src/renderer/features/shell/app-sidebar.tsx`
- Move: legacy mark SVG to `apps/desktop/src/renderer/assets/skills-manager-mark.svg`
- Move: legacy mark PNG to `apps/desktop/src/renderer/assets/skills-manager-mark.png`
- Move: legacy logo SVG to `apps/desktop/src/renderer/assets/skills-manager-logo.svg`

- [x] **Step 1: Move the three assets with Git history**

Use `git mv` for each legacy asset so Git records all three target paths as renames.

- [x] **Step 2: Replace runtime strings and asset identifiers**

Use these exact forms:

```ts
export const APP_META = {
  title: "Skills Manager",
  description: "Sync and Distribute Skills"
} as const;

const APP_ICON_FILE = "skills-manager-mark.png";
import skillsManagerMark from "../../assets/skills-manager-mark.svg";
```

Use `Skills Manager` in user-visible text, SVG metadata, SVG wordmark text, HTML title, image alt
text, and startup errors. Use `skillsManagerMark` for TypeScript import variables and
`skills-manager-mark.*` for asset paths.

- [x] **Step 3: Run focused tests and verify they pass**

Run the Task 1 focused Vitest command from the desktop workspace.

Expected: PASS for all focused files. The package filter remains old until Task 3 changes package
configuration.

### Task 3: Rename Package Scope, Fixtures, And Documentation

**Files:**

- Modify: `package.json`
- Modify: `apps/desktop/package.json`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-14-monorepo-migration.md`
- Modify: `apps/desktop/src/main/app-storage.test.ts`
- Modify: `apps/desktop/src/renderer/features/settings/settings-page.test.tsx`
- Modify: `apps/desktop/src/renderer/features/repositories/repositories-page.test.tsx`
- Modify: `apps/desktop/src/renderer/features/skills/skills-page.test.tsx`
- Modify: `apps/desktop/src/renderer/features/targets/targets-page.test.tsx`

- [x] **Step 1: Change the desktop package scope**

Set the desktop package name and every root filter to:

```json
"name": "@skills-manager/desktop",
"productName": "Skills Manager"
```

Update README commands and the monorepo migration record to use `@skills-manager/desktop`.

- [x] **Step 2: Update test fixtures to the approved product name**

Use these exact fixture values:

```ts
{ name: "Skills Manager", version: "0.1.0" }
"/Users/andrew/Library/Application Support/Skills Manager/skills-manager.sqlite"
```

Do not rename `.skills-manager` or `skills-manager.sqlite` because they already match the target
brand.

- [x] **Step 3: Refresh lockfile metadata without rebuilding dependencies**

Run:

```bash
pnpm install --lockfile-only
```

Expected: exit code 0 and no dependency version changes required for the package rename.

### Task 4: Verify No Active Old Brand Remains

**Files:**

- Verify: repository active source and file names
- Update: `docs/superpowers/plans/2026-07-14-skills-manager-brand-rename.md`

- [x] **Step 1: Scan active text and file names**

Run:

```powershell
rg -n -i --hidden --glob '!node_modules/**' --glob '!.git/**' '[s]killport' .
rg --files --hidden -g '!node_modules/**' -g '!.git/**' | rg -i '[s]killport'
```

Expected: both commands return no matches. Ignored generated directories are not searched.

- [x] **Step 2: Run static and build verification**

Run:

```bash
pnpm run check
pnpm run build
git diff --check
```

Expected: all commands exit 0. The build may retain the existing Vite chunk-size warning.

- [x] **Step 3: Run the full test suite**

Run:

```bash
pnpm test
```

Expected: all rename-focused tests pass. If the existing `better-sqlite3` ABI 145/137, Windows
path, or unrelated i18n baseline failures remain, record their exact counts without modifying
unrelated behavior.

- [x] **Step 4: Review final scope**

Confirm `git diff --summary` shows the three asset renames, naming-only text changes, the design
and implementation plan documents, and no unrelated source changes. Do not commit unless the user
explicitly requests it.

## Verification Results

- Retired-brand text scan: no active matches.
- Retired-brand file-name scan: no active matches.
- Focused rename suite: 9 files and 127 tests passed.
- `pnpm run check`: passed.
- `pnpm run build`: passed with the existing Vite chunk-size warning.
- `git diff --check`: passed.
- Electron product identity probe: `app.getName()` returned `Skills Manager` and `userData`
  resolved to `%APPDATA%/Skills Manager`.
- Full `pnpm test`: 28 files and 207 tests passed; 13 files and 76 tests failed. The existing
  native ABI, Windows path, and i18n baseline failures remain.
- Data compatibility: the rename is intentionally treated as a new project. Electron uses the new
  `Skills Manager` product identity and no legacy `userData` migration is provided.
