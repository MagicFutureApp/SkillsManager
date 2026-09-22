import {
  BEST_100_MAX_ATTEMPTS,
  BEST_100_RETRY_INTERVAL_MS
} from "./constants";

export type Best100SyncStatus = "idle" | "success" | "failed" | "unconfigured";

export type Best100SyncState = {
  /** UTC date key (YYYY-MM-DD) of the current attempt series. */
  date: string;
  attempts: number;
  status: Best100SyncStatus;
  lastError: string | null;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
};

export type Best100FetchResult = { ok: true; csv: string } | { ok: false; error: string };

export type Best100SyncDeps = {
  apiBaseUrl: string;
  getState: () => Promise<Best100SyncState | null>;
  setState: (state: Best100SyncState) => Promise<void>;
  fetchCsv: (apiBaseUrl: string) => Promise<Best100FetchResult>;
  parseAndStore: (csv: string) => Promise<number>;
  now: () => Date;
  /** Schedules the next retry; injectable so tests can run synchronously. */
  schedule: (delayMs: number, run: () => void) => void;
  log: (message: string) => void;
};

const dateKey = (date: Date): string => date.toISOString().slice(0, 10);

const createInitialState = (today: string): Best100SyncState => ({
  date: today,
  attempts: 0,
  status: "idle",
  lastError: null,
  lastSuccessAt: null,
  lastAttemptAt: null
});

/**
 * Runs one client sync cycle against the cache-manager Worker and updates local SQLite.
 *
 * Contract (mirrors the Worker side):
 * - On success: overwrite local data, record success, log, and stop.
 * - On failure: persist the error; if attempts reach MAX_ATTEMPTS, mark failed and log;
 *   otherwise schedule the next attempt 10 minutes later (within the UTC 01:00-01:40 window
 *   or on daily client launch) and stop this cycle.
 *
 * The next scheduled run re-invokes this function, which re-reads persisted state.
 */
export const runBest100Sync = async (
  deps: Best100SyncDeps
): Promise<Best100SyncState> => {
  const now = deps.now();
  const today = dateKey(now);

  if (!deps.apiBaseUrl.trim()) {
    const next: Best100SyncState = {
      ...createInitialState(today),
      status: "unconfigured",
      lastError: "API base URL not configured",
      lastAttemptAt: now.toISOString()
    };

    await deps.setState(next);
    deps.log("[best-100] sync skipped: API base URL not configured.");
    return next;
  }

  const prev = (await deps.getState()) ?? createInitialState(today);
  const state: Best100SyncState = { ...prev };

  if (state.date !== today) {
    state.attempts = 0;
    state.date = today;
    state.status =
      state.lastSuccessAt && dateKey(new Date(state.lastSuccessAt)) === today ? "success" : "idle";
  }

  if (
    state.status === "success" &&
    state.lastSuccessAt &&
    dateKey(new Date(state.lastSuccessAt)) === today
  ) {
    deps.log(`[best-100] already synced today at ${state.lastSuccessAt}; skipping.`);
    return state;
  }

  const fetched = await deps.fetchCsv(deps.apiBaseUrl.trim());

  if (fetched.ok) {
    const count = await deps.parseAndStore(fetched.csv);
    const next: Best100SyncState = {
      date: today,
      attempts: state.attempts + 1,
      status: "success",
      lastError: null,
      lastSuccessAt: now.toISOString(),
      lastAttemptAt: now.toISOString()
    };

    await deps.setState(next);
    deps.log(`[best-100] success: stored ${count} skills at ${now.toISOString()}.`);
    return next;
  }

  const attempts = state.attempts + 1;

  if (attempts >= BEST_100_MAX_ATTEMPTS) {
    const next: Best100SyncState = {
      date: today,
      attempts,
      status: "failed",
      lastError: fetched.error,
      lastSuccessAt: state.lastSuccessAt,
      lastAttemptAt: now.toISOString()
    };

    await deps.setState(next);
    deps.log(`[best-100] FAILED after ${attempts} attempts: ${fetched.error}`);
    return next;
  }

  const next: Best100SyncState = {
    date: today,
    attempts,
    status: "idle",
    lastError: fetched.error,
    lastSuccessAt: state.lastSuccessAt,
    lastAttemptAt: now.toISOString()
  };

  await deps.setState(next);
  deps.log(
    `[best-100] attempt ${attempts} failed: ${fetched.error}; will retry in 10 minutes.`
  );
  deps.schedule(BEST_100_RETRY_INTERVAL_MS, () => {
    void runBest100Sync(deps);
  });

  return next;
};
