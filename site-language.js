'use strict';
// Interface and owned editorial content localization. Published scripture, translations and tafsir are never rewritten.
window.AFI18n=(()=>{
 const languages=[['en','English','ltr'],['prs','دری','rtl'],['ps','پښتو','rtl'],['fa','فارسی','rtl'],['de','Deutsch','ltr'],['nl','Nederlands','ltr'],['fr','Français','ltr'],['it','Italiano','ltr'],['ur','اردو','rtl'],['tr','Türkçe','ltr'],['es','Español','ltr'],['pt','Português','ltr'],['id','Bahasa Indonesia','ltr']];
 const storageKey='af-site-language',version='20261107-downloads1',cache=new Map(),originals=new WeakMap(),attributes=new WeakMap();
 const protectedSelector='script,style,svg,textarea,input,option,optgroup,[data-i18n-ignore],.arabic,.translation,.translation-note,.quran-meaning,.word-arabic,.word-meaning,.block-text,.dhikr-arabic,.hadith-entry-excerpt,#weekly-arabic,#weekly-translation,#weekly-notes-text,#reader-arabic,#reader-translation,#reader-grades,#reader-book-name,#book-page-title,#weekly-credit,#weekly-source-info,#translation-source,[data-book-row] strong,[data-book-row] .hadith-book-name,.book-row,#users-body strong,#audit-list,.contact-user-content,#meaning,#profile-email,#status-target';
 const sourceSelects='#translation,#tafsir-language,#word-language,#dua-translation,#reader-language,#book-language,#chapter,#surah,#reciter,#search-language';
 const aliases={'About Al Furqan · Read, understand, reflect':'About Al Furqan','About your data':'Privacy & your data','Learn about your data':'Privacy & your data','Tafsir & word meanings':'Tafsir & words','Tafsir and word meanings':'Tafsir & words','Listen and recite':'Listen & recite','Adhkar and duas':'Adhkar & duas','Explore adhkar & duas':'Adhkar & duas','Search and study':'Search & study','THE HADITH LIBRARY':'Hadith library','Translator’s notes':'Translator notes','Your reading today':'Verses today','Your Al Furqan':'Your Al Furqan account','Your Al Furqan account':'Your Al Furqan account','Tafsir & word meanings · Al Furqan':'Tafsir & words · Al Furqan'};
 let current='en',dictionary={},lookup=new Map(),templates=[],sequence=0,observer,applying=false;
 const normalize=s=>s.replace(/\s+/g,' ').trim();
 function eligible(node,attribute=false){const p=node.nodeType===1?node:node.parentElement;if(!p)return false;
  // Only explicitly marked interface controls may be localized inside source text.
  if(p.hasAttribute?.('data-af-interface'))return true;
  // Translate field labels and placeholders, never entered values or personal notes.
  if(attribute&&p.matches?.('input,textarea'))return !p.closest('[data-i18n-ignore],[translate="no"]');
  if(p.closest(protectedSelector))return false;const blocked=p.closest('[translate="no"]');if(blocked&&!(blocked.id==='verses'&&p.closest('.verse-tools')))return false;const lang=p.closest('[lang]');return !lang||lang===document.documentElement;}
 function messageTemplates(){return Object.keys(dictionary).filter(k=>/\{\w+\}/.test(k)).sort((a,b)=>b.length-a.length).map(key=>{const names=[];let source='',last=0;const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');for(const m of normalize(key).matchAll(/\{(\w+)\}/g)){source+=escaped(normalize(key).slice(last,m.index))+'(.+?)';names.push(m[1]);last=m.index+m[0].length;}source+=escaped(normalize(key).slice(last));return {key,names,pattern:new RegExp('^'+source+'$','i')};});}
 function translate(text){
  if(current==='en'||!text)return text;
  const value=normalize(text);let mapped=lookup.get(value.toLowerCase())||lookup.get((aliases[value]||'').toLowerCase());if(mapped)return text.match(/^\s*/)[0]+mapped+text.match(/\s*$/)[0];
  for(const template of templates){const match=value.match(template.pattern);if(!match)continue;const values=Object.fromEntries(template.names.map((name,i)=>[name,['place','language'].includes(name)?translate(match[i+1]):match[i+1]]));return dictionary[template.key].replace(/\{(\w+)\}/g,(_,name)=>values[name]);}
  const pendingEdition=value.match(/^(Deutsch|Nederlands) — not yet available$/);if(pendingEdition)return pendingEdition[1]+' — '+translate('Not yet');
  const quranReference=value.match(/^Quran (\d{1,3}:\d{1,3})$/);if(quranReference)return translate('Quran')+' '+quranReference[1];
  // Keep arrows, numbered section prefixes and counters outside the translated message.
  const symbol=value.match(/^([←→↗↑▶■★☆✓ⓘ]\s*)?(.*?)(\s*[←→↗↑+])?$/u);
  if(symbol&&(symbol[1]||symbol[3])){const middle=translate(symbol[2]);if(middle!==symbol[2])return (symbol[1]||'')+middle+(symbol[3]||'');}
  if(/[.!:]$/.test(value)){const bare=value.slice(0,-1);const mapped=lookup.get(bare.toLowerCase());if(mapped)return mapped+value.slice(-1);}
  const brand=value.match(/^(Al Furqan\s*[—·]\s*)(.+)$/);if(brand){const tail=translate(brand[2]);if(tail!==brand[2])return brand[1]+tail;}
  const prefix=value.match(/^(\d{2}\s*\/\s*)(.+)$/);if(prefix){const tail=translate(prefix[2]);if(tail!==prefix[2])return prefix[1]+tail;}
  const title=value.match(/^(.+?)(\s*[·—]\s*Al Furqan)$/);if(title){const head=translate(title[1]);if(head!==title[1])return head+title[2];}
  for(const [pattern,key] of [[/^Resend in (\d+)s$/,'Resend in {n}s'],[/^(\d+) times$/,'{n} times'],[/^(\d+) topics? to explore$/,'{n} topics to explore'],[/^([\d,]+) entries with text$/,'{n} entries with text'],[/^([\d,]+) books & source groups$/,'{n} books & source groups'],[/^(Hadith|Book|Surah|Juz|Page) (\d[\d.]*)$/,'reference']]){
   const m=value.match(pattern);if(m){if(key==='reference')return translate(m[1])+' '+m[2];const format=dictionary[key];if(format)return format.replace('{n}',m[1]);}
  }
  if(value.includes(' · ')){const parts=value.split(' · '),next=parts.map(part=>translate(part));if(next.some((part,i)=>part!==parts[i]))return next.join(' · ');}
  return text;
 }
 function textNode(node){if(!eligible(node))return;const live=node.nodeValue;let old=originals.get(node);if(!old||live!==old.rendered){old={source:live,rendered:live};originals.set(node,old)}const next=translate(old.source);if(live!==next)node.nodeValue=next;old.rendered=next;}
 function element(node){if(!eligible(node,true))return;for(const name of ['aria-label','title','placeholder','label']){if(!node.hasAttribute(name))continue;let values=attributes.get(node);if(!values){values={};attributes.set(node,values)}const live=node.getAttribute(name);let old=values[name];if(!old||live!==old.rendered)old=values[name]={source:live,rendered:live};const next=translate(old.source);if(next!==live)node.setAttribute(name,next);old.rendered=next;}}
 function scan(root){if(root.nodeType===3){textNode(root);return}if(root.nodeType!==1&&root.nodeType!==9)return;if(root.nodeType===1)element(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))node.nodeType===3?textNode(node):element(node);}
 function observe(){observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder','label']});}
 function paint(){if(applying)return;applying=true;observer?.disconnect();try{scan(document.documentElement);document.documentElement.lang=current;document.documentElement.dir=languages.find(x=>x[0]===current)[2];document.querySelectorAll('[data-site-language]').forEach(b=>{const active=b.dataset.siteLanguage===current;b.setAttribute('aria-pressed',String(active));b.classList.toggle('is-selected',active)});}finally{applying=false;if(observer)observe();}}
 async function select(code,{persist=true}={}){
  if(!languages.some(x=>x[0]===code))return false;const id=++sequence;
  try{let next={};if(code!=='en'){if(!cache.has(code)){const response=await fetch('/locales/'+code+'.json?v='+version,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Language unavailable');const data=await response.json();if(!data||typeof data!=='object'||!data['Read Quran']||!data['Save verse {ref}']||Object.entries(data).some(([key,value])=>typeof value!=='string'||!value||JSON.stringify([...key.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort())!==JSON.stringify([...value.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort())))throw Error('Invalid language pack');cache.set(code,data);}next=cache.get(code);}if(id!==sequence)return false;
   current=code;dictionary=next;lookup=new Map(Object.entries(dictionary).map(([k,v])=>[k.toLowerCase(),v]));templates=messageTemplates();for(const [a,b] of Object.entries(aliases)){if(dictionary[b])lookup.set(a.toLowerCase(),dictionary[b]);}paint();if(persist)try{localStorage.setItem(storageKey,current)}catch{}document.dispatchEvent(new CustomEvent('af:languagechange',{detail:{language:current}}));return true;
  }catch{if(id===sequence){const status=document.getElementById('af-language-status');if(status){status.textContent=translate('This language could not load. Please try again.');status.hidden=false;}}return false;}
 }
 function protectSources(){document.querySelectorAll(sourceSelects).forEach(s=>s.setAttribute('data-i18n-ignore',''));document.querySelectorAll('[data-site-language],.af-language-name').forEach(n=>n.setAttribute('translate','no'));}
 function wire(){
  protectSources();document.querySelectorAll('[data-site-language]').forEach(b=>b.addEventListener('click',async()=>{const status=document.getElementById('af-language-status');if(status)status.hidden=true;b.setAttribute('aria-busy','true');await select(b.dataset.siteLanguage);b.removeAttribute('aria-busy');}));
  document.querySelectorAll('[data-more-languages]').forEach(b=>b.addEventListener('click',()=>{const more=document.getElementById('af-other-languages');if(!more)return;more.hidden=!more.hidden;b.setAttribute('aria-expanded',String(!more.hidden));}));
  observer=new MutationObserver(records=>{observer.disconnect();try{for(const r of records){if(r.type==='characterData')textNode(r.target);else if(r.type==='attributes')element(r.target);else for(const n of r.addedNodes){if(n.nodeType===1){if(n.matches(sourceSelects))n.setAttribute('data-i18n-ignore','');n.querySelectorAll?.(sourceSelects).forEach(s=>s.setAttribute('data-i18n-ignore',''));}scan(n);}}}finally{observe();}});observe();
  let saved='en';try{saved=localStorage.getItem(storageKey)||'en'}catch{}select(saved,{persist:false});
  window.addEventListener('storage',e=>{if(e.key===storageKey)select(e.newValue||'en',{persist:false});});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
 return {select,translate,refresh:paint,get language(){return current},languages:languages.map(([code,name,dir])=>({code,name,dir}))};
})();
