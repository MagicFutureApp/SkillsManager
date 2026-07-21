# Native 依赖重建

本项目使用 `better-sqlite3`，它包含 native `.node` 二进制文件。删除 `node_modules` 并重新执行 `pnpm install` 后，启动桌面应用前需要为 Electron runtime 重新构建 `better-sqlite3`。

下面的脚本会从 `node_modules/electron/package.json` 读取当前已安装的 Electron 版本。因此，即使 `package.json` 里的 Electron 版本后续变化，也不需要手动改脚本里的版本号。

## Windows PowerShell

在仓库根目录执行：

```powershell
pnpm install

$electronVersion = node -p "require('./node_modules/electron/package.json').version"
$env:npm_config_runtime = "electron"
$env:npm_config_target = $electronVersion
$env:npm_config_disturl = "https://electronjs.org/headers"
pnpm rebuild better-sqlite3
Remove-Item Env:\npm_config_runtime
Remove-Item Env:\npm_config_target
Remove-Item Env:\npm_config_disturl
```

验证：

```powershell
pnpm run electron:version

$env:ELECTRON_RUN_AS_NODE = "1"
node node_modules\electron\cli.js -e "require('better-sqlite3'); console.log('better-sqlite3 ok')"
Remove-Item Env:\ELECTRON_RUN_AS_NODE
```

启动开发环境：

```powershell
pnpm run dev
```

## macOS / zsh or bash

在仓库根目录执行：

```bash
pnpm install

ELECTRON_VERSION="$(node -p "require('./node_modules/electron/package.json').version")"
npm_config_runtime=electron \
npm_config_target="$ELECTRON_VERSION" \
npm_config_disturl=https://electronjs.org/headers \
pnpm rebuild better-sqlite3
```

验证：

```bash
pnpm run electron:version

ELECTRON_RUN_AS_NODE=1 node node_modules/electron/cli.js -e "require('better-sqlite3'); console.log('better-sqlite3 ok')"
```

启动开发环境：

```bash
pnpm run dev
```

## 注意事项

- Electron 应用开发时不要只执行普通的 `pnpm rebuild better-sqlite3`。如果没有设置 Electron runtime 相关环境变量，native binary 可能会被重建为系统 Node.js 的 ABI，而不是 Electron 的 ABI。
- 如果 Windows 上重建时报 `EPERM`，先关闭正在运行的 Skills Manager/Electron 应用，然后重试。
- 如果错误信息里出现 `NODE_MODULE_VERSION` 不匹配，重新执行对应平台的 rebuild 脚本。
