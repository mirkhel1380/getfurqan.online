'use strict';
(()=>{
 const cards=[...document.querySelectorAll('[data-topic-card]')],input=document.getElementById('topic-query'),buttons=[...document.querySelectorAll('[data-topic-filter]')];
 if(!input)return;
 let category='All topics',index=new Map();
 const normal=s=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').replace(/\u0640/g,'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').toLocaleLowerCase();
 const translate=s=>window.AFI18n?.translate(s)||s;
 function filter(){
  const terms=normal(input.value.trim()).split(/\s+/).filter(Boolean);let count=0;
  for(const card of cards){
   const source=index.get(card.dataset.topicSlug)||[];
   const text=normal(card.textContent+' '+source.map(translate).join(' '));
   const match=(category==='All topics'||card.dataset.category===category)&&terms.every(term=>text.includes(term));
   card.hidden=!match;if(match)count++;
  }
  document.getElementById('topic-count').textContent=translate(count+' '+(count===1?'topic':'topics')+' to explore');
  document.getElementById('topic-empty').hidden=count!==0;
 }
 input.oninput=filter;document.addEventListener('af:languagechange',filter);
 buttons.forEach(button=>button.onclick=()=>{category=button.dataset.topicFilter;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filter()});
 filter();
 fetch('/content/topics-index.json?v=20261107-topics2',{signal:AbortSignal.timeout(15000)})
 .then(r=>{if(!r.ok)throw Error('Topic index unavailable');return r.json()})
 .then(rows=>{
  if(!Array.isArray(rows)||rows.length!==cards.length||new Set(rows.map(r=>r.slug)).size!==cards.length||rows.some(r=>!cards.some(c=>c.dataset.topicSlug===r.slug)||!Array.isArray(r.texts)||r.texts.some(s=>typeof s!=='string')))throw Error('Invalid topic index');
  index=new Map(rows.map(r=>[r.slug,r.texts]));filter();
 }).catch(()=>{/* Card titles and introductions remain searchable offline. */});
})();
