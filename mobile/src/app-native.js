import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App } from '@capacitor/app';

function start() {
  const path = location.pathname;
  document.querySelectorAll('.app-tabs a').forEach(a => {
    const target = new URL(a.href).pathname;
    if (path === target || (target === '/index.html' && path === '/') || (target === '/topics.html' && path.startsWith('/topics/'))) a.setAttribute('aria-current', 'page');
  });
  const preferences = document.querySelector('[data-app-preferences]');
  preferences?.addEventListener('click', () => document.querySelector('.af-header-actions [data-drawer="preferences"]')?.click());
  const status = document.getElementById('app-offline');
  function connectivity() { if (status) status.hidden = navigator.onLine; }
  addEventListener('online', connectivity);
  addEventListener('offline', connectivity);
  connectivity();
  // The app uses the same guest data adapter; no native sign-in callbacks are advertised.
  window.AFData?.ready.then(() => {
    const place = window.FurqanProgress?.read()?.resume;
    if (place && /^\d{1,3}:\d{1,3}$/.test(place.key)) {
      const a = document.getElementById('app-resume');
      if (a) { a.href = '/reader.html?verse=' + encodeURIComponent(place.key); a.querySelector('bdi').textContent = place.key; a.hidden = false; }
    }
  });
  if (Capacitor.getPlatform() === 'android') {
    App.addListener('backButton', ({ canGoBack }) => {
      const dialog = document.querySelector('dialog[open]');
      if (dialog) { dialog.close(); return; }
      if (canGoBack) { history.back(); return; }
      if (!['/', '/index.html'].includes(location.pathname)) { location.replace('/index.html'); return; }
      App.exitApp();
    });
  }
  if (Capacitor.isNativePlatform()) {
    function systemAppearance() {
      const dark = document.documentElement.dataset.theme === 'dark';
      SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
    }
    document.addEventListener('af:themechange', systemAppearance);
    systemAppearance();
    // Arbitrary external pages never replace the trusted local app origin.
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin && ['https:', 'mailto:'].includes(url.protocol)) {
        e.preventDefault(); window.open(url.href, '_system', 'noopener');
      }
    });
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
