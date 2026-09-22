import { describe, expect, it } from "vitest";

import { BEST_100_MAX_ATTEMPTS } from "./constants";
import {
  runBest100Sync,
  type Best100SyncDeps,
  type Best100SyncState
} from "./scheduler";

const baseNow = new Date("2026-09-20T01:05:00.000Z");

type HarnessOpts = {
  apiBaseUrl?: string;
  failError?: string;
};

const createHarness = (opts: HarnessOpts = {}) => {
  let persisted: Best100SyncState | null = null;
  const calls = { fetch: 0, parse: 0, store: 0, schedule: 0 };
  const deps: Best100SyncDeps = {
    apiBaseUrl: opts.apiBaseUrl ?? "https://worker.example.dev",
    getState: async () => persisted,
    setState: async (state) => {
      persisted = state;
      calls.store += 1;
    },
    fetchCsv: async () => {
      calls.fetch += 1;
      return opts.failError
        ? { ok: false, error: opts.failError }
        : { ok: true, csv: "rank,skill,skill_key\n1,a,ss:a" };
    },
    parseAndStore: async () => {
      calls.parse += 1;
      return 1;
    },
    now: () => baseNow,
    schedule: () => {
      calls.schedule += 1;
    },
    log: () => {}
  };

  return { calls, deps, getPersisted: () => persisted };
};

describe("runBest100Sync", () => {
  it("overwrites local data and stops on success", async () => {
    const { calls, deps, getPersisted } = createHarness();

    const result = await runBest100Sync(deps);

    expect(result.status).toBe("success");
    expect(result.attempts).toBe(1);
    expect(calls.fetch).toBe(1);
    expect(calls.parse).toBe(1);
    expect(calls.schedule).toBe(0);
    expect(getPersisted()?.status).toBe("success");
  });

  it("skips and records unconfigured when the API URL is empty", async () => {
    const { calls, deps } = createHarness({ apiBaseUrl: "   " });

    const result = await runBest100Sync(deps);

    expect(result.status).toBe("unconfigured");
    expect(calls.fetch).toBe(0);
    expect(calls.parse).toBe(0);
    expect(calls.store).toBe(1);
  });

  it("retries up to MAX_ATTEMPTS then stops with failed status", async () => {
    const { calls, deps, getPersisted } = createHarness({ failError: "boom" });

    let last = await runBest100Sync(deps);

    for (let attempt = 1; attempt < BEST_100_MAX_ATTEMPTS; attempt += 1) {
      last = await runBest100Sync(deps);
    }

    expect(last.status).toBe("failed");
    expect(last.attempts).toBe(BEST_100_MAX_ATTEMPTS);
    expect(calls.fetch).toBe(BEST_100_MAX_ATTEMPTS);
    expect(calls.parse).toBe(0);
    // Each failed attempt schedules a retry, except the final failed one.
    expect(calls.schedule).toBe(BEST_100_MAX_ATTEMPTS - 1);
    expect(getPersisted()?.lastError).toBe("boom");
  });

  it("stops at success after intermediate failures", async () => {
    const { calls, deps } = createHarness();
    let attempt = 0;

    deps.fetchCsv = async () => {
      attempt += 1;
      return attempt >= 3
        ? { ok: true, csv: "rank,skill,skill_key\n1,a,ss:a" }
        : { ok: false, error: "x" };
    };

    let last = await runBest100Sync(deps);
    last = await runBest100Sync(deps);
    last = await runBest100Sync(deps);

    expect(last.status).toBe("success");
    expect(last.attempts).toBe(3);
    expect(calls.parse).toBe(1);
    expect(calls.schedule).toBe(2);
  });

  it("does not re-fetch on the same day once synced successfully", async () => {
    const { calls, deps } = createHarness();

    const first = await runBest100Sync(deps);
    const second = await runBest100Sync(deps);

    expect(first.status).toBe("success");
    expect(second.status).toBe("success");
    expect(calls.fetch).toBe(1);
    expect(calls.parse).toBe(1);
  });
});
