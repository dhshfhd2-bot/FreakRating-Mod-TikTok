// TikTok — просто положи этот файл в папку mods рядом с лаунчером.
// F8 открывает TikTok в отдельном окне поверх игры.
(() => {
  let win = null;
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'F8' || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (win && !win.closed) { win.focus(); return; }
    win = window.open('https://www.tiktok.com/foryou', 'freak_tiktok',
      'width=430,height=780,menubar=no,toolbar=no,location=no,status=no');
  }, true);
})()
