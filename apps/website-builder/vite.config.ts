import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The builder is served by the marketing site at /builder/. `npm run build` writes the finished app straight into
// ../../builder, which is committed so the site stays plain static files (no build step on the host).
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  base: command === "build" || isPreview ? "/builder/" : "/",
  build: {
    outDir: "../../builder",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
}));
