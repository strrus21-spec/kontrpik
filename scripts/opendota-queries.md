# Проверенные запросы к OpenDota

Все запросы проверены 2–5 ноября 2026. Ключ API не нужен, лимит ~60 запросов в минуту; на 429 ждать и повторять.

## Герои
`GET https://api.opendota.com/api/heroStats` → id, localized_name, primary_attr, roles, icon.
Иконка: `https://cdn.cloudflare.steamstatic.com` + поле `icon` без `?` в конце.

## Матчи пабликов (контрпики и синергия)
Запрос по времени (`start_time > …`) падает с таймаутом. Работает только по диапазонам `match_id`:

```sql
-- 1. последний id
SELECT match_id FROM public_matches ORDER BY match_id DESC LIMIT 1;
-- 2. отступить на 300 000 (у свежих матчей составы ещё пустые),
--    затем 20 блоков по 200 000 id вниз:
SELECT radiant_win r, avg_rank_tier t, radiant_team a, dire_team d, start_time s
FROM public_matches
WHERE match_id BETWEEN {a} AND {b} AND lobby_type = 7 AND game_mode IN (2, 22);
```
`GET https://api.opendota.com/api/explorer?sql=<urlencoded>`. ~3,5 с на блок, ~1,4 млн матчей на выходе.
Группы рангов по `avg_rank_tier`: low < 40 (Рекрут–Герой), mid 40–59 (Легенда–Властелин), high ≥ 60 (Божество–Титан).

## Про-сцена
`GET /api/heroes/{id}/matchups` → games_played, wins против каждого героя. ~40 игр на пару.

## Позиции 1–5 (про-матчи за 180 дней)
У пабликов позиций нет. Позиция = линия + место по золоту внутри линии:
```sql
WITH p AS (
  SELECT pm.hero_id, pm.match_id, (pm.player_slot < 128) rad, pm.lane_role lr, pm.gold_per_min g
  FROM player_matches pm JOIN matches m USING (match_id)
  WHERE m.start_time > extract(epoch from now() - interval '180 days') AND pm.lane_role IN (1,2,3)
), r AS (
  SELECT hero_id, lr, rank() OVER (PARTITION BY match_id, rad, lr ORDER BY g DESC) k,
         count(*) OVER (PARTITION BY match_id, rad, lr) n
  FROM p
)
SELECT hero_id, lr, k, n, count(*) c FROM r GROUP BY hero_id, lr, k, n;
```
Маппинг: lane_role 1 (safe): k=1 → pos 1, иначе pos 5; lane_role 2 (mid): k=1 → pos 2, иначе pos 4; lane_role 3 (off): k=1 → pos 3, иначе pos 4.
Герой подходит позиции, если там ≥ 15% его игр. При < 40 игр — запасной вариант по ролям OpenDota.

## Игрок (для «Мои герои»)
- `GET /api/players/{account_id}` — профиль (account_id = Steam32; Steam64 − 76561197960265728).
- `GET /api/players/{account_id}/heroes?date=90` — игры и победы по героям за 90 дней.
- `GET /api/players/{account_id}/recentMatches` — последние матчи.
Работает, только если в Dota включена «Общедоступная история матчей».

## Матч (для «Разбор матча»)
- `GET /api/matches/{match_id}` — полные данные, если матч разобран (`version != null`).
- `POST /api/request/{match_id}` — поставить матч в очередь на разбор, затем опрашивать `GET /api/request/{jobId}`.

Логика агрегации (контр, синергия, solo) реализована в `prototype/desktop/main.js`, функция обработчика `refresh`.
