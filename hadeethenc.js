/* Separate publisher IDs, never joined to another collection's numbering. */
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const languages=[['en','English'],['prs','دری'],['ps','پښتو'],['fa','فارسی'],['de','Deutsch'],['nl','Nederlands'],['fr','Français'],['it','Italiano'],['ur','اردو'],['tr','Türkçe'],['es','Español'],['pt','Português'],['id','Bahasa Indonesia']];
const rtl=new Set(['prs','ps','fa','ur']),cache=new Map();let catalog,edition,id,generation=0;
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
async function json(path){const r=await fetch(path,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Source unavailable');return r.json()}
function valid(data,lang){
 const source=catalog.editions[lang];
 if(data.source?.language!==lang||data.source?.version!==source.version||data.source?.export_sha256!==source.export_sha256||!data.source.notice?.includes('('+source.version+')')||Object.keys(data.records||{}).length!==catalog.ids.length)throw Error('Mismatched edition');
 for(const key of catalog.ids){const r=data.records[key];if(String(r?.id)!==key||r.lang!==lang||!r.hadith_text_ar||!r.hadith_text||!r.explanation||r.link!=='https://hadeethenc.com/'+lang+'/browse/hadith/'+key)throw Error('Incomplete edition')}
 return data;
}
function status(text){$('selected-status').textContent=text;$('selected-status').hidden=!text}
async function load(){
 const seq=++generation;$('selected-copy').disabled=true;$('selected-content').hidden=true;$('selected-retry').hidden=true;status('Loading the published report…');
 try{
  if(!cache.has(edition))cache.set(edition,valid(await json('/content/hadeethenc/'+edition+'.json'),edition));
  if(seq!==generation)return;
  const data=cache.get(edition),r=data.records[id],index=catalog.ids.indexOf(id);
  $('selected-list').replaceChildren();
  for(const key of catalog.ids){const a=node('a',data.records[key].title);a.href='?id='+key+'&language='+edition;a.dataset.selectedId=key;a.lang=edition;a.dir=rtl.has(edition)?'rtl':'ltr';a.setAttribute('aria-current',String(key===id));a.onclick=e=>{e.preventDefault();id=key;load()};$('selected-list').append(a)}
  $('selected-title').textContent=r.title;$('selected-title').lang=edition;$('selected-title').dir=rtl.has(edition)?'rtl':'ltr';
  for(const [element,field] of [['selected-arabic-explanation','explanation_ar'],['selected-arabic-benefits','benefits_ar'],['selected-arabic','hadith_text_ar'],['selected-arabic-grade','grade_ar'],['selected-arabic-reference','takhrij_ar'],['selected-text','hadith_text'],['selected-explanation','explanation'],['selected-benefits','benefits'],['selected-grade','grade'],['selected-reference','takhrij']]){
   const el=$(element);el.textContent=r[field]||'';el.lang=element.startsWith('selected-arabic')?'ar':edition;el.dir=element.startsWith('selected-arabic')||rtl.has(edition)?'rtl':'ltr';
  }
  $('selected-benefits-block').hidden=!r.benefits;$('selected-id').textContent='HadeethEnc · '+id;$('selected-version').textContent=data.source.version;$('selected-notice').textContent=data.source.notice;
  $('selected-source-link').href=r.link;$('selected-update-link').href=data.source.updates_url;
  for(const [name,offset] of [['previous',-1],['next',1]]){const a=$('selected-'+name),key=catalog.ids[index+offset];a.hidden=!key;if(key){a.href='?id='+key+'&language='+edition;a.onclick=e=>{e.preventDefault();id=key;load()}}}
  history.replaceState(null,'','?id='+id+'&language='+edition);$('selected-content').hidden=false;$('selected-copy').disabled=false;status('');window.AFI18n?.refresh?.();
 }catch{if(seq===generation){status('This selected report could not load. Please try again.');$('selected-retry').hidden=false}}
}
$('selected-language').onchange=()=>{edition=$('selected-language').value;load()};
$('selected-copy').onclick=async()=>{$('selected-copy-status').hidden=false;try{await navigator.clipboard.writeText('HadeethEnc · '+id+'\n'+location.href);$('selected-copy-status').textContent='Reference copied.'}catch{$('selected-copy-status').textContent='Copy is unavailable in this browser. You can copy the page address instead.'}};
async function init(){try{catalog=await json('/content/hadeethenc/catalog.json');if(!Array.isArray(catalog.ids)||catalog.ids.length!==12||new Set(catalog.ids).size!==12)throw Error('Invalid catalog');edition=languages.some(([key])=>key===params.get('language'))?params.get('language'):'en';if(params.has('id')&&!catalog.ids.includes(params.get('id')))throw Error('Unknown publisher ID');id=params.get('id')||catalog.ids[0];$('selected-language').replaceChildren(...languages.filter(([key])=>catalog.editions[key]).map(([key,label])=>new Option(label,key)));$('selected-language').value=edition;$('selected-retry').onclick=load;await load()}catch{status('This selected report could not load. Please try again.');$('selected-retry').hidden=false;$('selected-retry').onclick=init}}
init();
