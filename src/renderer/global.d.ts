import type { AppHealth as MainAppHealth } from "../main/ipc/health";
import type { AppInfo as MainAppInfo } from "../main/ipc/app-info";
import type { SupportedLocale as CoreSupportedLocale } from "../core/i18n/locale";

export type AppHealth = MainAppHealth;
export type AppInfo = MainAppInfo;
export type SupportedLocale = CoreSupportedLocale;

declare global {
  interface Window {
    skillsManager?: {
      getHealth: () => Promise<AppHealth>;
      getInfo: () => Promise<AppInfo>;
      getLocale: () => Promise<SupportedLocale>;
    };
  }
}

export {};
