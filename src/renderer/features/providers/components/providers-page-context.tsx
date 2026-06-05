import type { ProvidersPageState } from "../hooks/use-providers-page-state";
import React from "react";

const ProvidersPageContext = React.createContext<ProvidersPageState | null>(null);

export const ProvidersPageProvider = ({
  children,
  state
}: React.PropsWithChildren<{ state: ProvidersPageState }>) => {
  return <ProvidersPageContext.Provider value={state}>{children}</ProvidersPageContext.Provider>;
};

export const useProvidersPageContext = () => {
  const state = React.useContext(ProvidersPageContext);

  if (!state) {
    throw new Error("Providers page context is missing.");
  }

  return state;
};
