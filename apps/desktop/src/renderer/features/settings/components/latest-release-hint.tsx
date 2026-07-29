import React from "react";
import { PackageCheck } from "lucide-react";

import type { LatestReleaseInfo } from "@/global";

const parseVersionSegments = (version: string): number[] =>
  version
    .split(".")
    .map((segment) => Number.parseInt(segment, 10))
    .filter((segment) => !Number.isNaN(segment));

const isNewerVersion = (latest: string, current: string): boolean => {
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
};

type LatestReleaseHintProps = {
  isChecking: boolean;
  latestRelease: LatestReleaseInfo | null;
  currentVersion: string | undefined;
  onOpenDownload: () => void;
};

export const LatestReleaseHint = ({
  isChecking,
  latestRelease,
  currentVersion,
  onOpenDownload
}: LatestReleaseHintProps): React.JSX.Element | null => {
  if (isChecking) {
    return <p className="mt-2 text-xs text-muted-foreground">正在检查新版本…</p>;
  }

  if (
    latestRelease?.version &&
    currentVersion &&
    isNewerVersion(latestRelease.version, currentVersion)
  ) {
    return (
      <button
        type="button"
        onClick={onOpenDownload}
        aria-label={`发现新版本 v${latestRelease.version}，点击前往下载`}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-muted focus-visible:underline"
      >
        <PackageCheck className="size-3.5 text-primary" aria-hidden="true" />
        新版本 v{latestRelease.version} 点击下载
      </button>
    );
  }

  return null;
};
