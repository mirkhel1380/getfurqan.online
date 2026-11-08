import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(mobile,'dist');
const config=JSON.parse(await fs.readFile(path.join(mobile,'capacitor.config.json'),'utf8'));
assert.equal(config.appId,'online.getfurqan.app');
assert.equal(config.appName,'Al Furqan');
assert.equal(config.webDir,'dist');
assert(!config.server?.url&&!config.server?.cleartext&&!config.server?.allowNavigation,'No dev origin or navigation allowlist may ship');
const manifest=JSON.parse(await fs.readFile(path.join(out,'app-source-manifest.json'),'utf8'));
for(const [name,hash]of Object.entries(manifest.preserved))assert.equal(createHash('sha256').update(await fs.readFile(path.join(out,name))).digest('hex'),hash,name);
assert.equal(manifest.guestOnly,false);assert.equal(manifest.optionalAccount,true);assert.equal(manifest.emailFlows,'system-browser');
assert((await fs.readFile(path.join(out,'auth-client.js'),'utf8')).includes('detectSessionInUrl:false'));
assert(!(await fs.readFile(path.join(out,'login.html'),'utf8')).includes('/login.js'));
let pages=0,links=0;
async function scan(dir){
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){await scan(file);continue;}
  if(!entry.name.endsWith('.html'))continue;
  const html=await fs.readFile(file,'utf8');pages++;
  assert(html.includes('/app-native.js')&&html.includes('viewport-fit=cover'),file);
  assert(html.indexOf('/auth-client.js')<html.indexOf('/reading-data.js')||!html.includes('/reading-data.js'),'Auth must precede the reading adapter');
  assert.equal((html.match(/src="\/auth-client.js/g)||[]).length,1,'One shared auth client');
  assert(!/href="\/(?:admin|register|reset-password|forgot-password|auth-callback|contact)\.html/.test(html),'Unavailable native route: '+file);

  for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
   const value=match[1];if(/^(?:https?:|mailto:|data:|tel:)/.test(value))continue;
   const url=new URL(value,'https://local.app/'+path.relative(out,file));
   let target=path.join(out,decodeURIComponent(url.pathname));
   if(url.pathname.endsWith('/'))target=path.join(target,'index.html');
   assert(await fs.access(target).then(()=>true).catch(()=>false),'Missing local asset '+url.pathname+' in '+path.relative(out,file));links++;
  }
 }
}
await scan(out);
for(const lang of ['en','prs','ps','fa','de','nl','fr','it','ur','tr','es','pt','id']){
 const dict=JSON.parse(await fs.readFile(path.join(out,'locales',lang+'.json'),'utf8'));
 assert(dict['Read Quran']&&dict['Preferences']&&dict['Your saved verses and reading place stay on this device. Quran text, fonts, translations and recitation need an internet connection.'],lang);
}
console.log(`Mobile checks passed: ${pages} pages, ${links} local routes/assets, ${Object.keys(manifest.preserved).length} unchanged reading files, 13 languages.`);
