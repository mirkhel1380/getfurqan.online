// No native file paths are exposed by the status interface.
export function cleanAudioState(value){
 if(!value||!Number.isInteger(value.count)||value.count<0||value.count>286||!Number.isInteger(value.index)||value.index<0||value.index>=Math.max(value.count,1)||!['key','title','artist','ref'].every(k=>typeof value[k]==='string'&&value[k].length<=160)||typeof value.playing!=='boolean'||typeof value.loading!=='boolean'||typeof value.error!=='boolean'||!['position','duration'].every(k=>Number.isFinite(value[k])&&value[k]>=0))throw Error('Audio player unavailable');
 if(value.count>0&&(!/^(3|6|7)-[1-9]\d{0,2}$/.test(value.key)||value.ref!==Number(value.key.split('-')[1])+':'+(value.index+1)))throw Error('Audio player unavailable');
 return {...value};
}
export function createAudioClient(plugin){
 let current={key:'',title:'',artist:'',ref:'',index:0,count:0,playing:false,loading:false,position:0,duration:0,error:false},pending=false,revision=0;
 const listeners=new Set();const state=()=>({...current,pending});const publish=()=>{for(const fn of listeners)fn(state())};
 const accept=value=>{current=cleanAudioState(value);publish();return state()};
 async function refresh(){return accept(await plugin.getState())}
 async function load(data){const id=++revision;pending=true;publish();try{const next=await plugin.loadQueue(data);if(id===revision)return accept(next)}finally{if(id===revision){pending=false;publish()}}}
 async function command(name,args){if(name==='stop'||name==='pause'){revision++;pending=false}const value=await plugin[name](args||{});return accept(value)}
 return {state,refresh,accept,load,play:()=>command('play'),pause:()=>command('pause'),stop:()=>command('stop'),seek:index=>command('seekVerse',{index}),subscribe(fn){listeners.add(fn);fn(state());return()=>listeners.delete(fn)}};
}
