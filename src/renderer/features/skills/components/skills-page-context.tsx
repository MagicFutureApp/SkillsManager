import React from "react";

import type { SkillsPageState } from "../hooks/use-skills-page-state";

const SkillsPageContext = React.createContext<SkillsPageState | null>(null);

export const SkillsPageProvider = ({
  children,
  state
}: React.PropsWithChildren<{ state: SkillsPageState }>) => {
  return <SkillsPageContext.Provider value={state}>{children}</SkillsPageContext.Provider>;
};

export const useSkillsPageContext = () => {
  const state = React.useContext(SkillsPageContext);

  if (!state) {
    throw new Error("Skills page context is missing.");
  }

  return state;
};
