import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:1420",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bun tests/e2e/serve.js",
    port: 1420,
    reuseExistingServer: true,
  },
});
