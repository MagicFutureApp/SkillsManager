import { AppRouter } from "./app/router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppI18nProvider } from "@/i18n/i18n-provider";
import React from "react";

export const App = () => {
  return (
    <AppI18nProvider>
      <TooltipProvider>
        <AppRouter />
      </TooltipProvider>
    </AppI18nProvider>
  );
};
