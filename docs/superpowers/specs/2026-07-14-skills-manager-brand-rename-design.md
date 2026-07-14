# Skills Manager Brand Rename Design

**Status:** Approved direction, pending written-spec review

## Goal

Replace the retired product name throughout the active repository source of truth with the plural
product name `Skills Manager`, while preserving existing application behavior and the current
monorepo structure.

## Naming Rules

Use the form that matches each context:

| Context | Name |
| --- | --- |
| User-facing product name | `Skills Manager` |
| PascalCase identifier | `SkillsManager` |
| camelCase identifier | `skillsManager` |
| Package scope, file name, URL-style slug | `skills-manager` |
| snake_case identifier, if required | `skills_manager` |

The desktop workspace package becomes `@skills-manager/desktop`. Asset files become
`skills-manager-mark.svg`, `skills-manager-mark.png`, and `skills-manager-logo.svg`. TypeScript
imports and local variables use names such as `skillsManagerMark`.

## Scope

Update every retired-brand occurrence in active source, tests, package scripts, README content,
and repository plans. Rename the three desktop renderer assets with Git-aware moves and update
every reference to their new file names.

Generated or tool-owned ignored content under `dist`, `release`, `.idea`, and `.superpowers` is
out of scope. Builds regenerate distributable output from the renamed source assets.

## Runtime Behavior

This is a naming-only change. Keep the existing `.skills-manager` cache directory and
`skills-manager.sqlite` database file because they already use the target name.

The desktop package sets `productName` to `Skills Manager`, so Electron uses the new product name
for its system-level application identity and fresh `userData` directory. Tests that use the
application data directory as sample input use `/Application Support/Skills Manager`.

This repository is treated as a new project for this rename. Existing data from directories based
on the retired package identity is not migrated or reused.

SVG geometry and PNG pixels remain unchanged. Only asset file names, SVG accessibility metadata,
and the SVG wordmark text change. The existing PNG alpha regression test continues to validate
the renamed PNG asset.

## Implementation And Verification

Update focused expectations first and run them to confirm they fail against the old name. Then
rename production strings, identifiers, package scope references, and assets until those tests
pass.

Run the following verification after implementation:

- Case-insensitive repository scan proving no active retired-brand text or file names remain.
- Focused app metadata, main message, shell, settings, and tray icon tests.
- `pnpm run check`.
- `pnpm run build`.
- `git diff --check`.
- Full `pnpm test`, reporting the existing native ABI, Windows path, or i18n baseline failures
  separately if they remain unrelated to the rename.

No dependency, database schema, IPC contract, or product behavior changes are included.
