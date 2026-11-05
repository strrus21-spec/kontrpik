# Контрпик — помощник по Dota 2

Подбор контрпика по статистике матчей OpenDota и сборник фишек. Vite + TypeScript, без фреймворков. RU/EN.

## Команды
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: алгоритм счёта (контрольный пример ТЗ), состояние, сборка данных
npm run build      # tsc + vite build → dist/
npm run e2e        # Playwright: 1440 и 400 px, RU и EN (после npm run build)
npm run data       # выгрузка свежей статистики OpenDota в public/data
```

## Структура
- `src/scoring.ts` — алгоритм счёта (раздел 4 ТЗ), чистые функции.
- `src/i18n.ts` — словари RU/EN. `src/state.ts` — localStorage (драфт хранится по именам героев).
- `src/player.ts`, `src/me.ts` — «Мои герои» (Steam ID, профиль OpenDota, бонус за личный винрейт). `src/items.ts` — «Что купить» (угрозы → предметы). `src/share.ts` — ссылка на драфт.
- `src/hero.ts`, `src/render/hero.ts` — карточка героя (адрес `/hero/{slug}`; в пуле — правый клик или долгое нажатие). `src/lane.ts` — «Моя линия».
- `src/search.ts` — русские прозвища героев. `src/anim/` — анимированные схемы фишек. `src/render/` — разметка.
- `public/data/` — `stats.json`, `positions.json`, `tips.json`, `history/` (ежедневные снимки). `public/icons/{slug}.png` — иконки.
- `scripts/build-data.ts` + `scripts/lib/` — сборка данных (запросы из `scripts/opendota-queries.md`).
- `tests/fixtures/` — замороженные данные 31.10–02.11.2026 для теста алгоритма.
- `prototype/` — исходный прототип и Electron-версия (для справки).
- `docs/TZ.md` — ТЗ.

## Данные и деплой (GitHub Actions)
- `Data` (ежедневно 03:17 UTC): собирает статистику и кладёт её в ветку `data` (один коммит, перезаписывается — main не раздувается). Позиции обновляются раз в неделю или по кнопке. При сбое ничего не перезаписывается.
- `Deploy`: сборка + данные из ветки `data` → GitHub Pages. Запускается после `Data` и при пуше в main.
- `CI`: сборка, Vitest, Playwright на каждый пуш и PR.
- Необязательный секрет `OPENDOTA_API_KEY` снимает лимит 60 запросов в минуту.

Сборка для подкаталога: `VITE_BASE=/kontrpik/ npm run build` (в деплое задаётся автоматически). `404.html` — копия `index.html` для прямых ссылок на героев.

Первый запуск: Settings → Pages → Source: **GitHub Actions**; затем Actions → Data → Run workflow.
