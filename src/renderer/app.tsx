import { AppRouter } from "./app/router";
import { TooltipProvider } from "@/components/ui/tooltip";
import React from "react";

export const App = () => {
  return (
    <TooltipProvider>
      <AppRouter />
    </TooltipProvider>
  );
};
