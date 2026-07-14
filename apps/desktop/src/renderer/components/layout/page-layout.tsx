import React from "react";

type PageLayoutProps = {
  Main: React.ComponentType;
  Sider: React.ComponentType;
  siderLabel: string;
};

export const PageLayout = ({ Main, Sider, siderLabel }: PageLayoutProps) => {
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(620px,1fr)_360px] bg-background">
      <main className="min-h-0 min-w-0 overflow-y-auto p-7">
        <Main />
      </main>

      <aside
        className="grid min-h-0 content-start gap-3 overflow-y-auto border-l border-border bg-card px-5 py-6"
        aria-label={siderLabel}
      >
        <Sider />
      </aside>
    </div>
  );
};
