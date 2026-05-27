import { describe, expect, it } from "vitest";

import { useShellStore } from "./shell-store";

describe("useShellStore", () => {
  it("tracks the active route id", () => {
    useShellStore.getState().setActiveRouteId("providers");

    expect(useShellStore.getState().activeRouteId).toBe("providers");
  });
});
