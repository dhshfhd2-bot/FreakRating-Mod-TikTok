# TikTok для FreakRating

Оверлей TikTok поверх игры, открывается по **F8** и иконкой в телефоне.

## Файлы

| Файл | Куда положить |
|---|---|
| `tiktok-phone.js` | в корень клиента, рядом с `launcher.js` |
| `mods/tiktok-app.js` | старая версия, **не нужна** — `tiktok-phone.js` внедряет код сам |

Обязательно чтобы `launcher.js` содержал строку:

```js
load('./tiktok-phone.js');
```

## Установка вручную

1. Скачай `tiktok-phone.js`, положи рядом с `launcher.js`.
2. Открой `launcher.js` и добавь после `load('./mod-loader.js');` строку `load('./tiktok-phone.js');`.
3. Запусти `start.bat`.

## Автоматически

Положи этот репозиторий рядом с папкой `FreakRating-Clean` и запусти:

```powershell
.\install.ps1
```

После установки F8 открывает TikTok. Чтобы убрать — удали строку из `launcher.js` и файл `tiktok-phone.js`.
