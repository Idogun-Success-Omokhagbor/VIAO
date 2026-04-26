import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.PORT ?? "3000")
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`
const shouldStartWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "1"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    navigationTimeout: 60_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: shouldStartWebServer
    ? {
        command: `npx next dev -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
})
