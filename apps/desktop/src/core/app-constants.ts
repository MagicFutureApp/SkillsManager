import { SKILLS_MANAGER_BASE_URL, SKILLS_MANAGER_CATALOG_BASE_URL } from "./generated-app-config";

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

/**
 * Every remote URL below is derived from build time injected configuration
 * (see `scripts/generate-app-config.ts`). There is deliberately no hardcoded
 * fallback: a packaged build that was assembled without configuration must
 * surface a configuration error instead of silently talking to a stale host.
 *
 * An unconfigured value is the empty string, which propagates as an empty
 * derived URL and makes every consumer fail loudly.
 */
const withBasePath = (path: string): string => (SKILLS_MANAGER_BASE_URL ? `${SKILLS_MANAGER_BASE_URL}${path}` : "");

export { SKILLS_MANAGER_BASE_URL };

export const GITHUB_TOKEN_HELP_URL = withBasePath("/help/github-token");

export const OFFICIAL_SITE_URL = SKILLS_MANAGER_BASE_URL;

export const RELEASE_MANIFEST_URL = withBasePath("/api/releases/latest");

/**
 * cache-manager catalog API base URL, consumed by the Electron main process only.
 *
 * The renderer never talks to this host directly; it goes through the
 * `catalog:*` IPC channels.
 */
export const CATALOG_BASE_URL = SKILLS_MANAGER_CATALOG_BASE_URL;
