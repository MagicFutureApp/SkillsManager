/**
 * Safely coerce unknown input to a trimmed string; non-strings become "".
 * Useful for parsing untyped request-body fields.
 */
export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
