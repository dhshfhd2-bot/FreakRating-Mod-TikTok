// mods/tiktok-app.js (v3) — иконка TikTok на ВТОРОМ экране игрового телефона.
(() => {
  'use strict';
  if (window.__tiktokApp3) return;
  window.__tiktokApp3 = true;

  const TARGET = 'Змейка'; // приложение на втором экране — рядом с ним ставим TikTok
  const PHONE_MARKERS = new Set(['Змейка', 'Авитко', 'Камера', 'Квартира', 'Фрикграм', 'ФрикМани', 'Ангар']);
  const MARK = 'data-tiktok-v3';
  const OLD_MARKS = ['data-tiktok-app']; // иконки от старых версий — удаляем
  const SEL = '[' + MARK + ']';
  const say = (m) => console.info(m);
  const request = (r) => { window.__tiktokReq = r; };

  // ---- всплывающая подсказка на экране ----
  function toast(text) {
    let t = document.getElementById('__tt_toast');
    if (!t) {
      t = document.createElement('div');
      t.id = '__tt_toast';
      t.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
        'background:#000c;color:#fff;font:600 14px sans-serif;padding:8px 14px;border-radius:8px;' +
        'pointer-events:none;max-width:80vw;text-align:center;';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.style.display = 'block';
    clearTimeout(t.__h);
    t.__h = setTimeout(() => { t.style.display = 'none'; }, 3500);
  }

  function eachText(root, fn) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (fn(n) === true) return n;
    return null;
  }

  function visibleLabels() {
    const found = new Map();
    eachText(document.body, (n) => {
      const t = n.nodeValue.trim();
      if (!PHONE_MARKERS.has(t) || found.has(t)) return false;
      const p = n.parentElement;
      if (p && !p.closest(SEL) && p.getClientRects().length > 0) found.set(t, p);
      return false;
    });
    return found;
  }

  function tileAndGrid(label) {
    let tile = label;
    while (tile && !tile.querySelector('img,canvas,svg')) tile = tile.parentElement;
    if (!tile || !tile.parentElement || tile === document.body) return null;
    return { tile, grid: tile.parentElement };
  }

  // Запасной вариант: рамка телефона и приблизительные пропорции
  function fallbackRect(from) {
    let shell = from;
    while (shell && shell !== document.body) {
      const r = shell.getBoundingClientRect();
      if (r.height > innerHeight * 0.6 && r.width < innerWidth * 0.45) break;
      shell = shell.parentElement;
    }
    if (!shell || shell === document.body) return null;
    const s = shell.getBoundingClientRect();
    const pad = s.height * 0.056;
    return { x: s.left + 4, y: s.top + pad, w: s.width - 8, h: s.height - 2 * pad };
  }

  // Экран телефона = от нижнего края строки состояния (часы) до верхнего края нижней панели (← ✕)
  function phoneRect(from) {
    const vw = innerWidth, vh = innerHeight;
    try {
      // ширина колонки телефона
      let col = from, pw = 0;
      while (col && col !== document.body) {
        const r = col.getBoundingClientRect();
        if (r.width > 200 && r.width < vw * 0.45) { pw = r.width; break; }
        col = col.parentElement;
      }
      // часы в строке состояния — самый верхний небольшой текст вида 01:38
      let clock = null, clockTop = Infinity;
      eachText(document.body, (n) => {
        if (!/^\d{1,2}:\d{2}$/.test(n.nodeValue.trim())) return false;
        const p = n.parentElement;
        if (!p || p.closest(SEL)) return false;
        const r = p.getBoundingClientRect();
        if (!r.width || !r.height || r.height > 40) return false;
        if (r.top < clockTop) { clock = p; clockTop = r.top; }
        return false;
      });
      if (clock && pw) {
        let row = clock;
        while (row.parentElement && row.parentElement !== document.body && row.getBoundingClientRect().width < pw * 0.8) row = row.parentElement;
        let shell = row.parentElement;
        while (shell && shell !== document.body && shell.getBoundingClientRect().height < vh * 0.6) { row = shell; shell = shell.parentElement; }
        if (shell && shell !== document.body) {
          const s = shell.getBoundingClientRect();
          const rr = row.getBoundingClientRect();
          let bottom = null;
          const test = (e) => {
            if (e === row || row.contains(e)) return;
            const r = e.getBoundingClientRect();
            if (r.top > s.top + s.height * 0.8 && r.height >= 30 && r.height <= 120 && r.width >= s.width * 0.8) {
              bottom = bottom === null ? r.top : Math.max(bottom, r.top);
            }
          };
          for (const c of shell.children) test(c);
          if (bottom === null) for (const e of shell.querySelectorAll('*')) test(e);
          if (bottom !== null && bottom - rr.bottom > vh * 0.4) {
            return { x: rr.left, y: rr.bottom, w: rr.width, h: bottom - rr.bottom };
          }
        }
      }
    } catch (e) { console.warn('[tiktok-app] phoneRect', e); }
    return fallbackRect(from);
  }

  // ---- телефон ещё на экране? (виден, не гаснет, не уезжает) ----
  function phoneAlive() {
    const el = document.querySelector(SEL);
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.3) return null;
    }
    return r;
  }

  // Актуальные границы — основной процесс читает их, пока окно TikTok открыто
  window.__tiktokRect = () => {
    if (!phoneAlive()) return null;
    const el = document.querySelector(SEL);
    return phoneRect(el.parentElement || el);
  };

  // Закрываем TikTok в тот же кадр, когда телефон начал закрываться
  let tiktokOpen = false, lastPos = null, lastSize = null, startPos = null;
  function closeNow(why) {
    if (!tiktokOpen) return;
    tiktokOpen = false; lastPos = null; startPos = null;
    request({ type: 'hide' });
    say('__TIKTOK_HIDE__');
    console.info('[tiktok-app] TikTok закрыт, причина: ' + (why || '?'));
  }
  function watchLoop() {
    if (tiktokOpen) {
      const r = phoneAlive();
      const size = innerWidth + 'x' + innerHeight;
      if (!r) closeNow('телефон скрыт или исчез');
      else if (lastSize !== size) { lastPos = { l: r.left, t: r.top }; startPos = startPos || lastPos; lastSize = size; }
      else {
        // Телефон «уехал» (анимация закрытия) — это резкий сдвиг. Мелкие смещения
        // (телефон чуть двигается за мышкой) игнорируем.
        const dx = lastPos ? Math.abs(r.left - lastPos.l) : 0, dy = lastPos ? Math.abs(r.top - lastPos.t) : 0;
        const sx = startPos ? Math.abs(r.left - startPos.l) : 0, sy = startPos ? Math.abs(r.top - startPos.t) : 0;
        if (dx > 25 || dy > 25 || sx > 80 || sy > 80) closeNow('телефон уехал');
        else { lastPos = { l: r.left, t: r.top }; startPos = startPos || lastPos; }
      }
    }
    requestAnimationFrame(watchLoop);
  }
  requestAnimationFrame(watchLoop);

  // МГНОВЕННОЕ закрытие: ЛКМ мимо телефона закрывает TikTok в момент нажатия,
  // раньше, чем игра успеет убрать сам телефон.
  function phoneShell() {
    const el = document.querySelector(SEL);
    if (!el || !el.isConnected) return null;
    let n = el;
    while (n && n !== document.body) {
      const r = n.getBoundingClientRect();
      if (r.height > innerHeight * 0.6 && r.width < innerWidth * 0.45) return r;
      n = n.parentElement;
    }
    return null;
  }
  function onOutsideDown(e) {
    if (!tiktokOpen || e.button > 0) return;
    const s = phoneShell();
    const m = 3;
    if (!s || e.clientX < s.left - m || e.clientX > s.right + m || e.clientY < s.top - m || e.clientY > s.bottom + m) closeNow('ЛКМ мимо телефона');
  }
  for (const ev of ['pointerdown', 'mousedown']) window.addEventListener(ev, onOutsideDown, true);

  // ---- открытие TikTok ----
  let last = 0;
  function openTikTok(from) {
    const now = Date.now();
    if (now - last < 600) return;
    last = now;
    const rect = phoneRect(from);
    const r = { type: 'open', rect };
    tiktokOpen = true; lastPos = null; startPos = null;
    console.info('[tiktok-app] клик по TikTok, rect =', rect);
    toast('TikTok: открываю…');
    request(r);
    say('__TIKTOK_OPEN__' + JSON.stringify(rect));
    // Если основной процесс не забрал запрос — он не работает: открываем запасным способом
    setTimeout(() => {
      if (window.__tiktokReq === r) {
        window.__tiktokReq = null;
        toast('TikTok: основной файл tiktok-phone.js не загружен. Проверьте launcher.js и чёрное окно start.bat.');
      }
    }, 1500);
  }

  // Ловим клики на самом раннем этапе (window, capture) — игра не успеет перехватить
  function onPointer(e) {
    const el = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (!el) return;
    e.stopPropagation();
    e.preventDefault();
    openTikTok(el.parentElement || el);
  }
  for (const ev of ['click', 'pointerup', 'mouseup', 'touchend']) window.addEventListener(ev, onPointer, true);

  // ---- вставка иконки ----
  function cleanupOld() {
    for (const a of OLD_MARKS) document.querySelectorAll('[' + a + ']').forEach((n) => n.remove());
  }

  function inject() {
    cleanupOld();
    const labels = visibleLabels();
    const phone = labels.size > 0;
    const target = labels.get(TARGET);
    if (!target) return phone;
    const found = tileAndGrid(target);
    if (!found) return phone;
    const { tile, grid } = found;
    if (grid.querySelector(SEL)) return phone;

    const clone = tile.cloneNode(true);
    clone.setAttribute(MARK, '1');
    let renamed = false;
    eachText(clone, (n) => { if (n.nodeValue.trim() === TARGET) { n.nodeValue = 'TikTok'; renamed = true; } return false; });
    if (!renamed) eachText(clone, (n) => { if (n.nodeValue.trim()) { n.nodeValue = 'TikTok'; return true; } return false; });

    const iconEl = clone.querySelector('img,canvas,svg');
    const badge = document.createElement('div');
    badge.style.cssText =
      'display:flex;align-items:center;justify-content:center;background:#000;color:#fff;' +
      'font:bold 34px sans-serif;text-shadow:-2px -2px 0 #25f4ee,2px 2px 0 #fe2c55;' +
      'border-radius:inherit;box-sizing:border-box;cursor:pointer;';
    badge.textContent = '\u266A';
    if (iconEl) {
      const orig = tile.querySelector('img,canvas,svg');
      const r = (orig || iconEl).getBoundingClientRect();
      badge.style.width = (r.width || 56) + 'px';
      badge.style.height = (r.height || 56) + 'px';
      const parent = iconEl.parentElement;
      iconEl.replaceWith(badge);
      if (parent && parent !== clone) parent.style.background = '#000';
    } else {
      badge.style.width = '56px';
      badge.style.height = '56px';
      badge.style.borderRadius = '12px';
      clone.prepend(badge);
    }
    clone.style.cursor = 'pointer';
    grid.appendChild(clone);
    console.info('[tiktok-app] иконка добавлена на 2-й экран');
    return phone;
  }

  // Иконка показывается ТОЛЬКО когда плитка «Змейка» реально видна на экране телефона
  // (то есть открыт нужный экран). На первом экране иконка прячется.
  function gate() {
    const clone = document.querySelector(SEL);
    if (!clone) return;
    let ok = false;
    const t = visibleLabels().get(TARGET);
    if (t) {
      const r = t.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (r.width > 0 && r.height > 0 && cx >= 0 && cx <= innerWidth && cy >= 0 && cy <= innerHeight) {
        const e = document.elementFromPoint(cx, cy);
        const near = t.parentElement;
        ok = !!e && (e === t || t.contains(e) || (near && near.contains(e)));
      }
    }
    clone.style.visibility = ok ? '' : 'hidden';
    clone.style.pointerEvents = ok ? '' : 'none';
  }
  setInterval(gate, 100);

  let phoneShown = false, timer = null;
  function check() {
    timer = null;
    let phone = false;
    try { phone = inject(); } catch (e) { console.warn('[tiktok-app]', e); }
    if (phoneShown && !phone) closeNow('телефон закрыт');
    phoneShown = phone;
  }
  new MutationObserver(() => { if (!timer) timer = setTimeout(check, 250); })
    .observe(document.body, { childList: true, subtree: true });
  check();
  setInterval(check, 300); // телефон могут закрыть без изменений в DOM — проверяем по таймеру
  console.info('[tiktok-app] v7 готов');
})();
