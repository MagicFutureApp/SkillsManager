export const SIDEBAR_EXPAND_WIDTH = 232;
export const SIDEBAR_COLLAPSE_WIDTH = 64;
export const MAIN_MINI_WIDTH = 996;
export const SIDEBAR_AUTO_COLLAPSE_WIDTH = MAIN_MINI_WIDTH + SIDEBAR_EXPAND_WIDTH;
export const WINDOW_MIN_WIDTH = MAIN_MINI_WIDTH + SIDEBAR_COLLAPSE_WIDTH + 16; // todo windows mac Linux 16px margin
export const WINDOW_MIN_HEIGHT = 640;

export const APP_META = {
  title: "Skills Manager",
  description: "Sync and Distribute Skills"
} as const;

export const SKILLS_MANAGER_BASE_URL = "https://sk.magicfuture.app";

export const GITHUB_TOKEN_HELP_URL = `${SKILLS_MANAGER_BASE_URL}/help/github-token`;

export const OFFICIAL_SITE_URL = SKILLS_MANAGER_BASE_URL;

export const RELEASE_MANIFEST_URL = `${SKILLS_MANAGER_BASE_URL}/api/releases/latest`;

/**
 * cache-manager catalog API base URL, consumed by the Electron main process only.
 *
 * The renderer never talks to this host directly; it goes through the
 * `catalog:*` IPC channels. Development and self-hosted builds can override it
 * with the `SKILLS_MANAGER_CATALOG_BASE_URL` environment variable (same
 * mechanism as `VITE_DEV_SERVER_URL`); packaged builds use this constant.
 */
export const CATALOG_BASE_URL = "https://skills-manager-cache-manager.mockplus.workers.dev";

/**
 * Resolve the catalog base URL with trailing slashes stripped so URL joins
 * never produce `//v1/catalog`. `env` is injectable to keep this pure for tests.
 */
export const resolveCatalogBaseUrl = (
  env: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env
): string => (env.SKILLS_MANAGER_CATALOG_BASE_URL ?? CATALOG_BASE_URL).trim().replace(/\/+$/, "");
