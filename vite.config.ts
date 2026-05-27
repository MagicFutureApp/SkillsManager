import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "src/renderer",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer")
    }
  },
  build: {
    outDir: "../../dist/renderer",
    emptyOutDir: true
  },
  server: {
    port: 3700,
    strictPort: true
  }
});
