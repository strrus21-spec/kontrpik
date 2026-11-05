import { defineConfig } from '@playwright/test';

// Chromium: в облачной среде предустановлен, в CI ставится через `npx playwright install chromium`.
// Сборка для e2e — `npm run e2e` (с VITE_ROOM_API на локальный worker).
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  // Service worker перехватывает запросы мимо page.route — включаем его только в тесте PWA.
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'block' },
  webServer: [
    { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
    // Бэкенд стрима (worker/) локально: комнаты и таблица лидеров. Данные — во временной папке.
    { command: 'cd worker && npx wrangler dev --port 8787 --ip 127.0.0.1 --persist-to ../test-results/.wrangler', url: 'http://127.0.0.1:8787/leaderboard', reuseExistingServer: true, timeout: 60_000 },
  ],
});
