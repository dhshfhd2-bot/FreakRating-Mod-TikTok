// launcher.js — запускает моды и затем сам клиент. Ошибка в одном моде не ломает остальные.
require('electron').app.commandLine.appendSwitch('no-proxy-server')
const load = (name) => {
  try { require(name); console.log('[launcher] подключено: ' + name); }
  catch (e) { console.log('[launcher] ОШИБКА в ' + name + ': ' + (e && e.stack || e)); }
};
load('./mod-loader.js');
load('./tiktok-phone.js');   // TikTok поверх телефона
console.log('[launcher] запускаю клиент');
require('./dist/main/main.js');
