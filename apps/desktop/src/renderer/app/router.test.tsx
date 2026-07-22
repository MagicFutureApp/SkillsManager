import { describe, expect, it } from "vitest";

import { router } from "./router";

describe("application router history", () => {
  it("keeps route navigation inside the packaged renderer document", () => {
    expect(router.history.createHref("/repositories")).toMatch(/#\/repositories$/);
  });
});
