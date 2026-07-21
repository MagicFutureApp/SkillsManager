import type { RepositoriesPageState } from "../hooks/use-repositories-page-state";
import React from "react";

const RepositoriesPageContext = React.createContext<RepositoriesPageState | null>(null);

export const RepositoriesPageProvider = ({
  children,
  state
}: React.PropsWithChildren<{ state: RepositoriesPageState }>) => {
  return (
    <RepositoriesPageContext.Provider value={state}>{children}</RepositoriesPageContext.Provider>
  );
};

export const useRepositoriesPageContext = () => {
  const state = React.useContext(RepositoriesPageContext);

  if (!state) {
    throw new Error("Repositories page context is missing.");
  }

  return state;
};
