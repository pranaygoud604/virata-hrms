import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    // e2e/**/*.spec.ts are Playwright specs (run via `npm run test:e2e`), not
    // Vitest's — without this exclude, Vitest's default glob picks them up
    // too and fails trying to run `@playwright/test`'s `test.describe` API
    // through Vitest's runner.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["src/main.tsx", "src/vite-env.d.ts", "**/*.d.ts", "src/test/**"],
    },
  },
});
