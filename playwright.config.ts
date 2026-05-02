import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-tests",
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  reporter: "html",
 use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  // webServer section removed
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});