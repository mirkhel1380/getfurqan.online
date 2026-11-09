import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createBackupModel,MAX_BACKUP_BYTES,MAX_RECORDS} from '../src/backup-core.mjs';
import catalog from '../src/offline-catalog.json' with {type:'json'};
import {backupMessages} from './backup-messages.mjs';
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../dist/reading-core.js',import.meta.url),'utf8'),context);
const C=context.window.AFReadingCore,M=createBackupModel(C,catalog.chapters);
const copy=x=>JSON.parse(JSON.stringify(x));
const row=(kind,key,value)=>({kind,key,value});
const saved=new Map([
 [C.keys[0],{version:1,goal:7,days:{'2026-11-09':['1:1']},resume:{key:'1:2',translation:'en_sahih',updatedAt:'2026-11-09T00:00:00.000Z'}}],
 [C.keys[1],['1:1']], [C.keys[2],{'1:1':'<script>my private note</script>'}], [C.keys[3],{'1:2':'تأمل شخصی'}],
 ['sb-auth-token',{access_token:'NEVER-EXPORT'}]
]);
let phase='guest',persistent=true,writes=0,failAt=Infinity;
const data={get:(k,d)=>saved.get(k)??d,state:()=>({phase,persistent}),set(k,v){writes++;if(writes===failAt)return false;saved.set(k,copy(v));return true}};
const original=M.snapshot(data),text=M.encode(original,new Date('2026-11-09T00:00:00.000Z'));
assert(!text.includes('NEVER-EXPORT'));assert(!text.includes('access_token'));
assert.deepEqual(M.decode(text).records,copy(original));assert.equal(M.decode('\uFEFF'+text).version,1);
assert.deepEqual(M.summary(original),{bookmark:1,note:1,reflection:1,read:1,goal:1,resume:1});
for(const mutate of [
 f=>{f.version=2}, f=>{f.scope='account'}, f=>{f.session='secret'}, f=>{f.createdAt='bad'},
 f=>{f.records.push(f.records[0])}, f=>{f.records=[row('bookmark','1:8',true)]},
 f=>{f.records=[row('note','114:7','no')]}, f=>{f.records=[row('bookmark','01:1',true)]},
 f=>{f.records=[row('note','1:1','x'.repeat(5001))]}, f=>{f.records=[row('note','__proto__','no')]},
 f=>{f.records=[row('bookmark','1:1',null)]}, f=>{f.records=[row('read','2026-02-30|1:1',true)]},
 f=>{f.records=[row('resume','resume',{key:'114:7',translation:'en_sahih',updatedAt:'2026-11-09'})]},
 f=>{f.records=[{...row('bookmark','1:1',true),path:'file:///private'}]},
 f=>{f.records=[row('goal','goal',1001)]}, f=>{f.records=Array(MAX_RECORDS+1).fill(row('bookmark','1:1',true))}
]){const file=JSON.parse(text);mutate(file);assert.throws(()=>M.decode(JSON.stringify(file)))}
assert.throws(()=>M.decode('{broken'));assert.throws(()=>M.decode(' '.repeat(MAX_BACKUP_BYTES+1)));
const incoming=[row('bookmark','1:1',true),row('bookmark','1:3',true),row('note','1:1','conflict'),row('note','2:1','new'),row('goal','goal',9),row('resume','resume',{key:'2:2',translation:'en_sahih',updatedAt:'2026-11-09T00:00:00.000Z'})];
const plan=M.plan(original,incoming);assert.equal(plan.added,2);assert.equal(plan.kept,3);
// Edits made between preview and restore must survive.
saved.get(C.keys[2])['2:1']='newer local edit';
const result=M.apply(data,incoming);assert.equal(result.added,1);
assert.equal(saved.get(C.keys[2])['2:1'],'newer local edit');assert.equal(saved.get(C.keys[2])['1:1'],'<script>my private note</script>');
assert.equal(saved.get(C.keys[0]).goal,7);assert.equal(saved.get(C.keys[0]).resume.key,'1:2');assert.deepEqual(saved.get(C.keys[1]),['1:1','1:3']);
const after=copy(M.snapshot(data));assert.equal(M.apply(data,incoming).added,0);assert.deepEqual(copy(M.snapshot(data)),after);
phase='account';writes=0;assert.throws(()=>M.apply(data,incoming));assert.equal(writes,0);
phase='loading';assert.throws(()=>M.apply(data,incoming));assert.equal(writes,0);
phase='guest';failAt=2;assert.throws(()=>M.apply(data,incoming),/Could not save all/);
failAt=Infinity;persistent=false;assert.throws(()=>M.apply(data,incoming),/Could not save all/);
const empty={get:()=>null,state:()=>({phase:'guest',persistent:true}),set:(key,value)=>{assert(C.keys.includes(key));return true}};
assert.equal(M.decode(M.encode(M.snapshot(empty))).records.length,0);assert.equal(M.apply(empty,original).added,6);
for(const [lang,messages]of Object.entries(backupMessages)){assert.equal(Object.keys(messages).length,Object.keys(backupMessages.en).length,lang);for(const text of Object.values(messages))assert(typeof text==='string'&&text.length,lang)}
const page=fs.readFileSync(new URL('../dist/backup.html',import.meta.url),'utf8');assert(page.includes('/app-backup.js'));
for(const path of ['index.html','progress.html','reader.html'])assert(fs.readFileSync(new URL('../dist/'+path,import.meta.url),'utf8').includes('href="/backup.html"'),path);
const source=fs.readFileSync(new URL('../src/app-backup.js',import.meta.url),'utf8');assert(!/localStorage|innerHTML|fetch\(/.test(source));assert(source.includes('Directory.Cache'));assert(source.includes('files:[result.uri]'));
const paths=fs.readFileSync(new URL('../android/app/src/main/res/xml/file_paths.xml',import.meta.url),'utf8');assert(paths.includes('path="reading-backups/"'));assert(!paths.includes('external-path'));
console.log('PASS: reading backup round-trip, no session data, strict schema/reference/date/size limits, additive restore, newer-edit preservation, retry, account guard, quota failures and 13 UI languages.');
