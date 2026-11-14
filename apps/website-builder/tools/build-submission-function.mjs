// Bundles tools/submission-entry.ts (the builder's verifier, price calculation and brief) into one file the submission
// endpoint can load: ../../api/_lib/submission.mjs. The endpoint is deployed without apps/, so it cannot import the
// source. Run through `npm run build`, so the committed bundle always matches the catalogue in this source.
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));

await build({
  root,
  configFile: false,
  logLevel: "warn",
  ssr: { noExternal: true },
  build: {
    ssr: "tools/submission-entry.ts",
    outDir: "../../api/_lib",
    emptyOutDir: false,
    minify: false,
    target: "node22",
    rollupOptions: { output: { format: "es", entryFileNames: "submission.mjs" } },
  },
});
console.log("wrote api/_lib/submission.mjs");
