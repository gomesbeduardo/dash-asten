import { defineConfig, devices } from "@playwright/test"

const isCI = !!process.env.CI
const porta = process.env.PW_PORT ?? "4173"

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${porta}`,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${porta} --strictPort`,
    url: `http://localhost:${porta}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
