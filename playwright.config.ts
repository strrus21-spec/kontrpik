import { defineConfig } from '@playwright/test';

// Chromium: в облачной среде предустановлен, в CI ставится через `npx playwright install chromium`.

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4173' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
