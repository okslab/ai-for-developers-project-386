import { defineConfig, devices } from "@playwright/test";

const API_HOST = process.env.E2E_API_HOST ?? "127.0.0.1";
const API_PORT = Number(process.env.E2E_API_PORT ?? 8000);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5173);
const API_URL = `http://${API_HOST}:${API_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `${process.env.E2E_PYTHON ?? "python3"} -m uvicorn app.main:app --host ${API_HOST} --port ${API_PORT}`,
      url: `${API_URL}/openapi.json`,
      cwd: "../backend",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      cwd: "../frontend",
      env: { VITE_API_BASE_URL: API_URL },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
