import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nativeImageMocks = vi.hoisted(() => {
  const resizedImage = {
    setTemplateImage: vi.fn()
  };
  const sourceImage = {
    resize: vi.fn(() => resizedImage)
  };

  return {
    resizedImage,
    sourceImage,
    nativeImage: {
      createFromPath: vi.fn(() => sourceImage)
    }
  };
});

vi.mock("electron", () => ({
  nativeImage: nativeImageMocks.nativeImage
}));

import {
  createTrayIconImage,
  getAppIconPath,
  getMacOsTrayIconPath,
  getTrayIconPath,
  MACOS_TRAY_ICON_SIZE
} from "./tray-icon";

const readPngMetadata = (filePath: string) => {
  const png = readFileSync(filePath);

  return {
    colorType: png.readUInt8(25),
    height: png.readUInt32BE(20),
    width: png.readUInt32BE(16)
  };
};

describe("app icon paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the full-size mark asset for the window icon", () => {
    const mainDirname = path.join("dist", "main", "main");
    const expectedIconPath = path.normalize(path.join("dist", "renderer", "skillport-mark.png"));

    expect(getAppIconPath(mainDirname)).toBe(expectedIconPath);
  });

  it("uses the mark asset path directly for non-macOS tray icons", () => {
    const mainDirname = path.join("dist", "main", "main");
    const expectedIconPath = path.normalize(path.join("dist", "renderer", "skillport-mark.png"));

    expect(getTrayIconPath(mainDirname)).toBe(expectedIconPath);
    expect(createTrayIconImage(mainDirname, "win32")).toBe(expectedIconPath);
  });

  it("uses the generated 32px colored asset for the macOS menu bar tray icon", () => {
    const mainDirname = path.join("dist", "main", "main");
    const expectedIconPath = path.normalize(path.join("dist", "renderer", "macOS", "32.png"));

    expect(MACOS_TRAY_ICON_SIZE).toBe(22);
    expect(getMacOsTrayIconPath(mainDirname)).toBe(expectedIconPath);
    const trayIcon = createTrayIconImage(mainDirname, "darwin");

    expect(nativeImageMocks.nativeImage.createFromPath).toHaveBeenCalledWith(expectedIconPath);
    expect(nativeImageMocks.sourceImage.resize).toHaveBeenCalledWith({
      height: MACOS_TRAY_ICON_SIZE,
      width: MACOS_TRAY_ICON_SIZE
    });
    expect(nativeImageMocks.resizedImage.setTemplateImage).not.toHaveBeenCalled();
    expect(trayIcon).toBe(nativeImageMocks.resizedImage);
  });

  it("keeps the macOS tray source close to the final menu bar size", () => {
    const assetDirectory = path.resolve(__dirname, "../renderer/assets");
    const pngMetadata = readPngMetadata(path.join(assetDirectory, "macOS", "32.png"));

    expect(pngMetadata).toEqual({
      colorType: 6,
      height: 32,
      width: 32
    });
  });
});
