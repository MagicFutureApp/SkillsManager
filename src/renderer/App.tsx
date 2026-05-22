export const App = () => {
  return (
    <main className="app-shell">
      <section className="welcome-panel">
        <h1>Skills Manager</h1>
        <p>React renderer initialized. Data layer comes next.</p>
        <div>
          <p>
            We are using Node.js <span id="node-version"></span>
          </p>
          <p>
            Chromium <span id="chrome-version"></span>
          </p>
          <p>
            and Electron <span id="electron-version"></span>
          </p>
        </div>
      </section>
    </main>
  );
};
