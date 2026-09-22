import { dateKey, getBest100SourceUrl, MAX_SCHEDULED_ATTEMPTS, type Best100Meta } from "./source";
import { fetchBest100Csv } from "./fetch-best-100";
import { readStore, writeStore, type KvEnv } from "./kv";

export type WorkerEnv = KvEnv & {
  SKILLS_MANAGER_NOTIFY_WEBHOOK_URL?: string;
};

export const notify = async (env: WorkerEnv, message: string): Promise<void> => {
  console.error(message);

  const webhookUrl = env.SKILLS_MANAGER_NOTIFY_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: message })
    });
  } catch (error) {
    console.error("Failed to deliver notification webhook.", error);
  }
};

/**
 * Runs one fetch cycle against the source and updates KV.
 *
 * Retry contract (mirrors the client side):
 * - Within a UTC day the scheduled cron fires up to MAX_SCHEDULED_ATTEMPTS times.
 * - On success: overwrite the KV value, record success, and stop for the day.
 * - On failure: persist the error; if attempts are exhausted, mark failed and notify;
 *   otherwise return so the next cron slot retries.
 *
 * `force: true` (manual refresh) ignores the "already done today" short-circuit.
 */
export const runScheduledFetch = async (
  env: WorkerEnv,
  options?: { force?: boolean }
): Promise<Best100Meta> => {
  const now = new Date();
  const today = dateKey(now);
  const source = getBest100SourceUrl(now);

  const existing = await readStore(env);
  const meta: Best100Meta = existing?.meta ?? {
    status: "idle",
    attempts: 0,
    attemptDate: "",
    lastSuccessDate: "",
    lastSuccessAt: "",
    lastError: null,
    lastAttemptAt: "",
    source
  };
  const existingCsv = existing?.csv ?? "";

  // Reset the per-day attempt series when a new UTC day begins.
  if (meta.attemptDate !== today) {
    meta.attempts = 0;
    meta.attemptDate = today;
    meta.status = meta.lastSuccessDate === today ? "success" : "idle";
  }

  if (!options?.force && meta.status === "success" && meta.lastSuccessDate === today) {
    console.log(`[best-100] already fetched today at ${meta.lastSuccessAt}; skipping.`);
    return meta;
  }

  const fetched = await fetchBest100Csv(source);

  if (fetched.ok) {
    const next: Best100Meta = {
      ...meta,
      status: "success",
      attempts: meta.attempts + 1,
      lastSuccessDate: today,
      lastSuccessAt: now.toISOString(),
      lastAttemptAt: now.toISOString(),
      lastError: null,
      source
    };

    await writeStore(env, { csv: fetched.csv, meta: next });
    console.log(`[best-100] success: stored ${fetched.rowCount} rows at ${now.toISOString()}.`);
    return next;
  }

  const attempts = meta.attempts + 1;

  if (attempts >= MAX_SCHEDULED_ATTEMPTS) {
    const next: Best100Meta = {
      ...meta,
      status: "failed",
      attempts,
      lastError: fetched.error,
      lastAttemptAt: now.toISOString(),
      source
    };

    // Keep any previously cached CSV; only refresh the meta on failure.
    await writeStore(env, { csv: existingCsv, meta: next });
    await notify(env, `[best-100] FAILED after ${attempts} attempts: ${fetched.error}`);
    return next;
  }

  const next: Best100Meta = {
    ...meta,
    status: "idle",
    attempts,
    lastError: fetched.error,
    lastAttemptAt: now.toISOString(),
    source
  };

  await writeStore(env, { csv: existingCsv, meta: next });
  console.warn(`[best-100] attempt ${attempts} failed: ${fetched.error}; will retry.`);
  return next;
};
