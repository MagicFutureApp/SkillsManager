// packages/utils — shared, runtime-agnostic ESM utilities for every Skills
// Manager app.
//
// Module format: this package is ESM-only (no CJS build). Every consumer is ESM
// — the desktop main process uses NodeNext, the renderer / landing /
// cache-manager use a bundler — so a single ESM artifact serves all runtimes.
//
// Entry points:
// - `.`      → zero-dependency, runtime-agnostic helpers (clamp, isRecord, search
//              validation, version comparison, ...). Safe to import inside the
//              Cloudflare Workers runtime (cache-manager).
// - `./cn`   → the `cn` Tailwind helper, which pulls in `clsx` + `tailwind-merge`.
//              Kept on a subpath so importing `.` never drags those browser
//              packages into a Worker's install graph.
//
// RULE (applies to every relative import inside src/): write extensionless
// specifiers, e.g. `export * from "./is-record"`. The published artifact is
// produced by `esbuild --bundle` (see package.json `build`), which resolves
// extensionless relative imports — so no `.js` suffix is needed, and adding one
// would break the Cloudflare Workers / bundler consumers that import this package.
//
// This package MUST NOT import `node:*`, `Buffer`, `process`, `fs`, or any DOM
// API. It is also loaded inside Cloudflare Workers, which provide none of those.

export { asString } from "./as-string";
export { clamp } from "./clamp";
export { isRecord } from "./is-record";
export { isValidEmail } from "./is-valid-email";
export { isNewerVersion, parseVersionSegments } from "./version";
export { isValidSearchOwner, normalizeSearchQuery, SEARCH_DEFAULT_LIMIT, SEARCH_MAX_LIMIT, SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_LIMIT, SEARCH_MIN_QUERY_LENGTH } from "./search";
