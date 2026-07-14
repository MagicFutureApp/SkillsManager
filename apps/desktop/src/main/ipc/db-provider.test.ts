import { describe, expect, it } from "vitest";

import { resolveDb } from "./db-provider.js";

describe("resolveDb", () => {
  it("returns the provided database client", () => {
    const db = { id: "db-client" };

    expect(resolveDb(db)).toBe(db);
  });

  it("resolves a lazy database client provider", () => {
    const db = { id: "lazy-db-client" };

    expect(resolveDb(() => db)).toBe(db);
  });
});
