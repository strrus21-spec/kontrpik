# dotapick.pro на своём сервере (VPS, Docker)

GitHub собирает сайт для dotapick.pro при каждом изменении кода и после ночного обновления статистики
и кладёт готовые файлы в ветку `site`. Сервер раз в час забирает её — ничего вручную обновлять не нужно.

## Один раз на VPS
1. Веб-сервер в контейнере раздаёт папку с хоста, например `/srv/dotapick/site`
   (nginx: `-v /srv/dotapick/site:/usr/share/nginx/html:ro`). Папка должна монтироваться целиком, а не по файлам.
2. Скрипт обновления и первый запуск:
   ```
   sudo mkdir -p /srv/dotapick
   sudo curl -fsSL https://raw.githubusercontent.com/strrus21-spec/kontrpik/main/scripts/vps-update.sh -o /srv/dotapick/update.sh
   sudo chmod +x /srv/dotapick/update.sh
   sudo SITE_DIR=/srv/dotapick/site /srv/dotapick/update.sh
   ```
3. Каждый час (crontab -e под root):
   ```
   7 * * * * SITE_DIR=/srv/dotapick/site /srv/dotapick/update.sh >> /var/log/dotapick-update.log 2>&1
   ```
4. Для ссылок вида `/hero/pudge`, `/match/123` веб-серверу нужен запасной путь на `404.html`/`index.html`
   (nginx: `try_files $uri $uri/ /index.html;`).

Перезапускать контейнер после обновления не нужно: меняются только файлы в смонтированной папке.
