import { nativeImage, type NativeImage } from "electron";
import path from "node:path";

const APP_ICON_FILE = "skillport-mark.png";
const MACOS_TRAY_ICON_FILE = path.join("macOS", "32.png");
export const MACOS_TRAY_ICON_SIZE = 22;

export const getAppIconPath = (mainDirname: string): string =>
  path.join(mainDirname, "..", "..", "renderer", APP_ICON_FILE);

export const getTrayIconPath = getAppIconPath;

export const getMacOsTrayIconPath = (mainDirname: string): string =>
  path.join(mainDirname, "..", "..", "renderer", MACOS_TRAY_ICON_FILE);

export const createTrayIconImage = (
  mainDirname: string,
  platform: NodeJS.Platform = process.platform
): string | NativeImage => {
  const iconPath = getTrayIconPath(mainDirname);

  if (platform !== "darwin") {
    return iconPath;
  }

  return nativeImage.createFromPath(getMacOsTrayIconPath(mainDirname)).resize({
    height: MACOS_TRAY_ICON_SIZE,
    width: MACOS_TRAY_ICON_SIZE
  });
};
