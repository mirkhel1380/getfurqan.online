import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const script=fs.readFileSync('dist/topics.js','utf8');
function setup(invalid=false){
 let language='en',finish;const events={};
 const cards=[{dataset:{topicSlug:'a',category:'Worship'},textContent:'Preparation for prayer',hidden:false},{dataset:{topicSlug:'b',category:'Family & community'},textContent:'Family and kindness',hidden:false}];
 const input={value:''},count={},empty={},buttons=['All topics','Worship','Family & community'].map(name=>({dataset:{topicFilter:name},setAttribute(k,v){this[k]=v}}));
 const document={querySelectorAll:s=>s==='[data-topic-card]'?cards:buttons,getElementById:id=>({'topic-query':input,'topic-count':count,'topic-empty':empty}[id]),addEventListener:(n,f)=>events[n]=f};
 const translate=s=>language==='prs'?({'Clean water and care':'آب پاک و مراقبت','A promise kept':'وفا به وعده'}[s]||s):s;
 const request=new Promise(resolve=>finish=resolve);
 vm.runInNewContext(script,{document,window:{AFI18n:{translate}},fetch:()=>request,AbortSignal});
 return {cards,input,count,empty,buttons,events,async load(){finish({ok:true,json:async()=>invalid?[{slug:'a',texts:[42]}]:[{slug:'a',texts:['Clean water and care']},{slug:'b',texts:['A promise kept']}]});await new Promise(resolve=>setImmediate(resolve))},lang(code){language=code;events['af:languagechange']()}};
}
const s=setup();assert.equal(s.count.textContent,'2 topics to explore');s.input.value='prayer';s.input.oninput();assert.equal(s.cards[0].hidden,false);assert.equal(s.cards[1].hidden,true,'Card fallback works before index');await s.load();
s.input.value='water';s.input.oninput();assert.equal(s.cards[0].hidden,false,'Search article text beyond card');s.buttons[2].onclick();assert(s.empty.hidden===false,'Category and query combine');s.input.value='';s.input.oninput();assert(s.cards[0].hidden&& !s.cards[1].hidden);assert.equal(s.count.textContent,'1 topic to explore');
s.buttons[0].onclick();s.lang('prs');s.input.value='آب پاک';s.input.oninput();assert.equal(s.cards[0].hidden,false);assert.equal(s.cards[1].hidden,true);s.input.value='ابقاکنا';s.input.oninput();assert.equal(s.empty.hidden,false);s.input.value='وفا به وعده';s.input.oninput();assert.equal(s.cards[1].hidden,false);s.lang('en');assert.equal(s.empty.hidden,false,'Language switch refreshes article search');s.input.value='';s.input.oninput();assert(s.cards.every(c=>!c.hidden));
const bad=setup(true);await bad.load();bad.input.value='family';bad.input.oninput();assert.equal(bad.cards[1].hidden,false,'Invalid index preserves basic card search');
console.log('PASS: full article search, title fallback before/without index, combined categories, empty state, counters and locale changes without rewriting source data.');
