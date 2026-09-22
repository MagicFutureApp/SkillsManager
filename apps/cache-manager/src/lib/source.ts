/** UTC date key (YYYY-MM-DD), aligned with the upstream dated snapshot dirs. */
export const dateKey = (date: Date): string => date.toISOString().slice(0, 10);

const BEST_100_BASE_URL = "https://raw.githubusercontent.com/LinklyAI/best-skills/main/data";

/**
 * Builds the per-UTC-date source URL.
 *
 * Pinning to the date (instead of the rolling `latest` dir) makes a missing
 * day explicit: when upstream does not publish today's snapshot the request
 * 404s, we keep the previously cached CSV, and the status becomes `failed`
 * instead of silently serving yesterday's data under a "success" flag.
 */
export const getBest100SourceUrl = (now: Date = new Date()): string =>
  `${BEST_100_BASE_URL}/${dateKey(now)}/rankings/best-100.csv`;

export const BEST_100_KV_KEY = "Best100Skills";

/** UTC 00:30-01:30 every 10 minutes yields exactly 6 cron slots per day. */
export const MAX_SCHEDULED_ATTEMPTS = 6;

export type Best100Status = "idle" | "success" | "failed";

export type Best100Meta = {
  status: Best100Status;
  /** Attempts made within the current day's scheduled window. */
  attempts: number;
  /** UTC date key (YYYY-MM-DD) of the current attempt series. */
  attemptDate: string;
  /** UTC date key (YYYY-MM-DD) of the last successful fetch. */
  lastSuccessDate: string;
  /** ISO timestamp of the last successful fetch. */
  lastSuccessAt: string;
  /** Last error message, or null when the last attempt succeeded. */
  lastError: string | null;
  /** ISO timestamp of the last attempt. */
  lastAttemptAt: string;
  /** Source URL the data was fetched from. */
  source: string;
};

export type Best100Store = {
  csv: string;
  meta: Best100Meta;
};

export const createDefaultMeta = (source: string): Best100Meta => ({
  status: "idle",
  attempts: 0,
  attemptDate: "",
  lastSuccessDate: "",
  lastSuccessAt: "",
  lastError: null,
  lastAttemptAt: "",
  source
});
