const SHIFT_PRESS_COUNT = 4;
const SHIFT_PRESS_RESET_MS = 300;

type ShiftPressInput = {
  key: string;
  isAutoRepeat?: boolean;
};

export const createShiftPressSequenceHandler = (
  onComplete: () => void,
  now: () => number = Date.now
) => {
  let shiftPressCount = 0;
  let previousShiftPressAt = 0;

  return (input: ShiftPressInput): void => {
    if (input.isAutoRepeat) {
      return;
    }

    if (input.key !== "Shift") {
      shiftPressCount = 0;
      previousShiftPressAt = 0;
      return;
    }

    const currentTime = now();
    if (shiftPressCount > 0 && currentTime - previousShiftPressAt > SHIFT_PRESS_RESET_MS) {
      shiftPressCount = 0;
    }

    shiftPressCount += 1;
    previousShiftPressAt = currentTime;

    if (shiftPressCount >= SHIFT_PRESS_COUNT) {
      onComplete();
      shiftPressCount = 0;
      previousShiftPressAt = 0;
    }
  };
};
