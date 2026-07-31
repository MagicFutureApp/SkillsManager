import { describe, expect, it, vi } from "vitest";

import { createUnsignedJwt } from "../test/create-jwt";
import { createTokenApp } from "./token-app";

const now = () => new Date("2026-07-30T00:00:00.000Z");
const expiresAt = Math.floor(now().getTime() / 1_000) + 3_600;

describe("Vercel OIDC token broker", () => {
  it("rejects requests without the configured shared secret", async () => {
    const getOidcToken = vi.fn().mockResolvedValue(createUnsignedJwt(expiresAt));
    const app = createTokenApp({
      expectedSecret: "token-secret",
      getOidcToken,
      now
    });

    const response = await app.request("/api/token", { method: "POST" });

    expect(response.status).toBe(401);
    expect(getOidcToken).not.toHaveBeenCalled();
  });

  it("returns a valid request-scoped token without allowing it to be cached", async () => {
    const token = createUnsignedJwt(expiresAt);
    const getOidcToken = vi.fn().mockResolvedValue(token);
    const app = createTokenApp({
      expectedSecret: "token-secret",
      getOidcToken,
      now
    });

    const response = await app.request("/api/token", {
      method: "POST",
      headers: { authorization: "Bearer token-secret" }
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ token, expiresAt });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(getOidcToken).toHaveBeenCalledOnce();
  });

  it("does not return an invalid or expired OIDC token", async () => {
    const app = createTokenApp({
      expectedSecret: "token-secret",
      getOidcToken: vi.fn().mockResolvedValue(createUnsignedJwt(expiresAt - 3_601)),
      now
    });

    const response = await app.request("/api/token", {
      method: "POST",
      headers: { authorization: "Bearer token-secret" }
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "oidc_unavailable",
      message: "A valid request-scoped OIDC token is unavailable."
    });
  });
});
