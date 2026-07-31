import { describe, expect, it, vi } from "vitest";

import type { SkillsShTokenProvider } from "./skills-sh-token";
import { fetchSkillsSh } from "./skills-sh-fetch";
import type { WorkerBindings } from "../worker-env";

const bindings = {} as WorkerBindings;

describe("authenticated skills.sh fetch", () => {
  it("invalidates the rejected token and retries a 401 exactly once", async () => {
    const tokenProvider: SkillsShTokenProvider = {
      getToken: vi.fn().mockResolvedValueOnce("old-token").mockResolvedValueOnce("new-token"),
      invalidate: vi.fn()
    };
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));

    const response = await fetchSkillsSh(
      "https://skills.sh/api/v1/skills",
      bindings,
      tokenProvider,
      fetchImpl
    );

    expect(response.status).toBe(200);
    expect(tokenProvider.invalidate).toHaveBeenCalledWith("old-token");
    expect(fetchImpl).toHaveBeenNthCalledWith(1, "https://skills.sh/api/v1/skills", {
      headers: { authorization: "Bearer old-token" }
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(2, "https://skills.sh/api/v1/skills", {
      headers: { authorization: "Bearer new-token" }
    });
  });
});
