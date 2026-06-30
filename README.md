# SkillsManager

An Electron React TypeScript SQLite based Skills Manager App.

## Rebuild better-sqlite3 for Electron

Windows PowerShell:

```powershell
$env:npm_config_runtime="electron"; $env:npm_config_target="41.7.1"; $env:npm_config_disturl="https://electronjs.org/headers"; pnpm rebuild better-sqlite3
```

Bash / macOS / Linux:

```bash
npm_config_runtime=electron npm_config_target="41.7.1" npm_config_disturl=https://electronjs.org/headers pnpm rebuild better-sqlite3
```
