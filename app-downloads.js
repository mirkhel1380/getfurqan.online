'use strict';
(() => {
  function translateLabels() {
    for (const image of document.querySelectorAll('.app-download-qr')) {
      const key = image.src.includes('download-android-qr') ? 'Android download QR code' : 'iPhone web app QR code';
      image.alt = window.AFI18n?.translate(key) || key;
    }
  }
  // QR links land on this guide; iOS installation remains an explicit Safari action.
  function showGuide() {
    if (location.hash !== '#install-iphone') return;
    const guide = document.getElementById('iphone-install-steps');
    if (guide) guide.open = true;
    requestAnimationFrame(() => document.getElementById('install-iphone')?.scrollIntoView({ block: 'start' }));
  }
  function ready() { showGuide(); translateLabels(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  document.addEventListener('af:languagechange', () => { translateLabels(); showGuide(); });
  addEventListener('hashchange', showGuide);
})();
