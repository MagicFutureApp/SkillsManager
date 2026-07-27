import type { Rectangle } from "electron";

import { WINDOW_MIN_WIDTH } from "../core/app-constants.js";
import { createAppSettingsRepository } from "../db/repositories/appSettingsRepository.js";
import type { DbClient } from "./app-storage.js";

export const MAIN_WINDOW_STATE_SETTING_KEY = "mainWindowState";

const DEFAULT_WINDOW_SCALE = 0.8;
const WINDOW_MIN_HEIGHT = 640;

export type MainWindowState = {
  displayId: number;
  bounds: Rectangle;
  isMaximized: boolean;
};

export type WindowDisplay = {
  id: number;
  workArea: Rectangle;
};

type MainWindowPlacement = Pick<MainWindowState, "bounds" | "isMaximized">;

type ResolveMainWindowPlacementInput = {
  displays: WindowDisplay[];
  fallbackDisplay: WindowDisplay;
  savedState: MainWindowState | null;
};

export const loadMainWindowState = async (db: DbClient): Promise<MainWindowState | null> => {
  const setting = await createAppSettingsRepository(db).get(MAIN_WINDOW_STATE_SETTING_KEY);

  return setting ? parseMainWindowState(setting.valueJson) : null;
};

export const saveMainWindowState = async (db: DbClient, state: MainWindowState): Promise<void> => {
  await createAppSettingsRepository(db).set(MAIN_WINDOW_STATE_SETTING_KEY, state);
};

export const parseMainWindowState = (valueJson: string): MainWindowState | null => {
  try {
    const value: unknown = JSON.parse(valueJson);
    return isMainWindowState(value) ? value : null;
  } catch {
    return null;
  }
};

export const resolveMainWindowPlacement = ({
  displays,
  fallbackDisplay,
  savedState
}: ResolveMainWindowPlacementInput): MainWindowPlacement => {
  if (!savedState) {
    return {
      bounds: createPercentageBounds(fallbackDisplay.workArea),
      isMaximized: false
    };
  }

  const savedDisplay =
    displays.find((display) => display.id === savedState.displayId) ??
    findOverlappingDisplay(displays, savedState.bounds);

  if (!savedDisplay) {
    return {
      bounds: createPercentageBounds(fallbackDisplay.workArea),
      isMaximized: savedState.isMaximized
    };
  }

  return {
    bounds: clampBoundsToWorkArea(savedState.bounds, savedDisplay.workArea),
    isMaximized: savedState.isMaximized
  };
};

const createPercentageBounds = (workArea: Rectangle): Rectangle => {
  const width = clampDimension(
    Math.floor(workArea.width * DEFAULT_WINDOW_SCALE),
    WINDOW_MIN_WIDTH,
    workArea.width
  );
  const height = clampDimension(
    Math.floor(workArea.height * DEFAULT_WINDOW_SCALE),
    WINDOW_MIN_HEIGHT,
    workArea.height
  );

  return {
    x: workArea.x + Math.floor((workArea.width - width) / 2),
    y: workArea.y + Math.floor((workArea.height - height) / 2),
    width,
    height
  };
};

const clampBoundsToWorkArea = (bounds: Rectangle, workArea: Rectangle): Rectangle => {
  const width = clampDimension(bounds.width, WINDOW_MIN_WIDTH, workArea.width);
  const height = clampDimension(bounds.height, WINDOW_MIN_HEIGHT, workArea.height);

  return {
    x: clampCoordinate(bounds.x, workArea.x, workArea.x + workArea.width - width),
    y: clampCoordinate(bounds.y, workArea.y, workArea.y + workArea.height - height),
    width,
    height
  };
};

const clampDimension = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Math.round(value)));

const clampCoordinate = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Math.round(value)));

const findOverlappingDisplay = (
  displays: WindowDisplay[],
  bounds: Rectangle
): WindowDisplay | undefined => {
  let largestOverlap = 0;
  let matchingDisplay: WindowDisplay | undefined;

  for (const display of displays) {
    const overlap = getIntersectionArea(bounds, display.workArea);
    if (overlap > largestOverlap) {
      largestOverlap = overlap;
      matchingDisplay = display;
    }
  }

  return matchingDisplay;
};

const getIntersectionArea = (first: Rectangle, second: Rectangle): number => {
  const width = Math.max(
    0,
    Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)
  );
  const height = Math.max(
    0,
    Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y)
  );

  return width * height;
};

const isMainWindowState = (value: unknown): value is MainWindowState => {
  if (!isRecord(value) || !isRectangle(value.bounds)) {
    return false;
  }

  return (
    isFiniteNumber(value.displayId) &&
    typeof value.isMaximized === "boolean" &&
    value.bounds.width > 0 &&
    value.bounds.height > 0
  );
};

const isRectangle = (value: unknown): value is Rectangle =>
  isRecord(value) &&
  isFiniteNumber(value.x) &&
  isFiniteNumber(value.y) &&
  isFiniteNumber(value.width) &&
  isFiniteNumber(value.height);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
