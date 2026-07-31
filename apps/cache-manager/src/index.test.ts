import { describe, expect, it } from "vitest";

import worker from "./index";
import { MemoryKv } from "./test/memory-kv";

describe("Cloudflare Worker entrypoint", () => {
  it("delegates fetch requests to the Hono app without losing its instance binding", async () => {
    const response = await worker.fetch(
      new Request("https://cache.example/health"),
      {
        SKILLS_SH_CACHE: new MemoryKv(),
        SKILLS_SH_TOKEN_URL: "https://token.example/api/token",
        SKILLS_SH_TOKEN_SECRET: "token-secret",
        CACHE_ADMIN_TOKEN: "admin-secret"
      },
      {
        passThroughOnException: () => undefined,
        props: {},
        waitUntil: () => undefined
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "skills-manager-cache-manager"
    });
    expect("scheduled" in worker).toBe(false);
  });
});
