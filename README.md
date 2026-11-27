# TikTok

F8 — оверлей поверх игры, иконка в телефоне.

## Все файлы мода

| Файл в репозитории | Куда ставить |
|---|---|
| `tiktok-phone.js` | корень клиента, рядом с `launcher.js` |
| `client/tiktok-phone.js` | копия для полной сборки |
| `client/mods/tiktok-app.js` | старый вариант скрипта телефона (обычно не нужен — `tiktok-phone.js` внедряет код сам) |
| `client/launcher.js` | пример `launcher.js` со строкой `load('./tiktok-phone.js')` |

## Установка

1. Положи `tiktok-phone.js` рядом с `launcher.js`.
2. Добавь в `launcher.js` после `load('./mod-loader.js');` строку `load('./tiktok-phone.js');`.
3. Запусти `start.bat`.

Автоматически: положи репозиторий рядом с `FreakRating-Clean` и запусти `.\install.ps1`.
