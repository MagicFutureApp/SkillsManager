import path from "node:path";

const APP_ICON_FILE = "skillport-mark.png";

export const getAppIconPath = (mainDirname: string): string =>
  path.join(mainDirname, "..", "..", "renderer", APP_ICON_FILE);

export const getTrayIconPath = getAppIconPath;
