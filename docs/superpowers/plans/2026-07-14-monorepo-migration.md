# Skills Manager Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the repository into a pnpm monorepo containing the existing Electron application plus tracked placeholders for future landing and Cloudflare cache-manager applications.

**Architecture:** The repository root becomes a private pnpm workspace and command orchestrator. The existing Electron application moves intact to `apps/desktop`; `apps/landing` and `apps/cache-manager` contain only `.gitkeep` placeholders until their implementations are designed.

**Tech Stack:** pnpm workspace, Electron 41, React 19, TypeScript 6, Vite 8, Vitest, Drizzle ORM, SQLite

---

### Task 1: Establish the workspace layout

**Files:**

- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`
- Create: `apps/landing/.gitkeep`
- Create: `apps/cache-manager/.gitkeep`

- [x] **Step 1: Configure pnpm workspace packages**

Set `pnpm-workspace.yaml` to discover `apps/*` while preserving `nodeLinker: hoisted`.

- [x] **Step 2: Convert the root package into an orchestrator**

Keep the root package private and expose the existing developer commands by forwarding them to `@skills-manager/desktop` with `pnpm --filter`.

- [x] **Step 3: Add tracked application placeholders**

Create empty `.gitkeep` files under `apps/landing` and `apps/cache-manager`. Do not scaffold frontend or Cloudflare dependencies.

### Task 2: Move the Electron application

**Files:**

- Move: `src` to `apps/desktop/src`
- Move: `drizzle` to `apps/desktop/drizzle`
- Move: Electron build, TypeScript, Vite, Vitest, Drizzle, and shadcn configuration files to `apps/desktop`
- Create: `apps/desktop/package.json`

- [x] **Step 1: Move Electron-owned source and configuration**

Use Git-aware moves so file history remains visible. Keep repository-wide documentation, lockfile, workspace configuration, license, and agent instructions at the root.

- [x] **Step 2: Create the desktop package manifest**

Move the existing dependencies and scripts into `apps/desktop/package.json`, rename the package to `@skills-manager/desktop`, and keep all paths package-relative.

- [x] **Step 3: Update configuration references**

Adjust paths only where the move changes their meaning. Preserve Electron main output at `apps/desktop/dist/main/main/index.js` and renderer output at `apps/desktop/dist/renderer`.

### Task 3: Update repository documentation and validate

**Files:**

- Modify: `README.md`

- [x] **Step 1: Document the monorepo commands and layout**

Explain that root commands forward to the desktop package and identify the two reserved application directories.

- [x] **Step 2: Refresh the workspace lockfile**

Run `pnpm install --lockfile-only` so the importer changes from the root package to `apps/desktop` without downloading or rebuilding dependencies.

- [x] **Step 3: Run static and behavioral verification**

Run `pnpm run check`, `pnpm test`, `pnpm run build`, `pnpm run format:check`, and `git diff --check`. Fix only migration-related failures.

- [x] **Step 4: Review the final diff**

Confirm that no Electron source behavior changed, no landing or cache-manager framework was scaffolded, and no user files were removed.

## Verification results

- `pnpm run check`: passed.
- `pnpm run build`: passed.
- `pnpm run electron:version`: passed with Electron `v41.7.1`.
- `pnpm run db:check`: passed outside the sandbox after the sandbox blocked child-process spawn.
- Targeted non-native Vitest run with `--configLoader runner`: 12 files and 53 tests passed.
- Full `pnpm test`: 28 files and 207 tests passed; 13 files failed because the installed `better-sqlite3` binary targets Electron ABI 145 while Node requires ABI 137, plus existing Windows path and i18n assertions. Git blob hashes confirm all 192 Electron files are unchanged.
- Full desktop `format:check`: reported 66 pre-existing source formatting differences. The files changed for this migration pass targeted Prettier and `git diff --check` validation.
