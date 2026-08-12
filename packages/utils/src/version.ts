/**
 * Split a semver-ish version like "1.2.3" into its numeric segments,
 * dropping any non-numeric parts.
 *
 * Migrated from the desktop `latest-release-hint.tsx` local helper.
 */
export function parseVersionSegments(version: string): number[] {
  return version
    .split(".")
    .map((segment) => Number.parseInt(segment, 10))
    .filter((segment) => !Number.isNaN(segment));
}

/**
 * True when `latest` is strictly newer than `current` (compared segment by
 * segment, shorter version zero-padded). An empty/malformed `latest` is treated
 * as "not newer".
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const latestSegments = parseVersionSegments(latest);
  const currentSegments = parseVersionSegments(current);

  if (latestSegments.length === 0) return false;

  const length = Math.max(latestSegments.length, currentSegments.length);

  for (let index = 0; index < length; index += 1) {
    const latestSegment = latestSegments[index] ?? 0;
    const currentSegment = currentSegments[index] ?? 0;

    if (latestSegment > currentSegment) return true;
    if (latestSegment < currentSegment) return false;
  }

  return false;
}
