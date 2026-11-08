'use strict';
(()=>{
 const form=document.getElementById('native-signin'),profileForm=document.getElementById('native-profile-form');
 const status=document.getElementById('native-account-status');if(!status)return;
 const tr=text=>window.AFI18n?.translate(text)||text;
 let busy=false;
 function lock(value){busy=value;for(const el of document.querySelectorAll('.app-account-card input,.app-account-card button'))el.disabled=value;form?.setAttribute('aria-busy',String(value));profileForm?.setAttribute('aria-busy',String(value));}
 async function run(operation){if(busy)return;lock(true);AF.notify(status,tr('Please wait…'));try{await operation()}catch(e){AF.notify(status,tr(AF.message(e)),true)}finally{lock(false)}}
 if(form)form.onsubmit=e=>{e.preventDefault();return run(async()=>{
  const email=document.getElementById('native-email').value.trim(),password=document.getElementById('native-password');
  let result;try{result=await AF.client.auth.signInWithPassword({email,password:password.value})}finally{password.value=''}if(result.error)throw result.error;
  // Provider claims and editable metadata cannot unlock profile or reading data.
  const me=await AF.current();if(!me)throw Error('Please sign in again.');location.replace('/account.html');
 })};
 if(profileForm){
  const load=()=>run(async()=>{document.getElementById('native-profile').hidden=true;const me=await AF.current();if(!me){location.replace('/login.html');return}document.getElementById('native-profile-email').textContent=me.email;document.getElementById('native-name').value=me.display_name||'';document.getElementById('native-profile').hidden=false;AF.notify(status,'')});
  document.getElementById('native-retry').onclick=load;
  document.getElementById('native-signout').onclick=()=>run(async()=>{const {error}=await AF.client.auth.signOut({scope:'local'});if(error)throw error;await AFData.reconnect();location.replace('/login.html')});
  profileForm.onsubmit=e=>{e.preventDefault();return run(async()=>{await AF.rpc('af_update_profile',{p_name:document.getElementById('native-name').value.trim()});AF.notify(status,tr('Your profile has been updated.'))})};
  load();
 }
})();
