# Source Sync And Skill Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual source sync that copies or clones sources into the unified local cache, scans `SKILL.md` files, writes Skills records to SQLite, and shows them on the Skills page.

**Architecture:** Renderer keeps filesystem and Git behind typed preload/IPC APIs. Main process orchestrates Git/local copy and database writes. Core contains pure scanning utilities so skill discovery can be tested without Electron.

**Tech Stack:** Electron main/preload IPC, React renderer, TypeScript, SQLite/Drizzle, Node filesystem APIs, system `git`, Vitest.

---

## File Structure

- Create `src/core/skills/skill-scanner.ts`: scan a local source root for `SKILL.md` entries and normalize skill metadata.
- Create `src/core/skills/skill-scanner.test.ts`: verify convention scanning and description parsing.
- Create `src/core/skills/skill-api.ts`: shared API types for Skills page records.
- Create `src/db/repositories/skillRepository.ts`: list indexed Skills from SQLite.
- Create `src/db/repositories/skillRepository.test.ts`: verify Skills page data comes from DB rows.
- Modify `src/db/repositories/repositoryRepository.ts`: add sync persistence for skill units, versions, sync runs, repository scan metadata.
- Modify `src/main/ipc/repositories.ts`: add `syncRepositories`, Git/local copy file operations, and IPC registration.
- Create `src/main/ipc/skills.ts`: register `skills:list`.
- Modify `src/main/index.ts`, `src/main/preload.ts`, `src/renderer/global.d.ts`: expose new APIs.
- Modify `src/renderer/features/repositories/hooks/use-repositories-page-state.ts`: call real sync IPC and confirm local copy.
- Modify `src/renderer/features/skills/*`: load, filter, select, and render real skills from DB.

## Tasks

### Task 1: Core Skill Scanner

- [ ] Write failing test for scanning nested `SKILL.md` files under a temp root.
- [ ] Run `pnpm test src/core/skills/skill-scanner.test.ts` and confirm it fails because the module does not exist.
- [ ] Implement `scanSkillDirectory(rootPath)` with deterministic relative paths, slug IDs, first heading names, and paragraph descriptions.
- [ ] Re-run scanner test and confirm it passes.

### Task 2: DB Skill Listing And Sync Persistence

- [ ] Write failing DB tests for `skillRepository.list()` and repository sync persistence.
- [ ] Run targeted tests and confirm missing repository methods fail.
- [ ] Implement skill listing and repository sync persistence, including `skill_versions` and `sync_runs`.
- [ ] Re-run targeted DB tests.

### Task 3: Main IPC Sync

- [ ] Write failing IPC test proving local source sync copies into `localCachePath` before scanning.
- [ ] Implement `repositories:sync` with injectable file operations for tests and real Git/copy operations for runtime.
- [ ] Add `skills:list` IPC and preload/global types.
- [ ] Re-run main IPC tests.

### Task 4: Renderer Wiring

- [ ] Write failing renderer tests for local sync confirmation and Skills page DB records.
- [ ] Implement source sync button state, local path confirmation, and post-sync reload.
- [ ] Replace static Skills data with page state loaded from `skills:list`.
- [ ] Re-run renderer tests.

### Task 5: Verification

- [ ] Run `pnpm run check`.
- [ ] Run the targeted Vitest files touched by this change.
- [ ] Run `pnpm run format:check`; if needed, run `pnpm run format` and re-check.
