import path from "path";
import { defineConfig } from "vitest/config";

// A zone ahead of UTC, so that a date read in the phone's zone instead of the API's text shows up (CI runs in UTC).
process.env.TZ = "Europe/Paris";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: "./vitest.setup.ts",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
