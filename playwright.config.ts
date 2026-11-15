import { defineConfig, devices } from "@playwright/test";

const port = Number.parseInt(process.env.OFFLINE_CHESS_TEST_PORT ?? "4189", 10) || 4189;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "line",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview",
    env: { OFFLINE_CHESS_PORT: String(port) },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
