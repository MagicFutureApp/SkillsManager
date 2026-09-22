/** Local Settings key that stores the cache-manager Worker base URL. */
export const BEST_100_SETTINGS_KEY = "best100";

/** Local Settings key that persists the daily sync attempt state. */
export const BEST_100_SYNC_STATE_KEY = "best100.sync";

/** Worker endpoint that returns the raw best-100 CSV. */
export const BEST_100_API_PATH = "/api/best-100.csv";

// Values below are injected at build time from environment variables via
// scripts/generate-build-env.mjs (see src/generated/build-env.ts). They are NOT
// hardcoded here so production bundles carry the configured secret/endpoint and
// dev builds fall back to the local wrangler instance.
import { BUILD_ENV } from "../../generated/build-env";

/**
 * Token authenticating the desktop against the cache-manager Worker's read/sync
 * endpoints. Sourced from the SKILLS_MANAGER_CACHE_SYNC_TOKEN build var. The more
 * sensitive admin token (POST /api/refresh) is NOT shipped with the desktop.
 */
export const BEST_100_SYNC_TOKEN = BUILD_ENV.best100SyncToken;

/**
 * Default Worker base URL baked into the app from BEST_100_DEFAULT_API_BASE. The
 * user can still override it per-install in Settings. Falls back to the local
 * wrangler dev instance when built without the env var set.
 */
export const BEST_100_DEFAULT_API_BASE = BUILD_ENV.best100ApiBase;

/** Client-side retries: UTC 01:00-01:40 window every 10 minutes yields up to 4 attempts. */
export const BEST_100_MAX_ATTEMPTS = 4;

/** Spacing between client retry attempts. */
export const BEST_100_RETRY_INTERVAL_MS = 10 * 60 * 1000;
