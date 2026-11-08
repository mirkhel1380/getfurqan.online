import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileTransfer } from '@capacitor/file-transfer';
import { FILE_LIMIT,sourceURL } from './offline-core.mjs';
import {openMetadata,metadataStore} from './offline-metadata.mjs';
const directory=Directory.LibraryNoCloud,ROOT='recitations-v1';
export async function nativeStore(){
 const metadata=metadataStore(await openMetadata());
 const ensure=async path=>{try{const s=await Filesystem.stat({path,directory});if(s.type==='directory')return}catch{}await Filesystem.mkdir({path,directory,recursive:true})};
 await ensure(ROOT);
 const size=async path=>(await Filesystem.stat({path,directory})).size;
 const read=async path=>{const sizeNow=await size(path);if(sizeNow>FILE_LIMIT||sizeNow<100)throw Error('Invalid audio');const {data}=await Filesystem.readFile({path,directory});if(data instanceof Blob)return new Uint8Array(await data.arrayBuffer());const text=atob(data);return Uint8Array.from(text,c=>c.charCodeAt(0))};
 return {
  ...metadata,size,read,
  async usedBytes(){let total=0;const roots=await Filesystem.readdir({path:ROOT,directory});for(const folder of roots.files){if(folder.type!=='directory'||!/^\d{1,2}-\d{1,3}$/.test(folder.name))continue;for(const file of (await Filesystem.readdir({path:ROOT+'/'+folder.name,directory})).files)if(file.type==='file')total+=file.size}return total},
  async download(url,path){
   await metadata.assertLease();sourceURL(url);await ensure(path.slice(0,path.lastIndexOf('/')));
   if(Capacitor.isNativePlatform()){
    const {uri}=await Filesystem.getUri({path,directory});
    await FileTransfer.downloadFile({url,path:uri,progress:false,connectTimeout:20000,readTimeout:30000,disableRedirects:true});
   }else{
    // Real browser preview/PWA adapter. Fetch is bounded and never accepts opaque responses.
    const response=await fetch(url,{signal:AbortSignal.timeout(30000),redirect:'error',credentials:'omit'});
    if(!response.ok||Number(response.headers.get('content-length'))>FILE_LIMIT)throw Error('Audio download failed');
    const reader=response.body.getReader(),chunks=[];let length=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>FILE_LIMIT)throw Error('Audio is too large');chunks.push(value)}}catch(e){await reader.cancel();throw e}
    const blob=new Blob(chunks,{type:'audio/mpeg'});await Filesystem.writeFile({path,directory,data:blob});
   }
  },
  removeFile:path=>Filesystem.deleteFile({path,directory}),
  async removePack(key){await metadata.assertLease();if(!/^\d{1,2}-\d{1,3}$/.test(key))throw Error('Invalid download');await Filesystem.rmdir({path:ROOT+'/'+key,directory,recursive:true}).catch(async error=>{const root=await Filesystem.readdir({path:ROOT,directory});if(root.files.some(f=>f.name===key))throw error})},
  async playable(path,bytes){if(Capacitor.isNativePlatform()){const {uri}=await Filesystem.getUri({path,directory});return {src:Capacitor.convertFileSrc(uri),release(){}}}const src=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));return {src,release:()=>URL.revokeObjectURL(src)}}
 };
}
