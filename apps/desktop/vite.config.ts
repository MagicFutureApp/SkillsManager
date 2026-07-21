import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

const copyAppIcons = (): Plugin => ({
  name: "copy-app-icons",
  closeBundle() {
    const sourceDirectory = path.resolve(__dirname, "src/renderer/assets");
    const targetDirectory = path.resolve(__dirname, "dist/renderer");
    const iconFiles = [
      "skills-manager-mark.svg",
      "skills-manager-mark.png",
      path.join("macOS", "32.png")
    ];

    mkdirSync(targetDirectory, { recursive: true });

    for (const iconFile of iconFiles) {
      const iconTargetPath = path.join(targetDirectory, iconFile);

      mkdirSync(path.dirname(iconTargetPath), { recursive: true });
      copyFileSync(path.join(sourceDirectory, iconFile), iconTargetPath);
    }
  }
});

export default defineConfig({
  plugins: [react(), tailwindcss(), copyAppIcons()],
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
