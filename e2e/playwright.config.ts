import { defineConfig, devices } from "@playwright/test";

const API_HOST = process.env.E2E_API_HOST ?? "127.0.0.1";
const API_PORT = Number(process.env.E2E_API_PORT ?? 8000);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5173);
const EXTERNAL_BASE_URL = process.env.E2E_EXTERNAL_BASE_URL?.replace(/\/$/, "");
const API_URL = EXTERNAL_BASE_URL ?? process.env.E2E_API_URL ?? `http://${API_HOST}:${API_PORT}`;
const WEB_URL = EXTERNAL_BASE_URL ?? `http://127.0.0.1:${WEB_PORT}`;

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
  webServer: EXTERNAL_BASE_URL
    ? undefined
    : [
        {
          command: `${process.env.E2E_PYTHON ?? "python3"} -m uvicorn app.main:app --host ${API_HOST} --port ${API_PORT}`,
          url: `${API_URL}/api/openapi.json`,
          cwd: "../backend",
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
        {
          // Bind to an explicit IPv4 host: on GitHub-hosted runners `localhost`
          // may resolve to ::1, so vite would listen on IPv6 while Playwright
          // probes 127.0.0.1, causing a "Timed out waiting ... webServer" error.
          command: `npm run dev -- --port ${WEB_PORT} --strictPort --host 127.0.0.1`,
          url: WEB_URL,
          cwd: "../frontend",
          env: { VITE_API_BASE_URL: API_URL },
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      ],
});
