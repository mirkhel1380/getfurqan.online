import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {openMetadata,metadataStore} from '../src/offline-metadata.mjs';
const indexedDB=new IDBFactory();let clock=100000;
const db1=await openMetadata(indexedDB),db2=await openMetadata(indexedDB),a=metadataStore(db1,()=>clock),b=metadataStore(db2,()=>clock);
await assert.rejects(a.save({key:'7-1'}),/already running/,'No metadata write without the lease');
await a.exclusive(async()=>{await a.save({key:'7-1',files:['one']});await assert.rejects(b.exclusive(()=>b.save({key:'3-1'})),/already running/);assert.deepEqual(await b.get('7-1'),{key:'7-1',files:['one']})});
await b.exclusive(()=>b.save({key:'3-1',files:[]}));
assert.equal((await a.list()).length,2);
// A suspended page cannot overwrite a new lease holder after its lease expires.
await a.exclusive(async()=>{clock+=45001;await b.exclusive(async()=>{await b.save({key:'7-1',files:['new owner']});await assert.rejects(a.save({key:'7-1',files:['stale']}),/already running/);await assert.rejects(a.delete('3-1'),/already running/);await assert.rejects(a.assertLease(),/already running/)});await assert.rejects(a.save({key:'7-1',files:['stale after release']}),/already running/)});
assert.deepEqual(await a.get('7-1'),{key:'7-1',files:['new owner']});
await assert.rejects(a.exclusive(()=>{throw Error('Interrupted download')}),/Interrupted/);
await b.exclusive(()=>b.delete('7-1'));assert.equal(await a.get('7-1'),undefined);assert(await a.get('3-1'),'Delete retains other pack');
// A crashed owner leaves a bounded lease; a new page can continue after expiry.
await new Promise((resolve,reject)=>{const tx=db1.transaction('leases','readwrite');tx.objectStore('leases').put({owner:'closed-page',until:clock+100},'writer');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
await assert.rejects(a.exclusive(()=>{}),/already running/);clock+=101;await a.exclusive(()=>a.save({key:'7-1',files:['resumed']}));assert.deepEqual((await b.get('7-1')).files,['resumed']);
db1.close();db2.close();console.log('PASS: real IndexedDB transactions in isolation; cross-page writer exclusion; stale-owner fencing; lease expiry/recovery; failure releases; scoped metadata deletion.');
