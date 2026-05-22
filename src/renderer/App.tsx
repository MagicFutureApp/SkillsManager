import { useEffect, useState } from "react";
import packageJson from "../../package.json";
import type { AppHealth } from "./global";

export const App = () => {
  const [health, setHealth] = useState<AppHealth | null>(null);

  useEffect(() => {
    void window.skillsManager.getHealth().then(setHealth);
  }, []);

  return (
    <main className="app-shell">
      <section className="welcome-panel">
        <h1>Skills Manager</h1>
        <p>{packageJson.description}</p>
        {health ? (
          <dl>
            <dt>Node: {health.node}</dt>
            <dt>Electron: {health.electron}</dt>
            <dt>Platform: {health.platform}</dt>
          </dl>
        ) : null}
      </section>
    </main>
  );
};
