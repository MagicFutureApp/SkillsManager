import React from "react";

import type { RecommendedPageState } from "../hooks/use-recommended-page-state";

const RecommendedPageContext = React.createContext<RecommendedPageState | null>(null);

export const RecommendedPageProvider = ({
  children,
  state
}: React.PropsWithChildren<{ state: RecommendedPageState }>) => {
  return (
    <RecommendedPageContext.Provider value={state}>{children}</RecommendedPageContext.Provider>
  );
};

export const useRecommendedPageContext = () => {
  const state = React.useContext(RecommendedPageContext);

  if (!state) {
    throw new Error("Recommended page context is missing.");
  }

  return state;
};
