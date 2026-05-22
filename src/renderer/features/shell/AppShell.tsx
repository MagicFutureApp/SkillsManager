import packageJson from "../../../../package.json";
import type { AppHealth } from "../../global";

const navItems = ["Sources", "Repositories", "Skills", "Targets", "Distribution"];

type AppShellProps = {
  health: AppHealth | null;
};

export const AppShell = ({ health }: AppShellProps) => {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div>
          <h1>Skills Manager</h1>
          <p>{packageJson.description}</p>
        </div>
        <nav aria-label="Primary">
          {navItems.map((item) => (
            <button key={item} type="button" aria-current={item === "Skills" ? "page" : undefined}>
              {item}
            </button>
          ))}
        </nav>
        {health ? (
          <dl className="runtime-status">
            <div>
              <dt>Node</dt>
              <dd>{health.node}</dd>
            </div>
            <div>
              <dt>Electron</dt>
              <dd>{health.electron}</dd>
            </div>
            <div>
              <dt>Platform</dt>
              <dd>{health.platform}</dd>
            </div>
          </dl>
        ) : null}
      </aside>
      <main className="workspace">
        <header>
          <div>
            <h2>Skills</h2>
            <p>Indexed skill units and target distribution status.</p>
          </div>
          <button type="button">Sync</button>
        </header>
        <section className="empty-state">
          <h3>No skills indexed yet</h3>
          <p>Add a source repository, run manual sync, then distribute skills to targets.</p>
        </section>
      </main>
    </div>
  );
};
