# Skills Manager

A local-first Skills Manager monorepo.

## Workspace layout

- `apps/desktop`: Electron, React, TypeScript, and SQLite desktop application.
- `apps/landing`: TanStack Start landing page deployed to Cloudflare Workers.
- `apps/cache-manager`: Cloudflare Hono catalog and skill detail cache manager.
- `apps/token-broker`: Vercel OIDC Token Broker used by the cache manager.

Cache Manager and Token Broker are separate deployable workspaces. The Cloudflare Worker calls the
Vercel Broker through its protected HTTP endpoint; neither application imports code from the other.

## Commands

Run commands from the repository root. Root scripts forward to `@skills-manager/desktop`:

```bash
pnpm run dev
pnpm run build
pnpm run package:win
pnpm run package:mac
pnpm run package:linux
pnpm run check
pnpm test
pnpm run format:check
pnpm run cache:check
pnpm run cache:test
pnpm run token:check
pnpm run token:test
```

## Build installable desktop apps

The packaging commands build exactly one supported architecture per platform:

- `pnpm run package:win`: Windows 11 compatible x64 NSIS installer (`.exe`).
- `pnpm run package:mac`: macOS arm64 disk image (`.dmg`).
- `pnpm run package:linux`: Ubuntu x64 Debian package (`.deb`).

Run each command on its matching operating system. Output is written to
`apps/desktop/release/`.

The GitHub Actions workflow `.github/workflows/build-desktop-installers.yml` runs the three
native builds in parallel. It can be started manually from the Actions tab and also runs when a
tag matching `v*` is pushed. Manual builds upload the installers as workflow artifacts for 14
days. Tag builds also create or update the matching public GitHub Release and attach the Windows,
macOS, and Ubuntu installers together with `SHA256SUMS.txt` and `latest.json`. The Release job uses
the workflow `GITHUB_TOKEN` to publish to the current repository, then writes the same manifest to
the Cloudflare KV namespace configured for the landing Worker.

The source repository must define `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and
`CLOUDFLARE_RELEASE_KV_NAMESPACE_ID` as GitHub Actions secrets.

Before pushing a release tag, make sure it matches the desktop package version. For example, the
version `0.1.0` in `apps/desktop/package.json` should be released with:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The current packages are unsigned. Windows SmartScreen and macOS Gatekeeper may therefore show a
warning until code-signing credentials are configured in GitHub Actions.

To run a desktop command directly:

```bash
pnpm --filter @skills-manager/desktop run build
```

## Rebuild better-sqlite3 for Electron

The rebuild script reads the currently installed Electron version and configures the native build
for that runtime automatically:

```shell
pnpm run rebuild:better-sqlite3
```

## License

Distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

- Copyright © 2026 Liang ([https://sk.magicfuture.app](https://sk.magicfuture.app))
- Full license text: [`LICENSE`](./LICENSE) (中文说明见 [`LICENSE.zh.md`](./LICENSE.zh.md))
- For proprietary or commercial use, contact the copyright holder for a separate **Commercial License**.
