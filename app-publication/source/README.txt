ИСХОДНЫЙ КОД

Репозиторий: https://github.com/strrus21-spec/kontrpik (доступ — по согласованию с автором)
Версия, из которой собран комплект: ветка play-release, коммит указан в файле COMMIT.txt рядом.

Состав
  android/   — приложение для Android (Kotlin, WebView). Варианты: sideload (APK с GitHub) и play (Google Play).
  src/, index.html, public/ — сайт dotapick.pro (Vite + TypeScript), его копия вшивается в приложение.
  .github/workflows/play.yml — сборка AAB для Google Play.

Инструменты сборки
  Node.js 22 + npm (сайт): npm ci && npx vite build (с VITE_BASE=/ VITE_SITE_URL=https://dotapick.pro/ VITE_CF_BEACON=off)
  JDK 17, Android Gradle Plugin 8.9.1, Gradle 8.11.1, compileSdk/targetSdk 36.
  Копию сайта положить в android/app/src/main/assets/site (без sw.js), затем:
    cd android && ./gradlew bundlePlayRelease
  Результат: android/app/build/outputs/bundle/playRelease/app-play-release.aab
  Всё это делает workflow «Google Play» автоматически.
