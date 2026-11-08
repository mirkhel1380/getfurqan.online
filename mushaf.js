'use strict';
window.AFMushaf=(()=>{
 const keys=['Mushaf pages','Previous page','Next page','Verse options','Close verse options','Pages follow the 604-page Madani Mushaf.','IndoPak text wraps within the same page boundaries.'];
 const messages={
  prs:['صفحه‌های مصحف','صفحهٔ قبلی','صفحهٔ بعدی','گزینه‌های آیت','بستن گزینه‌های آیت','شماره‌ها مطابق مصحف مدنیِ ۶۰۴ صفحه‌ای است.','متن هندوپاک در همان محدودهٔ آیات صفحه، متناسب با نمایشگر چیده می‌شود.'],
  ps:['د مصحف پاڼې','مخکینۍ پاڼه','راتلونکې پاڼه','د آیت غوراوي','د آیت غوراوي بندول','د پاڼو شمېرې د ۶۰۴ پاڼیز مدني مصحف له مخې دي.','هندوپاک متن د همدې پاڼې د آیتونو په حدودو کې د پردې له اندازې سره سم برابرېږي.'],
  fa:['صفحه‌های مصحف','صفحهٔ قبل','صفحهٔ بعد','گزینه‌های آیه','بستن گزینه‌های آیه','شماره‌ها مطابق مصحف مدنیِ ۶۰۴ صفحه‌ای است.','متن هندوپاک در همان محدودهٔ آیات صفحه، متناسب با نمایشگر چیده می‌شود.'],
  de:['Mushaf-Seiten','Vorherige Seite','Nächste Seite','Versoptionen','Versoptionen schließen','Die Seiten folgen dem 604-seitigen Madani-Mushaf.','IndoPak-Text wird innerhalb derselben Seitengrenzen umbrochen.'],
  nl:['Mushaf-pagina’s','Vorige pagina','Volgende pagina','Versopties','Versopties sluiten','De pagina’s volgen de Madani-Mushaf met 604 pagina’s.','IndoPak-tekst loopt door binnen dezelfde paginagrenzen.'],
  fr:['Pages du mushaf','Page précédente','Page suivante','Options du verset','Fermer les options du verset','Les pages suivent le mushaf de Médine de 604 pages.','Le texte IndoPak s’adapte à l’écran dans les mêmes limites de page.'],
  it:['Pagine del mushaf','Pagina precedente','Pagina successiva','Opzioni del versetto','Chiudi le opzioni del versetto','Le pagine seguono il mushaf di Medina di 604 pagine.','Il testo IndoPak si adatta allo schermo entro gli stessi limiti di pagina.'],
  ur:['مصحف کے صفحات','پچھلا صفحہ','اگلا صفحہ','آیت کے اختیارات','آیت کے اختیارات بند کریں','صفحہ نمبر ۶۰۴ صفحات والے مدنی مصحف کے مطابق ہیں۔','ہندوپاک متن انہی آیات کی حدود میں اسکرین کے مطابق ترتیب پاتا ہے۔'],
  tr:['Mushaf sayfaları','Önceki sayfa','Sonraki sayfa','Ayet seçenekleri','Ayet seçeneklerini kapat','Sayfalar 604 sayfalık Medine mushafını izler.','IndoPak metni aynı sayfa sınırları içinde ekrana göre düzenlenir.'],
  es:['Páginas del mushaf','Página anterior','Página siguiente','Opciones del versículo','Cerrar opciones del versículo','Las páginas siguen el mushaf de Medina de 604 páginas.','El texto IndoPak se adapta a la pantalla dentro de los mismos límites de página.'],
  pt:['Páginas do mushaf','Página anterior','Página seguinte','Opções do versículo','Fechar opções do versículo','As páginas seguem o mushaf de Medina de 604 páginas.','O texto IndoPak adapta-se ao ecrã dentro dos mesmos limites de página.'],
  id:['Halaman mushaf','Halaman sebelumnya','Halaman berikutnya','Opsi ayat','Tutup opsi ayat','Halaman mengikuti mushaf Madinah dengan 604 halaman.','Teks IndoPak menyesuaikan layar dalam batas ayat halaman yang sama.']
 };
 const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
 const t=key=>messages[window.AFI18n?.language]?.[keys.indexOf(key)]||window.AFI18n?.translate(key)||key;
 const number=n=>new Intl.NumberFormat(window.AFI18n?.language==='prs'?'fa-AF':window.AFI18n?.language||'en',{useGrouping:false}).format(n);
 let last=null,observer=null,portal=null;
 function restore(){if(portal){portal.marker.replaceWith(portal.row);portal=null;}}
 function closeVerse(){restore();const d=document.getElementById('mushaf-ayah-dialog');if(d?.open)d.close();}
 function openVerse(key){
  closeVerse();document.getElementById('mushaf-translation').value=document.getElementById('translation').value;const row=document.getElementById('verse-'+key),dialog=document.getElementById('mushaf-ayah-dialog');if(!row||!dialog)return;
  const marker=document.createComment('Verse place');row.before(marker);portal={row,marker};
  row.querySelector('.translation').dataset.loading=window.AFI18n?.translate('Loading translation…')||'Loading translation…';
  document.getElementById('mushaf-dialog-title').textContent=(window.AFI18n?.translate('Verse')||'Verse')+' '+key;
  document.getElementById('mushaf-verse-detail').replaceChildren(row);dialog.showModal();
 }
 function labels(){
  for(const n of document.querySelectorAll('[data-mushaf-label]'))n.textContent=t(n.dataset.mushafLabel);
  for(const n of document.querySelectorAll('[data-mushaf-aria]'))n.setAttribute('aria-label',t(n.dataset.mushafAria));
  const foot=document.querySelector('[data-mushaf-page-number]');if(foot&&last)foot.textContent=number(last.model.number);
  const juz=document.querySelector('[data-mushaf-juz]');if(juz&&last)juz.textContent=(window.AFI18n?.translate('Juz')||'Juz')+' '+number(last.model.verses[0].juz_number);
 }
 function select(key){
  if(last)last.selected=key;
  for(const token of document.querySelectorAll('[data-mushaf-key]'))token.dataset.selected=String(token.dataset.mushafKey===key);
 }
 function token(word,verse,script,fontSpec){
  const n=el('span','mushaf-token');n.dataset.mushafKey=verse.verse_key;
  if(script==='indopak'){n.textContent=word.text_indopak_nastaleeq;n.style.fontFamily='IndoPak';}
  else if(word.char_type_name==='end'){n.textContent=word.text_qpc_hafs;n.style.fontFamily='UthmanicHafs';}
  else {const doc=new DOMParser().parseFromString(word.code_v2,'text/html');n.textContent=doc.body.textContent;n.style.fontFamily=fontSpec(word.page_number)[0];if(script==='tajweed'&&document.body.classList.contains('dark')&&!navigator.userAgent.includes('Firefox'))n.style.fontPalette='--mushaf-dark-'+word.page_number;}
  n.setAttribute('aria-hidden','true');return n;
 }
 function fit(){
  const sheet=document.querySelector('.mushaf-sheet');if(!sheet)return;
  if(sheet.dataset.flow==='true'){sheet.style.setProperty('--mushaf-font',Math.min(36,sheet.clientWidth/12)+'px');return;}
  sheet.style.setProperty('--mushaf-font','32px');let ratio=1.6;
  for(const line of sheet.querySelectorAll('.mushaf-text-line')){
   const spans=[...line.querySelectorAll('.mushaf-token')];const width=spans.reduce((sum,n)=>sum+n.getBoundingClientRect().width,0);
   const style=getComputedStyle(line),available=line.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
   if(width>0)ratio=Math.min(ratio,available/(width+Math.max(0,spans.length-1)*4));
  }
  sheet.style.setProperty('--mushaf-font',Math.max(12,Math.min(48,32*ratio*.98))+'px');
 }
 function render(options){
  closeVerse();observer?.disconnect();last=options;const {model,book,script,fontSpec,opening}=options;
  const region=document.getElementById('mushaf-pages');region.replaceChildren();
  const sheet=el('section','mushaf-sheet');sheet.dataset.page=model.number;sheet.setAttribute('aria-label',(window.AFI18n?.translate('Page')||'Page')+' '+model.number);
  if(script==='tajweed'&&document.body.classList.contains('dark')&&!navigator.userAgent.includes('Firefox')){
   const style=el('style');style.textContent=[model.number,1].map(p=>`@font-palette-values --mushaf-dark-${p}{font-family:"${fontSpec(p)[0]}";base-palette:1;}`).join('');sheet.append(style);
  }
  const head=el('div','mushaf-sheet-head'),names=el('span');names.lang='ar';names.dir='rtl';names.setAttribute('data-i18n-ignore','');
  names.textContent=[...new Set(model.verses.map(v=>Number(v.verse_key.split(':')[0])))].map(id=>book.find(c=>c.id===id).name_arabic).join(' · ');
  const juz=el('span');juz.dataset.mushafJuz='';head.append(names,juz);sheet.append(head);
  const frame=el('div','mushaf-frame'),body=el('div','mushaf-body');frame.append(body);sheet.append(frame);
  const wordIndopak=model.verses.every(v=>v.words.every(w=>typeof w.text_indopak_nastaleeq==='string'&&w.text_indopak_nastaleeq.trim()));
  const flow=model.flow||script==='indopak'&&!wordIndopak;sheet.dataset.flow=String(flow);
  function heading(chapter){const h=el('span','mushaf-surah-name',book.find(c=>c.id===chapter).name_arabic);h.lang='ar';h.dir='rtl';h.setAttribute('data-i18n-ignore','');return h;}
  function bismillah(line){
   if(!opening)throw Error('Opening source unavailable');
   line.setAttribute('aria-label',opening.text_uthmani);
   if(script==='indopak'){
    const words=opening.words.filter(w=>w.char_type_name==='word');
    if(words.every(w=>w.text_indopak_nastaleeq)){for(const w of words)line.append(token(w,opening,'indopak',fontSpec));}
    else {const b=el('span','',opening.text_uthmani);b.style.fontFamily='UthmanicHafs';line.append(b);}
   }else for(const w of opening.words.filter(w=>w.char_type_name==='word'))line.append(token(w,opening,script,fontSpec));
   for(const n of line.querySelectorAll('[data-mushaf-key]'))n.removeAttribute('data-mushaf-key');
  }
  if(flow){
   body.classList.add('mushaf-flow','arabic');body.lang='ar';body.dir='rtl';
   for(const v of model.verses){
    if(v.verse_number===1){const c=Number(v.verse_key.split(':')[0]);const h=el('div','mushaf-flow-heading');h.append(heading(c));body.append(h);if(![1,9].includes(c)){const b=el('div','mushaf-flow-bismillah');bismillah(b);body.append(b);}}
    const span=el('span','mushaf-flow-verse');span.dataset.mushafKey=v.verse_key;if(script==='indopak')span.textContent=v.text_indopak_nastaleeq;else {span.setAttribute('aria-label',v.text_uthmani);for(const w of v.words)span.append(token(w,v,script,fontSpec),document.createTextNode(' '));}body.append(span,document.createTextNode(' '));
   }
  }else for(const slot of model.slots){
   const line=el('div','mushaf-line arabic');line.lang='ar';line.dir='rtl';line.dataset.line=slot.number;
   if(slot.type==='text'){
    line.classList.add('mushaf-text-line');if(model.opening)line.classList.add('is-centered');
    line.setAttribute('aria-label',slot.words.map(({word})=>word.text_qpc_hafs).join(' '));
    for(const {word,verse}of slot.words)line.append(token(word,verse,script,fontSpec));
   }else if(slot.type==='heading'){line.classList.add('mushaf-line-heading');line.append(heading(slot.chapter));}
   else if(slot.type==='bismillah'){line.classList.add('mushaf-line-bismillah');bismillah(line);}
   body.append(line);
  }
  body.addEventListener('click',e=>{const key=e.target.closest('[data-mushaf-key]')?.dataset.mushafKey;if(key)openVerse(key);});
  const foot=el('div','mushaf-sheet-foot'),num=el('bdi');num.dataset.mushafPageNumber='';foot.append(num);sheet.append(foot);region.append(sheet);
  const note=el('p','mushaf-page-note');note.dataset.mushafLabel=flow&&script==='indopak'?'IndoPak text wraps within the same page boundaries.':'Pages follow the 604-page Madani Mushaf.';region.append(note);
  const selectEl=document.getElementById('mushaf-verse');selectEl.replaceChildren();for(const v of model.verses)selectEl.add(new Option(v.verse_key,v.verse_key));if(model.verses.some(v=>v.verse_key===options.selected))selectEl.value=options.selected;
  document.getElementById('mushaf-page-number').value=model.number;
  document.getElementById('mushaf-previous').disabled=model.number===1;document.getElementById('mushaf-next').disabled=model.number===604;
  labels();select(options.selected);fit();let width=sheet.clientWidth;
  if(window.ResizeObserver){observer=new ResizeObserver(()=>{if(Math.abs(sheet.clientWidth-width)>1){width=sheet.clientWidth;fit();}});observer.observe(sheet);}
 }
 document.addEventListener('af:languagechange',()=>{labels();fit();});
 document.addEventListener('DOMContentLoaded',()=>{
  const original=document.getElementById('translation'),picker=document.getElementById('mushaf-translation');picker.replaceChildren(...[...original.options].map(o=>o.cloneNode(true)));picker.onchange=()=>{original.value=picker.value;original.dispatchEvent(new Event('change'));};
  for(const [source,dest]of [['translation-status','mushaf-translation-status'],['reading-progress-status','mushaf-progress-status']])new MutationObserver(()=>{document.getElementById(dest).textContent=document.getElementById(source).textContent;}).observe(document.getElementById(source),{subtree:true,childList:true,characterData:true});
  document.getElementById('mushaf-dialog-close').onclick=closeVerse;
  document.getElementById('mushaf-ayah-dialog').addEventListener('close',restore);
  document.getElementById('mushaf-open-verse').onclick=()=>openVerse(document.getElementById('mushaf-verse').value);
  labels();
 });
 return {render,closeVerse,openVerse,labels,fit};
})();
