import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import sharp from 'sharp';
import { accountPages } from './account-pages.mjs';
import { accountMessages } from './account-messages.mjs';
import { offlineMessages } from './offline-messages.mjs';
import { offlinePage } from './offline-page.mjs';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(mobile);
export const source = await fs.access(path.join(root, 'dist/reader.html')).then(() => path.join(root, 'dist')).catch(() => root);
const out = path.join(mobile, 'dist');
const accountFiles=new Set(['auth-config.js','auth-client.js','auth.css','password-visibility.js','reading-sync-ui.js']);
const excluded = /^(?:admin|account|auth(?:-|\.)|login|register|reset-password|forgot-password|password-visibility|contact(?:-|\.)|reading-sync)/;
const svg = inner => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
const icons = {
  home: svg('<path d="m3 10 9-7 9 7v11H3zM9 21v-8h6v8"/>'),
  read: svg('<path d="M12 5v15M12 5C8 2 3 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-2-7-2-10 1Z"/>'),
  topics: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  settings: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'),
  listen: svg('<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v9H3zm14 0h4v9h-4z"/>'),
  arrow: svg('<path d="M5 12h14m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6"/>')
};
const tabs = `<nav class="app-tabs" aria-label="Main navigation"><a href="/index.html">${icons.home}<span>Home</span></a><a href="/reader.html">${icons.read}<span>Read Quran</span></a><a href="/topics.html">${icons.topics}<span>Islamic topics</span></a><button type="button" data-app-preferences>${icons.settings}<span>Preferences</span></button></nav>`;
const noteKey = 'Your saved verses and reading place stay on this device. Quran text, fonts, translations and recitation need an internet connection.';
const offlineKey = 'You are offline. Connect to the internet to load Quran text, fonts, translations and recitation.';
const messages = {
 en:[noteKey,offlineKey],
 prs:['آیت‌های ذخیره‌شده و جای مطالعهٔ شما در همین دستگاه نگهداری می‌شود. متن قرآن، فونت‌ها، ترجمه و تلاوت به انترنت نیاز دارند.','شما به انترنت وصل نیستید. برای بارگیری متن قرآن، فونت‌ها، ترجمه و تلاوت به انترنت وصل شوید.'],
 ps:['ستاسو خوندي شوي آیتونه او د لوست ځای په همدې وسیله ساتل کېږي. د قرآن متن، فونټونه، ژباړې او تلاوت انټرنېټ ته اړتیا لري.','تاسو له انټرنېټ سره وصل نه یاست. د قرآن متن، فونټونو، ژباړو او تلاوت لپاره انټرنېټ سره وصل شئ.'],
 fa:['آیه‌های ذخیره‌شده و محل مطالعهٔ شما در همین دستگاه نگهداری می‌شوند. متن قرآن، قلم‌ها، ترجمه و تلاوت به اینترنت نیاز دارند.','به اینترنت متصل نیستید. برای بارگیری متن قرآن، قلم‌ها، ترجمه و تلاوت به اینترنت متصل شوید.'],
 de:['Gespeicherte Verse und Ihre Lesestelle bleiben auf diesem Gerät. Korantext, Schriften, Übersetzungen und Rezitation benötigen eine Internetverbindung.','Sie sind offline. Verbinden Sie sich mit dem Internet, um Korantext, Schriften, Übersetzungen und Rezitation zu laden.'],
 nl:['Opgeslagen verzen en uw leesplek blijven op dit apparaat. Korantekst, lettertypen, vertalingen en recitatie vereisen een internetverbinding.','U bent offline. Maak verbinding met internet om Korantekst, lettertypen, vertalingen en recitatie te laden.'],
 fr:['Vos versets enregistrés et votre position de lecture restent sur cet appareil. Le texte coranique, les polices, les traductions et la récitation nécessitent Internet.','Vous êtes hors ligne. Connectez-vous à Internet pour charger le texte coranique, les polices, les traductions et la récitation.'],
 it:['I versetti salvati e il punto di lettura restano su questo dispositivo. Testo coranico, caratteri, traduzioni e recitazione richiedono una connessione Internet.','Sei offline. Connettiti a Internet per caricare testo coranico, caratteri, traduzioni e recitazione.'],
 ur:['محفوظ آیات اور آپ کی پڑھنے کی جگہ اسی آلے پر رہتی ہیں۔ قرآن کے متن، فونٹس، تراجم اور تلاوت کے لیے انٹرنیٹ درکار ہے۔','آپ انٹرنیٹ سے منسلک نہیں ہیں۔ قرآن کا متن، فونٹس، تراجم اور تلاوت لوڈ کرنے کے لیے انٹرنیٹ سے منسلک ہوں۔'],
 tr:['Kaydettiğiniz ayetler ve okuma yeriniz bu cihazda kalır. Kur’an metni, yazı tipleri, çeviriler ve tilavet için internet bağlantısı gerekir.','Çevrimdışısınız. Kur’an metnini, yazı tiplerini, çevirileri ve tilaveti yüklemek için internete bağlanın.'],
 es:['Los versículos guardados y tu punto de lectura permanecen en este dispositivo. El texto coránico, las fuentes, las traducciones y la recitación necesitan Internet.','Estás sin conexión. Conéctate a Internet para cargar el texto coránico, las fuentes, las traducciones y la recitación.'],
 pt:['Os versículos guardados e o ponto de leitura ficam neste dispositivo. O texto corânico, as fontes, as traduções e a recitação precisam de Internet.','Está offline. Ligue-se à Internet para carregar o texto corânico, as fontes, as traduções e a recitação.'],
 id:['Ayat tersimpan dan posisi membaca Anda tetap berada di perangkat ini. Teks Al-Qur’an, font, terjemahan, dan tilawah memerlukan koneksi internet.','Anda sedang offline. Hubungkan ke internet untuk memuat teks Al-Qur’an, font, terjemahan, dan tilawah.']
};
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
// Explicit web-only allowlist supports both the native source repo and the public root mirror.
for (const ent of await fs.readdir(source, { withFileTypes: true })) {
  if (excluded.test(ent.name)&&!accountFiles.has(ent.name)) continue;
  if (ent.isFile() && /\.(?:html|css|js|mjs|json|svg|png|jpg|jpeg|webp|ico|woff2|txt)$/.test(ent.name)) await fs.copyFile(path.join(source, ent.name), path.join(out, ent.name));
  if (ent.isDirectory() && ['content', 'topics', 'hadith', 'locales'].includes(ent.name)) await fs.cp(path.join(source, ent.name), path.join(out, ent.name), { recursive: true });
}
// Extract the reviewed sync controls without rewriting the reading adapter.
function syncSection(html) {
  const start = html.indexOf('<section class="reading-sync"');
  if (start < 0) throw Error('Missing reviewed sync controls');
  const tags = /<\/?section\b[^>]*>/g; tags.lastIndex = start;
  let depth = 0, match;
  while ((match = tags.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (!depth) return html.slice(start,tags.lastIndex);
  }
  throw Error('Unbalanced reading sync section');
}
const reader = await fs.readFile(path.join(source, 'reader.html'), 'utf8');
const header = reader.match(/<header\b[\s\S]*?<\/header>/)[0];
const drawer = reader.match(/<dialog\b[\s\S]*?<\/dialog>/)[0];
const cards = [
 ['/account.html','My account','Private reading sync','settings'],
 ['/translations.html','Translations','Explore meanings in 13 languages','topics'],
 ['/study.html','Tafsir & words','Read with care. Reflect with intention.','read'],
 ['/downloads.html','Offline recitation','Download a surah to listen without internet.','listen'],
 ['/listen.html','Listen & recite','Recitations from Quran reciters','listen'],
 ['/progress.html','Reading progress','Saved verses','home'],
 ['/search.html','Search & study','Search Quran','topics'],
 ['/topics.html','Islamic topics','Faith, worship and everyday life','read']
].map(([href,title,desc,icon])=>`<a class="app-card" href="${href}">${icons[icon]}<strong>${title}</strong><small>${desc}</small></a>`).join('');
const home = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Al Furqan</title><script src="/theme.js"></script>${['navigation','branding','site-language','theme'].map(x=>`<link rel="stylesheet" href="/${x}.css">`).join('')}${['site-language','navigation','reading-core','reading-data','progress-store'].map(x=>`<script defer src="/${x}.js"></script>`).join('')}</head><body>${header}${drawer}<main class="app-home"><div class="app-welcome"><p>Make room for a quiet moment.</p><span data-i18n-ignore>AL FURQAN</span></div><section class="app-hero"><span class="app-hero-label">READ · UNDERSTAND · REFLECT</span><img src="/logo-light.svg" alt="Al Furqan" width="120" height="62"><h1>Read with care. Reflect with intention.</h1><p>The Noble Quran, in three scripts</p><a class="app-read" href="/reader.html"><span>Read Quran</span>${icons.arrow}</a></section><a id="app-resume" class="app-resume" href="/reader.html" hidden><span>Continue reading →</span><bdi dir="ltr"></bdi></a><div class="app-section-head"><h2>Explore Al Furqan</h2></div><section class="app-cards" aria-label="Explore Al Furqan">${cards}</section><p class="app-note">${noteKey} <span>Private account sync is optional.</span></p><p class="app-note">Downloaded recitations can play offline. Quran text, fonts, translations and tafsir still need internet.</p><p class="app-note"><a href="/privacy.html">Privacy Policy</a> · <a href="/terms.html">Terms &amp; Conditions</a> · <a href="mailto:contact@getfurqan.online">Contact</a></p></main></body></html>`;
await fs.writeFile(path.join(out, 'index.html'), home);
await fs.writeFile(path.join(out,'downloads.html'),offlinePage(header,drawer));
const sync=syncSection(await fs.readFile(path.join(source,'progress.html'),'utf8'));
for(const [name,html]of Object.entries(accountPages(header,drawer,sync)))await fs.writeFile(path.join(out,name),html);
await fs.mkdir(path.join(out,'vendor'),{recursive:true});
await fs.copyFile(path.join(source,'vendor/supabase-2.118.0.js'),path.join(out,'vendor/supabase-2.118.0.js'));
// Native sign-in never consumes tokens or email codes from a URL.
const auth=await fs.readFile(path.join(source,'auth-client.js'),'utf8');
if(!auth.includes('detectSessionInUrl:true'))throw Error('Review native auth configuration');
await fs.writeFile(path.join(out,'auth-client.js'),auth.replace('detectSessionInUrl:true','detectSessionInUrl:false'));
await fs.copyFile(path.join(mobile,'src/app-account.js'),path.join(out,'app-account.js'));
async function transform(dir) {
 for (const ent of await fs.readdir(dir,{withFileTypes:true})) {
  const file=path.join(dir,ent.name);
  if(ent.isDirectory()) { await transform(file); continue; }
  if(!ent.name.endsWith('.html')) continue;
  let html=await fs.readFile(file,'utf8');
  html=html
    .replace(/<script\b[^>]*src=["']\/(?:vendor\/supabase[^"']*|auth-[^"']*)["'][^>]*>\s*<\/script>/g,'')
    .replace(/<a\b[^>]*(?:href=["']\/(?:admin|register|reset-password|forgot-password|auth-callback)\.html)[^>]*>[\s\S]*?<\/a>/g,'')
    .replace(/href="\/contact\.html(?:#[^"]*)?"/g,'href="mailto:contact@getfurqan.online"')
    .replace(/<footer\b[\s\S]*?<\/footer>/g,'')
    .replace(/content="width=device-width,initial-scale=1"/g,'content="width=device-width,initial-scale=1,viewport-fit=cover"')
    .replace(/<head>/,'<head><script defer src="/vendor/supabase-2.118.0.js"></script><script defer src="/auth-config.js"></script><script defer src="/auth-client.js"></script>')
    .replace(/<\/head>/,'<link rel="stylesheet" href="/app.css"><script defer src="/app-native.js"></script></head>')
    .replace(/<body([^>]*)>/,`<body$1><p id="app-offline" class="app-offline" role="status" hidden>${offlineKey} <a href="/downloads.html">Offline recitation</a></p>`)
    .replace(/<\/body>/,tabs+'</body>');
  if(ent.name==='listen.html')html=html.replace(/<main\b[^>]*>/,match=>match+'<a class="app-offline-shortcut" href="/downloads.html">Offline recitation →</a>');
  html=html.replace(/<p class="progress-footer-note">[\s\S]*?<\/p>/,`<p class="progress-footer-note">${noteKey} <span>Private account sync is optional.</span></p>`);
  await fs.writeFile(file,html);
 }
}
await transform(out);
for(const [lang,values]of Object.entries(messages)){
 const file=path.join(out,'locales',lang+'.json');const dict=JSON.parse(await fs.readFile(file,'utf8'));
 Object.assign(dict,accountMessages[lang],offlineMessages[lang]);dict[noteKey]=values[0];dict[offlineKey]=values[1];await fs.writeFile(file,JSON.stringify(dict));
}
await fs.writeFile(path.join(out,'site-language.js'),(await fs.readFile(path.join(source,'site-language.js'),'utf8')).replace("version='20261107-downloads1'","version='20261108-offlineaudio1'"));
await fs.copyFile(path.join(mobile,'src/app.css'),path.join(out,'app.css'));
await build({entryPoints:[path.join(mobile,'src/app-downloads-offline.js')],bundle:true,format:'iife',target:['chrome109','safari16.4'],outfile:path.join(out,'app-downloads-offline.js'),legalComments:'eof'});
await build({entryPoints:[path.join(mobile,'src/app-native.js')],bundle:true,format:'iife',target:['chrome109','safari16.4'],outfile:path.join(out,'app-native.js'),legalComments:'eof'});
// Record exact reuse of source Quran adapters and editions, not a claim of scholarly certification.
const preserved=['mushaf-model.js','mushaf.js','mushaf.css','content/mushaf-pages.json','quran-integrity.js','reader.js','reader.css','editions.js','study.js','listen.js','reading-core.js','reading-data.js','progress-store.js'];
const hashes={};for(const name of preserved){const data=await fs.readFile(path.join(source,name));if(!data.equals(await fs.readFile(path.join(out,name))))throw Error('Source changed: '+name);hashes[name]=createHash('sha256').update(data).digest('hex');}
await fs.writeFile(path.join(out,'app-source-manifest.json'),JSON.stringify({version:JSON.parse(await fs.readFile(path.join(mobile,'package.json'),'utf8')).version,guestOnly:false,optionalAccount:true,emailFlows:'system-browser',offlineRecitation:true,requiresNetwork:true,preserved:hashes},null,2));
// Preserve the existing outlined wordmark; no font substitutions or generated Arabic.
const icon=await fs.readFile(path.join(source,'favicon.svg'));
for(const [density,size]of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})){
 const dir=path.join(mobile,'android/app/src/main/res','mipmap-'+density);
 if(await fs.access(path.join(mobile,'android')).then(()=>true).catch(()=>false)){
  await fs.mkdir(dir,{recursive:true});
  for(const name of ['ic_launcher.png','ic_launcher_round.png'])await sharp(icon).resize(size,size).png().toFile(path.join(dir,name));
  await sharp(icon).resize(Math.round(size*1.45)).extend({top:Math.round(size*.4),bottom:Math.round(size*.4),left:Math.round(size*.4),right:Math.round(size*.4),background:'#174d3b'}).resize(Math.round(size*2.25)).png().toFile(path.join(dir,'ic_launcher_foreground.png'));
 }
}
const iosIconDir=path.join(mobile,'ios/App/App/Assets.xcassets/AppIcon.appiconset');
if(await fs.access(iosIconDir).then(()=>true).catch(()=>false)){
 const contents=JSON.parse(await fs.readFile(path.join(iosIconDir,'Contents.json'),'utf8'));
 for(const item of contents.images||[]){if(item.filename){const size=Math.round(Number(item.size.split('x')[0])*parseFloat(item.scale||'1'));await sharp(icon).resize(size,size).flatten({background:'#174d3b'}).png().toFile(path.join(iosIconDir,item.filename));}}
}
// Replace template splash art as well as launcher art.
async function brandSplash(dir){
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){await brandSplash(file);continue;}
  if(!/^splash.*\.png$/.test(entry.name))continue;
  const {width,height}=await sharp(file).metadata();
  const size=Math.round(Math.min(width,height)*.26);
  const mark=await sharp(icon).resize(size,size).png().toBuffer();
  await sharp({create:{width,height,channels:4,background:'#f8f7f1'}}).composite([{input:mark,gravity:'centre'}]).png().toFile(file+'.tmp.png');
  await fs.rename(file+'.tmp.png',file);
 }
}
for(const dir of ['android/app/src/main/res','ios/App/App/Assets.xcassets/Splash.imageset']){
 const absolute=path.join(mobile,dir);if(await fs.access(absolute).then(()=>true).catch(()=>false))await brandSplash(absolute);
}
console.log('Prepared Al Furqan mobile bundle; preserved '+preserved.length+' reading source files.');
