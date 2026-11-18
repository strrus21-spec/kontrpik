#!/bin/sh
# Обновление сайта dotapick.pro на VPS: забрать свежую сборку из ветки `site` репозитория.
# Ставится один раз; потом cron запускает его каждый час (см. docs/VPS.md).
#   SITE_DIR — папка, которую раздаёт веб-сервер в Docker-контейнере (смонтирована как volume).
set -eu
REPO="https://github.com/strrus21-spec/kontrpik.git"
SITE_DIR="${SITE_DIR:-/srv/dotapick/site}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git clone -q --depth 1 --branch site "$REPO" "$TMP/site"
rm -rf "$TMP/site/.git"
# не трогаем сайт, если сборка пустая или битая
[ -f "$TMP/site/index.html" ] && [ -f "$TMP/site/data/stats.json" ] || { echo "сборка неполная — пропуск"; exit 1; }
mkdir -p "$SITE_DIR"
# атомарно: новая папка рядом, затем подмена
NEW="$SITE_DIR.new"; OLD="$SITE_DIR.old"
rm -rf "$NEW" "$OLD"; cp -a "$TMP/site" "$NEW"
mv "$SITE_DIR" "$OLD" && mv "$NEW" "$SITE_DIR" && rm -rf "$OLD"
echo "dotapick.pro обновлён: $(date -u +'%F %H:%M UTC')"
