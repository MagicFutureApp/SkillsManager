import React from "react";

type PageLayoutProps = {
  Main: React.ComponentType;
  Sider: React.ComponentType;
  siderLabel: string;
};

export const PageLayout = ({ Main, Sider, siderLabel }: PageLayoutProps) => {
  return (
    <div className="grid min-h-full grid-cols-[minmax(620px,1fr)_360px] bg-background">
      <main className="min-w-0 p-7">
        <Main />
      </main>

      <aside
        className="grid content-start gap-3 border-l border-border bg-card px-5 py-6"
        aria-label={siderLabel}
      >
        <Sider />
      </aside>
    </div>
  );
};
