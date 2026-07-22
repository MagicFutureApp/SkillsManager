import { Menu } from "@base-ui/react/menu";
import { Apple, Check, Ellipsis, Monitor, Terminal } from "lucide-react";

import type { ReleaseManifestState } from "../hooks/use-release-manifest";
import {
  getReleaseDownloadUrl,
  RELEASE_PLATFORMS,
  type ReleasePlatform
} from "../lib/release-manifest";

interface DownloadButtonGroupProps {
  platform: ReleasePlatform;
  onPlatformChange: (platform: ReleasePlatform) => void;
  release: ReleaseManifestState;
  size?: "compact" | "default";
  fullWidth?: boolean;
}

const platformDetails = {
  windows: { label: "Windows", icon: Monitor },
  macos: { label: "macOS", icon: Apple },
  linux: { label: "Linux", icon: Terminal }
} satisfies Record<ReleasePlatform, { label: string; icon: typeof Monitor }>;

export default function DownloadButtonGroup({
  platform,
  onPlatformChange,
  release,
  size = "default",
  fullWidth = false
}: DownloadButtonGroupProps) {
  const selectedPlatform = platformDetails[platform];
  const PlatformIcon = selectedPlatform.icon;
  const downloadLabel = release.loading
    ? "下载"
    : release.manifest
      ? `下载 v${release.manifest.version}`
      : "下载";
  const heightClass = size === "compact" ? "h-9" : "h-11";
  const labelPaddingClass = size === "compact" ? "px-3.5" : "px-5";

  return (
    <div className={`inline-flex items-stretch ${fullWidth ? "w-full" : ""}`}>
      <a
        href={getReleaseDownloadUrl(release.manifest, platform)}
        className={`inline-flex ${heightClass} ${fullWidth ? "flex-1" : ""} items-center justify-center gap-2 rounded-l-md border border-zinc-950 bg-zinc-950 ${labelPaddingClass} text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-zinc-800 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900`}
        aria-label={`${downloadLabel}，${selectedPlatform.label}`}
      >
        <PlatformIcon className="size-4" aria-hidden="true" />
        <span>{downloadLabel}</span>
      </a>

      <Menu.Root>
        <Menu.Trigger
          className={`inline-flex ${heightClass} w-10 items-center justify-center rounded-r-md border border-zinc-950 border-l-zinc-700 bg-zinc-950 text-white transition-colors hover:bg-zinc-800 data-popup-open:bg-zinc-800 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900`}
          aria-label={`选择下载平台，当前为 ${selectedPlatform.label}`}
          title="选择下载平台"
        >
          <Ellipsis className="size-4" aria-hidden="true" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="z-60 outline-hidden" align="end" sideOffset={8}>
            <Menu.Popup className="min-w-44 origin-(--transform-origin) rounded-md border border-zinc-200 bg-white p-1 text-zinc-900 shadow-lg outline-hidden transition-[transform,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <Menu.RadioGroup
                value={platform}
                onValueChange={(value) => onPlatformChange(value as ReleasePlatform)}
              >
                {RELEASE_PLATFORMS.map((option) => {
                  const details = platformDetails[option];
                  const OptionIcon = details.icon;

                  return (
                    <Menu.RadioItem
                      key={option}
                      value={option}
                      className="grid cursor-default grid-cols-[1rem_1fr_1rem] items-center gap-2 rounded-sm px-2 py-2 text-sm outline-hidden select-none data-highlighted:bg-zinc-100"
                    >
                      <OptionIcon className="size-4" aria-hidden="true" />
                      <span>{details.label}</span>
                      <Menu.RadioItemIndicator>
                        <Check className="size-4" aria-hidden="true" />
                      </Menu.RadioItemIndicator>
                    </Menu.RadioItem>
                  );
                })}
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
