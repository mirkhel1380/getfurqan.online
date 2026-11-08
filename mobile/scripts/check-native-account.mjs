import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {accountMessages} from './account-messages.mjs';
const source=fs.readFileSync(new URL('../src/app-account.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({account=false,error=null,verified=true,delay=null,throws=false}={}){
 const calls=[],navigation=[],nodes=new Map();
 function el(id){if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,value:id==='native-email'?'reader@example.invalid':id==='native-password'?'test-only-password':'Reader',textContent:'',setAttribute(k,v){this[k]=v}});return nodes.get(id)}
 const controls=['native-email','native-password','submit','native-name','save','native-signout','native-retry'].map(el);
 const AF={client:{auth:{async signInWithPassword(args){calls.push(['signin',args]);if(delay)await delay;if(throws)throw Error('Network failed');return {error}},async signOut(args){calls.push(['signout',args]);return {error}}}},async current(){calls.push(['verify']);if(error)throw error;return verified?{id:'fixture',email:'reader@example.invalid',display_name:'Reader'}:null},async rpc(name,args){calls.push([name,args]);if(error)throw error},notify:(e,s,bad=false)=>{e.textContent=s;e.error=bad},message:e=>e.message};
 vm.runInNewContext(source,{window:{},AF,AFData:{async reconnect(){calls.push(['reconnect'])}},location:{replace:url=>navigation.push(url)},document:{getElementById(id){if(id==='native-signin'&&account||id==='native-profile-form'&&!account)return null;return el(id)},querySelectorAll:()=>controls}});
 return {calls,navigation,el,controls,submit:()=>el(account?'native-profile-form':'native-signin').onsubmit({preventDefault(){}})};
}
const success=fixture();await success.submit();assert.deepEqual(success.calls.map(x=>x[0]),['signin','verify']);assert.deepEqual(success.navigation,['/account.html']);assert.equal(success.el('native-password').value,'');assert(success.controls.every(x=>!x.disabled));
for(const message of ['Invalid login credentials','Email not confirmed','Could not connect','The request took too long.']){const x=fixture({error:Error(message)});await x.submit();assert.equal(x.navigation.length,0);assert.equal(x.el('native-account-status').error,true);assert(x.controls.every(x=>!x.disabled),'Failure must unlock controls');assert.equal(x.el('native-password').value,'')}
const thrown=fixture({throws:true});await thrown.submit();assert.equal(thrown.el('native-password').value,'');assert.equal(thrown.el('native-account-status').error,true);assert(thrown.controls.every(x=>!x.disabled));
const unverified=fixture({verified:false});await unverified.submit();assert.equal(unverified.navigation.length,0,'No verified account, no navigation');
let finish;const delayed=fixture({delay:new Promise(resolve=>finish=resolve)});const first=delayed.submit();await delayed.submit();assert.equal(delayed.calls.length,1,'No duplicate submissions');assert(delayed.controls.every(x=>x.disabled));finish();await first;assert(delayed.controls.every(x=>!x.disabled));
const account=fixture({account:true});await settle();assert.equal(account.el('native-profile-email').textContent,'reader@example.invalid');assert.equal(account.el('native-profile').hidden,false);account.el('native-name').value='  Reader revised  ';await account.submit();assert.deepEqual(JSON.parse(JSON.stringify(account.calls.at(-1))),['af_update_profile',{p_name:'Reader revised'}]);await account.el('native-signout').onclick();assert.deepEqual(JSON.parse(JSON.stringify(account.calls.slice(-2))),[['signout',{scope:'local'}],['reconnect']]);assert.deepEqual(account.navigation,['/login.html']);
const blocked=fixture({account:true,error:Error('Account suspended')});await settle();assert.equal(blocked.el('native-profile').hidden,true);assert.equal(blocked.el('native-account-status').error,true);assert(blocked.controls.every(x=>!x.disabled));
for(const [lang,dict]of Object.entries(accountMessages)){assert.equal(Object.keys(dict).length,4);assert(Object.values(dict).every(Boolean),lang)}
const html=fs.readFileSync(new URL('../dist/login.html',import.meta.url),'utf8');
for(const mode of ['signup','recovery','resend'])assert(html.includes('https://getfurqan.online/login.html?mode='+mode));
assert(!/auth-callback|\/login\.js|data-mode/.test(html));
console.log('PASS: native password sign-in, verified-account gate, duplicate-submit guard, recoverable failures/timeouts, profile RPC, local logout, email-browser routes and 13-language copy.');
