import {jobToken} from './offline-core.mjs';
const leaseError=()=>Error('Another download is already running.');
export function openMetadata(indexedDB=globalThis.indexedDB){return new Promise((resolve,reject)=>{
 const r=indexedDB.open('al-furqan-offline-audio-v1',2);
 r.onupgradeneeded=()=>{for(const name of ['packs','leases'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,name==='packs'?{keyPath:'key'}:undefined)};
 r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Offline downloads could not be opened. Free device storage and retry.'));
 r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result)};
})}
export function metadataStore(db,now=()=>Date.now()){
 let owner=null;
 function transaction(mode,operation){return new Promise((resolve,reject)=>{const tx=db.transaction('packs',mode),r=operation(tx.objectStore('packs'));let value;r.onsuccess=()=>value=r.result;tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Storage unavailable'))})}
 function leasedWrite(operation){return new Promise((resolve,reject)=>{
  const tx=db.transaction(['packs','leases'],'readwrite'),r=tx.objectStore('leases').get('writer');let failed=false;
  r.onsuccess=()=>{const lease=r.result;if(!owner||lease?.owner!==owner||lease.until<=now()){failed=true;tx.abort();return}operation(tx.objectStore('packs'))};
  tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(failed?leaseError():tx.error||Error('Storage unavailable'));
 })}
 async function exclusive(fn){
  const token=jobToken();
  async function claim(renew=false){return new Promise((resolve,reject)=>{const tx=db.transaction('leases','readwrite'),s=tx.objectStore('leases'),r=s.get('writer');let conflict=false;
   r.onsuccess=()=>{const current=r.result;if(renew?current?.owner!==token:current?.until>now()){conflict=true;tx.abort();return}s.put({owner:token,until:now()+45000},'writer')};
   tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(conflict?leaseError():tx.error||Error('Storage unavailable'));
  })}
  await claim();owner=token;const timer=setInterval(()=>claim(true).catch(()=>{}),5000);
  try{return await fn()}finally{clearInterval(timer);owner=null;await new Promise(resolve=>{const tx=db.transaction('leases','readwrite'),s=tx.objectStore('leases'),r=s.get('writer');r.onsuccess=()=>{if(r.result?.owner===token)s.delete('writer')};tx.oncomplete=tx.onerror=tx.onabort=resolve})}
 }
 return {list:()=>transaction('readonly',s=>s.getAll()),get:key=>transaction('readonly',s=>s.get(key)),save:pack=>leasedWrite(s=>s.put(pack)),delete:key=>leasedWrite(s=>s.delete(key)),assertLease:()=>leasedWrite(()=>{}),exclusive};
}
