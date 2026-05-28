import type { SupportedLocale } from "../../core/i18n/locale.js";

type MainMessages = {
  tray: {
    show: string;
    quit: string;
  };
};

const mainMessages: Record<SupportedLocale, MainMessages> = {
  "zh-CN": {
    tray: {
      show: "显示 Skillport",
      quit: "退出"
    }
  },
  "en-US": {
    tray: {
      show: "Show Skillport",
      quit: "Quit"
    }
  }
};

export const getMainMessages = (locale: SupportedLocale): MainMessages => {
  return mainMessages[locale];
};
