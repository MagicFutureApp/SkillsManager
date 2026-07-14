import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./src/renderer", import.meta.url).pathname
    }
  },
  test: {
    environment: "jsdom",
    exclude: ["dist/**", "node_modules/**", "release/**"],
    globals: true,
    setupFiles: ["./src/renderer/test/setup.ts"]
  }
});
