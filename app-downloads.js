'use strict';
(() => {
  const trialNotes = {
    en: 'Installs alongside the earlier trial. Your saved items stay in the original app.',
    prs: 'کنار نسخهٔ آزمایشی قبلی نصب می‌شود. آیت‌های ذخیره‌شدهٔ شما در همان اپ قبلی می‌ماند.',
    ps: 'د پخوانۍ ازمایښتي نسخې ترڅنګ نصبېږي. ستاسو خوندي شوي توکي په پخواني اپ کې پاتې کېږي.',
    fa: 'در کنار نسخهٔ آزمایشی قبلی نصب می‌شود. موارد ذخیره‌شدهٔ شما در برنامهٔ قبلی می‌مانند.',
    de: 'Wird neben der früheren Testversion installiert. Gespeicherte Einträge bleiben in der bisherigen App.',
    nl: 'Wordt naast de eerdere testversie geïnstalleerd. Opgeslagen items blijven in de oorspronkelijke app.',
    fr: 'S’installe à côté de la précédente version d’essai. Vos éléments enregistrés restent dans l’ancienne application.',
    it: 'Si installa accanto alla versione di prova precedente. Gli elementi salvati rimangono nell’app originale.',
    ur: 'پچھلے آزمائشی ورژن کے ساتھ الگ نصب ہوتا ہے۔ محفوظ کردہ چیزیں پچھلی ایپ میں رہتی ہیں۔',
    tr: 'Önceki deneme sürümünün yanına kurulur. Kaydedilen öğeler önceki uygulamada kalır.',
    es: 'Se instala junto a la versión de prueba anterior. Los elementos guardados permanecen en la aplicación original.',
    pt: 'Instala-se ao lado da versão de teste anterior. Os itens guardados permanecem na aplicação original.',
    id: 'Dipasang berdampingan dengan versi uji coba sebelumnya. Item tersimpan tetap berada di aplikasi lama.'
  };
  const descriptions = {
    "en": "Download the signed Android preview APK.",
    "prs": "فایل APK نسخهٔ پیش‌نمایش امضاشدهٔ اندروید را دانلود کنید.",
    "ps": "د انډرایډ لاسلیک شوی مخکتنی APK فایل ډاونلوډ کړئ.",
    "fa": "فایل APK نسخهٔ پیش‌نمایش امضاشدهٔ اندروید را دانلود کنید.",
    "de": "Laden Sie die signierte Android-Vorschau als APK herunter.",
    "nl": "Download de ondertekende Android-preview als APK.",
    "fr": "Téléchargez l’APK signé de la version préliminaire Android.",
    "it": "Scarica l’APK firmato della versione di anteprima Android.",
    "ur": "اینڈرائیڈ کے دستخط شدہ پیش نظارہ ورژن کی APK ڈاؤن لوڈ کریں۔",
    "tr": "İmzalı Android önizleme APK’sını indirin.",
    "es": "Descarga el APK firmado de la versión preliminar para Android.",
    "pt": "Descarregue o APK assinado da versão de pré-visualização para Android.",
    "id": "Unduh APK pratinjau Android yang ditandatangani."
};
  function translateLabels() {
    const description = document.querySelector('[data-app-download-description]');
    if (description) description.textContent = descriptions[window.AFI18n?.language] || descriptions.en;
    const note = document.querySelector('[data-app-trial-note]');
    if (note) note.textContent = trialNotes[window.AFI18n?.language] || trialNotes.en;
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
