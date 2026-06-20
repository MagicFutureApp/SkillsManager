import React, { createContext, useContext } from "react";

import type { SyncHistoryPageState } from "../hooks/use-sync-history-page-state";

const SyncHistoryPageContext = createContext<SyncHistoryPageState | null>(null);

export const SyncHistoryPageProvider = ({
  children,
  state
}: React.PropsWithChildren<{ state: SyncHistoryPageState }>) => {
  return (
    <SyncHistoryPageContext.Provider value={state}>{children}</SyncHistoryPageContext.Provider>
  );
};

export const useSyncHistoryPageContext = (): SyncHistoryPageState => {
  const context = useContext(SyncHistoryPageContext);

  if (!context) {
    throw new Error("useSyncHistoryPageContext must be used within SyncHistoryPageProvider.");
  }

  return context;
};
