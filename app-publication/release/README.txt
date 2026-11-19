СБОРКА ДЛЯ GOOGLE PLAY (AAB)

В этой папке: DotaPick-play-3.aab — versionName 1.1.3, versionCode 3, БЕЗ ПОДПИСИ (ключ загрузки ещё не согласован).
Манифест проверен: только INTERNET и ACCESS_NETWORK_STATE, minSdk 24, targetSdk 36, AD_ID нет.

Где взять AAB
  GitHub → strrus21-spec/kontrpik → Actions → «Google Play» → последний успешный запуск → Artifacts →
  DotaPick-play-aab (файл DotaPick-play-N.aab, где N = versionCode).
  Сборка запускается вручную (кнопка Run workflow) или при изменениях в ветке play-release.

Вариант сборки
  play — без проверки обновлений через GitHub и без загрузки APK вне магазина (правила Google Play).
  Отличается от APK на GitHub только этим; сайт внутри понимает метку и скрывает донаты и публичную
  таблицу лидеров викторины.
  versionName 1.1.N, versionCode N (номер запуска сборки), minSdk 24, targetSdk 36.

Подпись — НУЖНО СОГЛАСОВАТЬ с издателем (до первой загрузки)
  Вариант А (рекомендуем): издатель создаёт ключ загрузки (upload key) и хранит его у себя.
    Автор даёт AAB без подписи (так собирается, пока ключ не задан) — издатель подписывает его своим ключом:
      jarsigner -keystore upload.jks -signedjar DotaPick-signed.aab DotaPick-play-N.aab <alias>
    и загружает. Google Play подписывает приложение своим ключом (Play App Signing).
  Вариант Б: ключ загрузки передаётся автору защищённым способом, и он добавляет его в секреты GitHub
    (Settings → Secrets → Actions): PLAY_UPLOAD_KEYSTORE_B64 (файл .jks в base64), PLAY_UPLOAD_STORE_PASSWORD,
    PLAY_UPLOAD_KEY_ALIAS, PLAY_UPLOAD_KEY_PASSWORD. Тогда AAB сразу подписан ключом загрузки.
  Ключ подписи APK с GitHub (android/sideload.keystore) для Google Play НЕ использовать — он открыт в репозитории.
  Один и тот же ключ загрузки — для всех обновлений.

Проверено перед передачей (чек-лист)
  [ ] чистая установка, все вкладки, оба языка, большой шрифт, поворот экрана, перезапуск
  [ ] без интернета: встроенная копия открывается
  [ ] разрешения в манифесте — только INTERNET и ACCESS_NETWORK_STATE (шаг «Проверка манифеста» в сборке)
  [ ] нет отладки (release, minify), нет тестовых серверов
  [ ] политика доступна: https://dotapick.pro/privacy.html и в приложении («О сайте»)
