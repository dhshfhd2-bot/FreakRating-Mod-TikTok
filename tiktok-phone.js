// tiktok-phone.js (v8) — TikTok как слой ВНУТРИ окна игры поверх экрана телефона.
// Открывается кликом по иконке TikTok в телефоне (мод mods/tiktok-app.js) или по F8.
const { app, BrowserWindow, WebContentsView } = require('electron');

console.log('[tiktok] модуль загружен (v8)');

const HOTKEY = 'F8';
const START_URL = 'https://www.tiktok.com/foryou';
// Ручная подгонка в пикселях, если слой сидит не идеально
const NUDGE = { x: 0, y: 0, w: 0, h: 0 };
// Десктопный Chrome: мобильный вариант TikTok пытается открыть App Store
const UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;

let view = null;        // слой с TikTok
let attachedTo = null;  // окно игры, к которому он прикреплён
let gameWin = null;
let gameWc = null;
let shown = false;
let manual = false;     // открыто по F8 без телефона
let typing = false;     // в TikTok сейчас вводят текст
let missing = 0;
let track = null;

const isWeb = (u) => /^https?:/i.test(u);

// ---------- скрипт, который выполняется ВНУТРИ страницы TikTok: громкость + признак ввода текста ----------
function pageScript() {
  if (window.__ttInit) return;
  window.__ttInit = true;

  // Свой ползунок убран: у TikTok есть собственный. Здесь только защита от «удара по ушам»:
  // запоминаем громкость, которую вы выставили на играющем видео, и ставим её новому видео ДО старта звука.
  let last = parseFloat(localStorage.getItem('__ttLastVol'));
  if (!isFinite(last) || last < 0 || last > 1) last = null;
  const isMedia = (n) => n && n.tagName && /^(VIDEO|AUDIO)$/.test(n.tagName);
  const fix = (m) => {
    if (last === null) return;
    try { if (Math.abs(m.volume - last) > 0.001) { m.__ttOurs = true; m.volume = last; } } catch (_) {}
  };

  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { fix(this); return origPlay.apply(this, arguments); };

  for (const ev of ['loadstart', 'loadedmetadata', 'canplay', 'play', 'playing']) {
    window.addEventListener(ev, (e) => { if (isMedia(e.target)) fix(e.target); }, true);
  }
  window.addEventListener('volumechange', (e) => {
    const m = e.target;
    if (!isMedia(m)) return;
    if (m.__ttOurs) { m.__ttOurs = false; return; }
    if (!m.paused) { // меняют громкость играющего видео — это ваша настройка
      last = m.volume;
      try { localStorage.setItem('__ttLastVol', String(last)); } catch (_) {}
    }
  }, true);
  new MutationObserver((list) => {
    for (const rec of list) for (const n of rec.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (isMedia(n)) fix(n);
      else if (n.querySelectorAll) n.querySelectorAll('video,audio').forEach(fix);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  addEventListener('focusin', (e) => {
    const t = e.target;
    window.__ttTyping = !!(t && t.type !== 'range' && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
  }, true);
  addEventListener('focusout', () => { window.__ttTyping = false; }, true);
}
const injectUi = (wc) => { if (!wc.isDestroyed()) wc.executeJavaScript('(' + pageScript.toString() + ')()').catch(() => {}); };

// ---------- слой ----------
function ensureView() {
  if (view && !view.webContents.isDestroyed()) return view;
  view = new WebContentsView({
    webPreferences: {
      partition: 'persist:tiktok', // вход в аккаунт сохраняется
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  try { view.setBackgroundColor('#000000'); } catch (_) {}
  const wc = view.webContents;
  wc.setUserAgent(UA);
  const guard = (e, url) => {
    if (!isWeb(url)) { e.preventDefault(); console.log('[tiktok] заблокирована ссылка:', url); }
  };
  wc.on('will-navigate', guard);
  wc.on('will-redirect', guard);
  wc.setWindowOpenHandler(({ url }) => { if (isWeb(url)) wc.loadURL(url); return { action: 'deny' }; });
  wc.on('dom-ready', () => injectUi(wc));
  wc.on('did-finish-load', () => injectUi(wc));
  wc.on('did-navigate-in-page', () => injectUi(wc));
  wc.loadURL(START_URL);
  attachedTo = null;
  return view;
}

function attach(parent) {
  if (attachedTo && attachedTo !== parent) { try { attachedTo.contentView.removeChildView(view); } catch (_) {} }
  parent.contentView.addChildView(view); // повторное добавление поднимает слой поверх игры
  if (attachedTo !== parent) {
    parent.on('closed', () => { if (attachedTo === parent) { attachedTo = null; shown = false; stopTrack(); } });
  }
  attachedTo = parent;
}

function setVisible(v) {
  if (typeof view.setVisible === 'function') view.setVisible(v);
  else if (!v) view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
}

function toBounds(wc, rect, parent) {
  const z = wc.getZoomFactor ? wc.getZoomFactor() : 1;
  if (rect && [rect.x, rect.y, rect.w, rect.h].every(Number.isFinite) && rect.w > 50 && rect.h > 50) {
    return {
      x: Math.round(rect.x * z) + NUDGE.x,
      y: Math.round(rect.y * z) + NUDGE.y,
      width: Math.round(rect.w * z) + NUDGE.w,
      height: Math.round(rect.h * z) + NUDGE.h,
    };
  }
  const [w, h] = parent.getContentSize();
  const height = Math.min(780, h - 20);
  return { width: 390, height, x: w - 420, y: Math.max(0, Math.round((h - height) / 2)) };
}

function stopTrack() { if (track) { clearInterval(track); track = null; } }

// Пока TikTok открыт: подгоняем слой под телефон и закрываем, когда телефон закрыли
function startTrack(wc, parent) {
  stopTrack();
  track = setInterval(async () => {
    if (!shown || !view || view.webContents.isDestroyed() || wc.isDestroyed() || parent.isDestroyed()) return;
    try { typing = await view.webContents.executeJavaScript('!!window.__ttTyping'); } catch (_) {}
    let rect = null;
    try { rect = await wc.executeJavaScript('window.__tiktokRect ? window.__tiktokRect() : null'); } catch (_) {}
    if (!rect) {
      if (!manual && ++missing >= 2) { console.log('[tiktok] телефон закрыт — закрываю TikTok'); hide(); }
      return;
    }
    missing = 0;
    const b = toBounds(wc, rect, parent);
    const c = view.getBounds();
    if (Math.abs(c.x - b.x) > 1 || Math.abs(c.y - b.y) > 1 || Math.abs(c.width - b.width) > 1 || Math.abs(c.height - b.height) > 1) {
      view.setBounds(b);
    }
  }, 100);
}

const PLAY_JS = '(() => { document.querySelectorAll("video").forEach((v) => { const r = v.getBoundingClientRect(); ' +
  'if (r.height > 0 && r.top < innerHeight && r.bottom > 0) v.play().catch(() => {}); }); })()';
const PAUSE_JS = 'document.querySelectorAll("video,audio").forEach((m) => m.pause())';

function show(wc, rect, isManual) {
  try {
    const parent = BrowserWindow.fromWebContents(wc) || gameWin;
    if (!parent) return;
    gameWin = parent; gameWc = wc;
    console.log('[tiktok] открытие, rect =', JSON.stringify(rect));
    ensureView();
    attach(parent);
    view.setBounds(toBounds(wc, rect, parent));
    setVisible(true);
    const tw = view.webContents;
    tw.setAudioMuted(false);
    tw.executeJavaScript(PLAY_JS).catch(() => {});
    tw.focus();
    shown = true; manual = !!isManual; missing = 0;
    startTrack(wc, parent);
  } catch (e) {
    console.error('[tiktok] ошибка:', e);
  }
}

function hide() {
  if (!shown) return;
  shown = false;
  stopTrack();
  if (view && !view.webContents.isDestroyed()) {
    setVisible(false); // сначала прячем слой — это и есть «мгновенно»
    const tw = view.webContents;
    tw.setAudioMuted(true);
    tw.executeJavaScript(PAUSE_JS).catch(() => {});
  }
  if (gameWc && !gameWc.isDestroyed()) gameWc.focus();
}

// P в TikTok: закрыть TikTok и передать P игре, чтобы она закрыла телефон
function closeWithP() {
  hide();
  if (!gameWc || gameWc.isDestroyed()) return;
  setTimeout(() => {
    if (gameWc.isDestroyed()) return;
    gameWc.focus();
    gameWc.sendInputEvent({ type: 'keyDown', keyCode: 'P' });
    gameWc.sendInputEvent({ type: 'char', keyCode: 'p' });
    gameWc.sendInputEvent({ type: 'keyUp', keyCode: 'P' });
  }, 60);
}

async function toggle(wc) {
  if (shown) return hide();
  const src = view && wc === view.webContents ? gameWc : wc;
  if (!src || src.isDestroyed()) return;
  let rect = null;
  try { rect = await src.executeJavaScript('window.__tiktokRect ? window.__tiktokRect() : null'); } catch (_) {}
  show(src, rect, !rect);
}

function handleRequest(wc, r) {
  if (!r) return;
  if (r.type === 'open') show(wc, r.rect || null, false);
  else if (r.type === 'hide') hide();
}

app.on('web-contents-created', (_e, wc) => {
  // Опрос флага, который выставляет мод в телефоне
  wc.on('did-finish-load', () => {
    const url = wc.getURL();
    if (!url || url.startsWith('devtools://') || url.includes('tiktok.com') || wc.__ttPoll) return;
    console.log('[tiktok] слежу за окном:', url);
    wc.__ttPoll = setInterval(async () => {
      if (wc.isDestroyed()) { clearInterval(wc.__ttPoll); return; }
      try {
        const r = await wc.executeJavaScript('(() => { const r = window.__tiktokReq; window.__tiktokReq = null; return r || null; })()');
        handleRequest(wc, r);
      } catch (_) {}
    }, 40);
  });

  // Быстрый путь закрытия: мод пишет в консоль __TIKTOK_HIDE__, закрываем сразу, без опроса
  wc.on('console-message', (a, _lvl, c) => {
    const msg = a && typeof a.message === 'string' ? a.message : (typeof c === 'string' ? c : '');
    if (msg.startsWith('__TIKTOK_HIDE__')) hide();
  });

  wc.on('before-input-event', (ev, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === HOTKEY) { toggle(wc); return; }
    if (view && wc === view.webContents && shown && input.code === 'KeyP' &&
        !input.control && !input.alt && !input.meta && !input.shift && !typing) {
      ev.preventDefault();
      closeWithP();
    }
  });
});

module.exports = { toggle };
