import { describe, expect, it, vi } from "vitest";

import { createUnsignedJwt } from "../test/create-jwt";
import type { WorkerBindings } from "../worker-env";
import { createSkillsShTokenProvider } from "./skills-sh-token";

const bindings: WorkerBindings = {
  SKILLS_SH_CACHE: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  SKILLS_SH_TOKEN_URL: "https://token.example/api/token",
  SKILLS_SH_TOKEN_SECRET: "token-secret",
  CACHE_ADMIN_TOKEN: "admin-secret"
};

describe("skills.sh OIDC token provider", () => {
  it("keeps the token only in isolate memory until shortly before expiry", async () => {
    const currentTime = new Date("2026-07-30T00:00:00.000Z");
    const expiresAt = Math.floor(currentTime.getTime() / 1_000) + 3_600;
    const token = createUnsignedJwt(expiresAt);
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ token, expiresAt }));
    const provider = createSkillsShTokenProvider({ fetchImpl, now: () => currentTime });

    const [first, second] = await Promise.all([
      provider.getToken(bindings),
      provider.getToken(bindings)
    ]);

    expect(first).toBe(token);
    expect(second).toBe(token);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith("https://token.example/api/token", {
      method: "POST",
      headers: { authorization: "Bearer token-secret" }
    });
  });

  it("refreshes a token when less than sixty seconds remain", async () => {
    let currentTime = new Date("2026-07-30T00:00:00.000Z");
    const firstExpiry = Math.floor(currentTime.getTime() / 1_000) + 120;
    const secondExpiry = firstExpiry + 3_600;
    const firstToken = createUnsignedJwt(firstExpiry);
    const secondToken = createUnsignedJwt(secondExpiry);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: firstToken, expiresAt: firstExpiry }))
      .mockResolvedValueOnce(Response.json({ token: secondToken, expiresAt: secondExpiry }));
    const provider = createSkillsShTokenProvider({ fetchImpl, now: () => currentTime });

    expect(await provider.getToken(bindings)).toBe(firstToken);
    currentTime = new Date(currentTime.getTime() + 61_000);
    expect(await provider.getToken(bindings)).toBe(secondToken);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
