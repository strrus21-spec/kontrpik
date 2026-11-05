import { defineConfig } from '@playwright/test';

// Chromium: в облачной среде предустановлен, в CI ставится через `npx playwright install chromium`.

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  // Service worker перехватывает запросы мимо page.route — включаем его только в тесте PWA.
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'block' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
