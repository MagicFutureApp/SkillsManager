import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class lists. Conflicting utilities resolve so the later class
 * wins (e.g. `cn("p-2", "p-4")` → `"p-4"`), matching the behavior duplicated
 * across the desktop and landing apps.
 *
 * Lives on the `./cn` subpath so the main `.` entry stays free of the `clsx` /
 * `tailwind-merge` browser packages and can be imported by the Cloudflare
 * Workers runtime (cache-manager) without pulling them into the install graph.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
