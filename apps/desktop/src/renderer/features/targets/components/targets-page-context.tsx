import React, { createContext, useContext } from "react";

import type { TargetsPageState } from "../hooks/use-targets-page-state";

const TargetsPageContext = createContext<TargetsPageState | null>(null);

export const TargetsPageProvider = ({
  children,
  state
}: React.PropsWithChildren<{ state: TargetsPageState }>) => {
  return <TargetsPageContext.Provider value={state}>{children}</TargetsPageContext.Provider>;
};

export const useTargetsPageContext = (): TargetsPageState => {
  const context = useContext(TargetsPageContext);

  if (!context) {
    throw new Error("useTargetsPageContext must be used inside TargetsPageProvider.");
  }

  return context;
};
