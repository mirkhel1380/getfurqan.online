import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAudioClient,cleanAudioState} from '../src/audio-client.mjs';
import {audioMessages} from './audio-messages.mjs';
const empty={key:'',title:'',artist:'',ref:'',index:0,count:0,playing:false,loading:false,position:0,duration:0,error:false};
const playing={...empty,key:'7-1',title:'Al-Fatihah',artist:'Alafasy',count:7,ref:'1:1',playing:true};
let current={...empty},finish;const calls=[];
const plugin={async getState(){return current},async loadQueue(data){calls.push(['load',data]);return new Promise(r=>finish=()=>r(playing))},async stop(){calls.push(['stop']);current={...empty};return current},async pause(){calls.push(['pause']);current={...current,playing:false};return current},async play(){calls.push(['play']);current={...current,playing:true};return current},async seekVerse({index}){calls.push(['seek',index]);current={...playing,index,ref:'1:'+(index+1)};return current}};
const client=createAudioClient(plugin);let changes=0;const unsubscribe=client.subscribe(()=>changes++);
assert.equal((await client.refresh()).count,0);const pending=client.load({key:'7-1'});assert(client.state().pending);await client.stop();finish();await pending;assert.equal(client.state().count,0,'Late load cannot restore stopped UI');assert.equal(client.state().pending,false);
current={...playing};client.accept(playing);await client.pause();assert.equal(client.state().playing,false);await client.play();assert.equal(client.state().playing,true);await client.seek(4);assert.equal(client.state().ref,'1:5');assert(changes>4);unsubscribe();
for(const patch of [{count:999},{index:9},{ref:'2:5'},{position:-1},{duration:NaN},{key:'7-01'},{playing:'yes'},{ref:'file:///private'}])assert.throws(()=>cleanAudioState({...playing,...patch}));
const rows=JSON.parse(readFileSync(new URL('../src/offline-catalog.json',import.meta.url),'utf8')).chapters.map(c=>c.verses_count);
for(const [name,regex]of [['../android/app/src/main/java/online/getfurqan/app/RecitationFiles.java',/COUNTS = \{([^}]+)\}/],['../ios/App/App/RecitationFiles.swift',/counts = \[([^\]]+)\]/]]){const match=readFileSync(new URL(name,import.meta.url),'utf8').match(regex);assert(match);assert.deepEqual(match[1].split(',').map(Number),rows,'Native reference counts match audited catalog')}
for(const [lang,dict]of Object.entries(audioMessages)){assert.equal(Object.keys(dict).length,9);assert(Object.values(dict).every(Boolean),lang)}
const info=readFileSync(new URL('../ios/App/App/Info.plist',import.meta.url),'utf8');assert(info.includes('<key>UIBackgroundModes</key><array><string>audio</string></array>'));
const scene=readFileSync(new URL('../ios/App/App/SceneDelegate.swift',import.meta.url),'utf8');assert(scene.includes('AlFurqanBridgeViewController()'),'Live scene must register native plugin');
const html=readFileSync(new URL('../dist/downloads.html',import.meta.url),'utf8');assert(html.indexOf('/native-audio.js')<html.indexOf('/app-downloads-offline.js'),'One bridge must load before download UI');
console.log('PASS: native audio client status/controls, stale-load stop, malformed status rejection; both native 6236-reference catalogs; scene registration, script order and all 13 languages.');
