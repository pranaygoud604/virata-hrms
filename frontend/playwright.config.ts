import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Auto-starts the Vite dev server so `npm run test:e2e` works
 * standalone; it does NOT start the backend/database — tests that require a
 * real login (backend-dependent) skip themselves via `test.skip` when
 * PLAYWRIGHT_BASE_URL/backend isn't reachable. See e2e/README.md.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
