export type FontPlatform = "windows" | "macos" | "linux";
export type RuntimePlatform =
  | "aix"
  | "android"
  | "darwin"
  | "freebsd"
  | "linux"
  | "openbsd"
  | "sunos"
  | "win32"
  | "cygwin"
  | "netbsd";

export const resolveFontPlatform = (platform: RuntimePlatform): FontPlatform => {
  if (platform === "win32") {
    return "windows";
  }

  if (platform === "darwin") {
    return "macos";
  }

  return "linux";
};

export const applyPlatformFont = (
  root: HTMLElement = document.documentElement,
  platform: RuntimePlatform = window.skillsManager?.platform ?? "linux"
): void => {
  root.dataset.platform = resolveFontPlatform(platform);
};
