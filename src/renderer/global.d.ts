import type { AppHealth as MainAppHealth } from "../main/ipc/health";
import type { SupportedLocale as CoreSupportedLocale } from "../core/i18n/locale";

export type AppHealth = MainAppHealth;
export type SupportedLocale = CoreSupportedLocale;

declare global {
  interface Window {
    skillsManager?: {
      getHealth: () => Promise<AppHealth>;
      getLocale: () => Promise<SupportedLocale>;
    };
  }
}

export {};
