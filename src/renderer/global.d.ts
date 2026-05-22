import type { AppHealth as MainAppHealth } from "../main/ipc/health";

export type AppHealth = MainAppHealth;

declare global {
  interface Window {
    skillsManager: {
      getHealth: () => Promise<AppHealth>;
    };
  }
}

export {};
