import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression test for the `import { minimatch } from "minimatch"` interop crash.
 *
 * The crash only triggered when a non-empty `discoveryEntries` was passed, because
 * that is the only path that calls `minimatch` (scanSkillDirectory -> filterSkillEntries
 * -> matchesDiscoveryEntry -> minimatch).
 *
 * The fix normalizes the module shape at load time via a three-way fallback:
 *   (module.minimatch ?? module.default ?? module)
 * so it works whether minimatch is exposed as a named export, a default export, or a
 * bare `module.exports = fn`.
 *
 * Because the fallback runs once at module-evaluation time, each test below mocks
 * "minimatch" with a *different* interop shape and then dynamically re-imports
 * skill-scanner so the module is freshly evaluated against that shape. We feed the mock
 * the real minimatch implementation (via importActual) so the "matched skill is returned"
 * assertion stays meaningful — the thing under test is the shape resolution, not the
 * matching algorithm (which the existing skill-scanner.test.ts covers).
 */

type MinimatchFn = (target: string, pattern: string, options?: { dot?: boolean }) => boolean;

const DISCOVERY_ENTRIES = ["**/SKILL.md"];

const buildFixture = async (): Promise<string> => {
  const rootPath = await mkdtemp(path.join(os.tmpdir(), "skills-manager-interop-"));
  await mkdir(path.join(rootPath, "skills", "review-bot"), { recursive: true });
  await writeFile(
    path.join(rootPath, "skills", "review-bot", "SKILL.md"),
    "# Review Bot\n\nReviews pull requests with concise, actionable feedback.\n",
    "utf8"
  );
  return rootPath;
};

describe("scanSkillDirectory minimatch interop regression", () => {
  let rootPath: string;

  beforeEach(async () => {
    // Reset the module registry so the next dynamic import re-evaluates
    // skill-scanner against the freshly-applied minimatch mock for this test.
    vi.resetModules();
    rootPath = await buildFixture();
  });

  afterEach(async () => {
    await rm(rootPath, { recursive: true, force: true });
  });

  it("resolves minimatch when it is exposed as a NAMED export (local real-package form)", async () => {
    const actual = (await vi.importActual("minimatch")) as {
      minimatch?: MinimatchFn;
      default?: MinimatchFn;
    };
    const realMinimatch = (actual.minimatch ?? actual.default) as MinimatchFn;

    // Form (a): `{ minimatch: fn, __esModule: true }` — the shape the real
    // minimatch v10 package uses locally.
    vi.doMock("minimatch", () => ({ minimatch: realMinimatch, __esModule: true }));

    const { scanSkillDirectory } = await import("./skill-scanner");

    const skills = await scanSkillDirectory(rootPath, DISCOVERY_ENTRIES);

    expect(Array.isArray(skills)).toBe(true);
    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({
      entryPath: "skills/review-bot/SKILL.md",
      name: "Review Bot"
    });
  });

  it("resolves minimatch when it is exposed ONLY as a DEFAULT export (asar crash form)", async () => {
    const actual = (await vi.importActual("minimatch")) as {
      minimatch?: MinimatchFn;
      default?: MinimatchFn;
    };
    const realMinimatch = (actual.minimatch ?? actual.default) as MinimatchFn;

    // Form (b): the production asar shape where minimatch is exposed ONLY as a
    // default export and `.minimatch` is absent/undefined. That previously caused
    // `minimatch_1.minimatch` to be undefined and threw `TypeError: ... is not a
    // function`. We declare `minimatch: undefined` explicitly so the runtime value
    // mirrors the real interop (a missing `.minimatch` resolves to undefined), while
    // keeping vitest's named-export validation happy. The three-way fallback must then
    // pick up `.default` here.
    vi.doMock("minimatch", () => ({ default: realMinimatch, minimatch: undefined }));

    const { scanSkillDirectory } = await import("./skill-scanner");

    // If the fix regressed, this call throws because the resolved minimatch is not a function.
    const skills = await scanSkillDirectory(rootPath, DISCOVERY_ENTRIES);

    expect(Array.isArray(skills)).toBe(true);
    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({
      entryPath: "skills/review-bot/SKILL.md",
      name: "Review Bot"
    });
  });
});
