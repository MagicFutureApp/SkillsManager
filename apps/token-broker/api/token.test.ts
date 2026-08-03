import { afterEach, describe, expect, it, vi } from "vitest";

describe("Vercel token function entry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("exports a named Web API POST handler", async () => {
    vi.stubEnv("SKILLS_SH_TOKEN_SECRET", "token-secret");

    const tokenModule = await import("./token.js");

    expect(tokenModule.POST).toBeTypeOf("function");
    expect("default" in tokenModule).toBe(false);

    const response = await tokenModule.POST(
      new Request("https://example.test/api/token", { method: "POST" })
    );

    expect(response.status).toBe(401);
  });
});
