// Single source of truth for `cn` now lives in the shared `@skills-manager/utils`
// package (ESM-only). Re-export so existing `./lib/utils` import sites keep working.
export { cn } from "@skills-manager/utils/cn";
