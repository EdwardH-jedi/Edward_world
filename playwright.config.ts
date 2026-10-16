import { defineConfig } from "@playwright/test";

const PORT = 3100;

// Runs against the production build (`npm run build` first), as the Next.js
// Playwright guide recommends, so layout is measured as it ships.
export default defineConfig({
  testDir: "e2e",
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    command: `npm run start -- --port ${PORT} --hostname 127.0.0.1`,
    reuseExistingServer: !process.env.CI,
    url: `http://127.0.0.1:${PORT}`,
  },
});
