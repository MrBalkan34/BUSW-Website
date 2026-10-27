import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// In development the account server (apps/server, port 8787) is reached through this dev server, so the page and the
// API share one origin, exactly as they do in production. With no server running, /api answers with an error and the
// builder simply hides its account features.
const accountServer = { "/api": { target: "http://localhost:8787", changeOrigin: false } };

export default defineConfig({
  plugins: [react()],
  server: { proxy: accountServer },
  preview: { proxy: accountServer },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
