import { useEffect, useState } from "react";
import { AppShell } from "./features/shell/AppShell";
import type { AppHealth } from "./global";

export const App = () => {
  const [health, setHealth] = useState<AppHealth | null>(null);

  useEffect(() => {
    void window.skillsManager.getHealth().then(setHealth);
  }, []);

  return <AppShell health={health} />;
};
