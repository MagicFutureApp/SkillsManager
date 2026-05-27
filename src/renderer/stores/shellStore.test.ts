import { describe, expect, it } from "vitest";

import { useShellStore } from "./shellStore";

describe("useShellStore", () => {
  it("tracks the active route id", () => {
    useShellStore.getState().setActiveRouteId("providers");

    expect(useShellStore.getState().activeRouteId).toBe("providers");
  });
});
