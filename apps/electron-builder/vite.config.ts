import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The wizard is served by the marketing site at /electron-builder/. `npm run build` writes the finished app straight
// into ../../electron-builder, which is committed so the site stays plain static files (no build step on the host).
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  base: command === "build" || isPreview ? "/electron-builder/" : "/",
  build: {
    outDir: "../../electron-builder",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
}));
