import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import React from "react";

import { routeTree } from "./routes";

export const router = createRouter({
  history: createHashHistory(),
  routeTree
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
