import { readFileSync } from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";
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
    bitDepth: png.readUInt8(24),
    colorType: png.readUInt8(25),
    height: png.readUInt32BE(20),
    width: png.readUInt32BE(16)
  };
};

const readPngRgbaPixels = (filePath: string) => {
  const png = readFileSync(filePath);
  const { bitDepth, colorType, height, width } = readPngMetadata(filePath);

  expect([8, 16]).toContain(bitDepth);
  expect(colorType).toBe(6);

  let offset = 8;
  const idatChunks: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);

    if (type === "IDAT") {
      idatChunks.push(data);
    }

    offset += length + 12;
  }

  const bytesPerSample = bitDepth / 8;
  const bytesPerPixel = 4 * bytesPerSample;
  const rowLength = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const pixels = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y += 1) {
    const sourceOffset = y * (rowLength + 1);
    const filter = inflated[sourceOffset];
    const rowOffset = y * rowLength;
    const previousRowOffset = rowOffset - rowLength;

    for (let x = 0; x < rowLength; x += 1) {
      const raw = inflated[sourceOffset + 1 + x];
      const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[previousRowOffset + x] : 0;
      const upLeft =
        y > 0 && x >= bytesPerPixel ? pixels[previousRowOffset + x - bytesPerPixel] : 0;
      let value: number;

      if (filter === 0) {
        value = raw;
      } else if (filter === 1) {
        value = raw + left;
      } else if (filter === 2) {
        value = raw + up;
      } else if (filter === 3) {
        value = raw + Math.floor((left + up) / 2);
      } else if (filter === 4) {
        const predictor = left + up - upLeft;
        const leftDistance = Math.abs(predictor - left);
        const upDistance = Math.abs(predictor - up);
        const upLeftDistance = Math.abs(predictor - upLeft);
        const paeth =
          leftDistance <= upDistance && leftDistance <= upLeftDistance
            ? left
            : upDistance <= upLeftDistance
              ? up
              : upLeft;

        value = raw + paeth;
      } else {
        throw new Error(`Unsupported PNG filter: ${filter}`);
      }

      pixels[rowOffset + x] = value & 0xff;
    }
  }

  return {
    getAlphaAt(x: number, y: number) {
      const alphaOffset = y * rowLength + x * bytesPerPixel + 3 * bytesPerSample;

      if (bitDepth === 16) {
        return pixels.readUInt16BE(alphaOffset);
      }

      return pixels[alphaOffset];
    },
    height,
    width
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
      bitDepth: 8,
      colorType: 6,
      height: 32,
      width: 32
    });
  });

  it("keeps the Windows app icon corners transparent", () => {
    const assetDirectory = path.resolve(__dirname, "../renderer/assets");
    const icon = readPngRgbaPixels(path.join(assetDirectory, "skillport-mark.png"));

    expect([
      icon.getAlphaAt(0, 0),
      icon.getAlphaAt(icon.width - 1, 0),
      icon.getAlphaAt(0, icon.height - 1),
      icon.getAlphaAt(icon.width - 1, icon.height - 1)
    ]).toEqual([0, 0, 0, 0]);
  });
});
