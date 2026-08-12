/**
 * Compile-only contract guard for the catalog IPC surface exposed to the renderer
 * through the global `Window["skillsManager"]` type (see `src/renderer/global.d.ts`).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `tsconfig.renderer.json` keeps `skipLibCheck: true`, which silently swallows
 * type errors inside the `.d.ts` contract. A prior regression dropped the
 * generic parameter from `CatalogResult<T>`, collapsing every channel's `data`
 * to `any` so that accessing non-existent fields compiled without complaint, and
 * `pnpm run check` stayed green. This file exists to catch that exact class of
 * regression on every future `tsc` run.
 *
 * HOW IT WORKS
 * ------------
 * The file is a `.ts` (not `.d.ts`), so `skipLibCheck` does NOT skip it: it is
 * type-checked normally. The `.test-d.ts` suffix is not matched by vitest's
 * default test-name pattern, so vitest never executes it, yet the renderer
 * tsconfig still feeds every TypeScript file under `src/renderer/` to `tsc`.
 *
 * Every assertion below uses `@ts-expect-error`. When the contract is intact the
 * annotated line is a genuine type error and the directive is consumed. If the
 * contract regresses (for example `data` degrades to `any`), those lines no
 * longer error, the `@ts-expect-error` directives become UNUSED, and `tsc`
 * fails with "Unused '@ts-expect-error' directive". That is the guard's teeth:
 * the same mistake can never again pass `pnpm run check` silently.
 *
 * No runtime side effects: nothing is imported for execution and no code path
 * here is ever invoked. The functions are declared but never called; they exist
 * purely so TypeScript type-checks their bodies. Vitest never imports this file,
 * and nothing else does either.
 */

import type { CatalogErrorCode, CatalogGenerationInfo } from "../../../core/catalog/catalog-types";

declare const skillsManager: NonNullable<Window["skillsManager"]>;

/**
 * `getCatalogManifest` channel: `() => Promise<CatalogResult<CatalogManifestResult>>`.
 */
async function assertGetCatalogManifestContract(): Promise<void> {
  const result = await skillsManager.getCatalogManifest!();

  if (result.ok) {
    // Real field — must compile WITHOUT any directive. If someone narrowed `data`
    // too far (for example to `{}`), this would error and surface the regression.
    const generation: CatalogGenerationInfo = result.data.generation;
    void generation;

    // @ts-expect-error CatalogManifestResult has no such field — proves `data`
    // is the specific type, not `any`.
    void result.data.totallyBogus;

    // @ts-expect-error success branch has no `error` member (narrowing works).
    void result.error;
  } else {
    // @ts-expect-error failure branch has no `data` member (narrowing works).
    void result.data;

    // Real field on the failure branch — must compile WITHOUT any directive.
    const code: CatalogErrorCode = result.error.code;
    void code;
  }
}

/**
 * `getCatalogPage` channel: `(input: CatalogPageInput) => Promise<CatalogResult<CatalogPageResult>>`.
 */
async function assertGetCatalogPageContract(): Promise<void> {
  const result = await skillsManager.getCatalogPage!({ page: 1 });

  if (result.ok) {
    // Real field — must compile WITHOUT any directive.
    const skills = result.data.skills;
    void skills;

    // @ts-expect-error CatalogPageResult has no such field — proves `data` is
    // specific, not `any`.
    void result.data.skillz;

    // @ts-expect-error success branch has no `error` member.
    void result.error;
  } else {
    // @ts-expect-error failure branch has no `data` member.
    void result.data;

    // Real field on the failure branch — must compile WITHOUT any directive.
    const code: CatalogErrorCode = result.error.code;
    void code;
  }

  // @ts-expect-error `page` must be a number, not a string.
  void skillsManager.getCatalogPage!({ page: "not-a-number" });
}

/**
 * `searchCatalog` channel: `(input: CatalogSearchInput) => Promise<CatalogResult<CatalogSearchResult>>`.
 */
async function assertSearchCatalogContract(): Promise<void> {
  const result = await skillsManager.searchCatalog!({ query: "react" });

  if (result.ok) {
    // Real field — must compile WITHOUT any directive.
    const searchType = result.data.searchType;
    void searchType;

    // @ts-expect-error CatalogSearchResult has no such field — proves `data` is
    // specific, not `any`.
    void result.data.totallyBogus;

    // @ts-expect-error success branch has no `error` member.
    void result.error;
  } else {
    // @ts-expect-error failure branch has no `data` member.
    void result.data;

    // Real field on the failure branch — must compile WITHOUT any directive.
    const code: CatalogErrorCode = result.error.code;
    void code;
  }

  // @ts-expect-error `query` must be a string, not a number.
  void skillsManager.searchCatalog!({ query: 12345 });
}
