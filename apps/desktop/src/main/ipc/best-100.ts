import { ipcMain } from "electron";

import {
  BEST_100_API_PATH,
  BEST_100_DEFAULT_API_BASE,
  BEST_100_SYNC_STATE_KEY,
  BEST_100_SYNC_TOKEN
} from "../../core/best-100/constants";
import { parseBest100Csv } from "../../core/best-100/parse-csv";
import type { Best100SkillRecord } from "../../core/best-100/parse-csv";
import {
  runBest100Sync,
  type Best100FetchResult,
  type Best100SyncDeps,
  type Best100SyncState
} from "../../core/best-100/scheduler";
import { createAppSettingsRepository } from "../../db/repositories/appSettingsRepository";
import { createBest100Repository } from "../../db/repositories/best100Repository";
import type {
  Best100SearchInput,
  Best100SearchResult
} from "../../db/repositories/best100Repository";
import { resolveDb, type DbClient, type DbProvider } from "./db-provider";

export type Best100StatusResult = {
  state: Best100SyncState | null;
  count: number;
};

/**
 * Resolves the default Worker API base URL for the recommended-skills sync.
 *
 * Precedence:
 * 1. In dev (electron launched with VITE_DEV_SERVER_URL, i.e. `pnpm dev`),
 *    point at the local wrangler dev instance so the desktop and cache-manager
 *    share one local test environment without manual configuration.
 * 2. Otherwise use the build-injected BEST_100_DEFAULT_API_BASE, which CI sets to
 *    the deployed Worker URL (and dev builds fall back to http://localhost:8787).
 *
 * The base URL is fixed at build time; there is no per-install override.
 */
const resolveDefaultApiBase = (): string => {
  const isDev =
    Boolean(process.env.VITE_DEV_SERVER_URL) || process.env.NODE_ENV === "development";

  return isDev ? "http://localhost:8787" : BEST_100_DEFAULT_API_BASE;
};

const readSyncState = async (db: DbClient): Promise<Best100SyncState | null> => {
  const row = await createAppSettingsRepository(db).get(BEST_100_SYNC_STATE_KEY);

  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.valueJson) as Best100SyncState;
  } catch {
    return null;
  }
};

const writeSyncState = async (db: DbClient, state: Best100SyncState): Promise<void> => {
  await createAppSettingsRepository(db).set(BEST_100_SYNC_STATE_KEY, state);
};

const fetchCsvFromApi = async (apiBaseUrl: string): Promise<Best100FetchResult> => {
  try {
    const base = apiBaseUrl.trim().replace(/\/$/, "");
    const url = `${base}${BEST_100_API_PATH}`;
    const response = await fetch(url, {
      headers: {
        "user-agent": "SkillsManager",
        authorization: `Bearer ${BEST_100_SYNC_TOKEN}`
      }
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const csv = await response.text();

    if (!csv.trim()) {
      return { ok: false, error: "empty response body" };
    }

    return { ok: true, csv };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

const buildSyncDeps = (db: DbClient): Omit<Best100SyncDeps, "apiBaseUrl"> => ({
  getState: () => readSyncState(db),
  setState: (state) => writeSyncState(db, state),
  fetchCsv: fetchCsvFromApi,
  parseAndStore: async (csv: string) => {
    const records = parseBest100Csv(csv);

    return createBest100Repository(db).upsertAll(records);
  },
  now: () => new Date(),
  schedule: (delayMs, run) => {
    setTimeout(run, delayMs);
  },
  log: (message) => console.log(message)
});

export const fetchBest100 = async (db: DbClient): Promise<Best100SyncState> => {
  return runBest100Sync({
    apiBaseUrl: resolveDefaultApiBase(),
    ...buildSyncDeps(db)
  });
};

export const searchBest100 = async (
  db: DbClient,
  input: Best100SearchInput
): Promise<Best100SearchResult> => {
  return createBest100Repository(db).search(input ?? {});
};

export const getBest100Status = async (db: DbClient): Promise<Best100StatusResult> => {
  const [state, count] = await Promise.all([
    readSyncState(db),
    createBest100Repository(db).getSyncableCount()
  ]);

  return { state, count };
};

export const registerBest100Ipc = (db: DbProvider): void => {
  ipcMain.handle("best100:fetch", (): Promise<Best100SyncState> => {
    return fetchBest100(resolveDb(db));
  });

  ipcMain.handle(
    "best100:search",
    (_event, input: Best100SearchInput): Promise<Best100SearchResult> => {
      return searchBest100(resolveDb(db), input);
    }
  );

  ipcMain.handle("best100:getStatus", (): Promise<Best100StatusResult> => {
    return getBest100Status(resolveDb(db));
  });
};

export type {
  Best100SearchInput,
  Best100SearchResult,
  Best100SkillRecord,
  Best100SyncState
};
