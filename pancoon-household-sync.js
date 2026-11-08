(() => {
  'use strict';
  const cfg=window.PanCoonHouseholdConfig||{};
  if(!cfg.enabled)return;
  const STATE='pantry-raccoon:v1',ZINES='pantry-raccoon:recipe-zines:v1',SETTINGS='pancoon:settings:v1';
  const CHOSEN='pancoon:household-id:v1', BASELINE='pancoon:cloud-baseline:v1:', PREFIX='pancoon-shared://',BUCKET='pancoon-household-zines';
  const COLLECTIONS=['recipes','plan','inventory','groceryReview','groceryDismissed','groceryExtras','squirrelQueue','settings','zines'];
  const tracked=new Set([STATE,ZINES,SETTINGS]);
  let client, account=null,household=null, members=[], remote=new Map(), baseline=new Map();
  let connected=false, applying=false, pushing=false, loading=false, blocked=false, channel=null, pollTimer=null, pushTimer=null, pullTimer=null, initPromise=null;
  const mediaCache=new Map(), mediaPending=new Map();
  let lastStatus='Local images sync once imported into a household.',lastStatusBad=false;

  const read=(key,def)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||def;}catch{return def;}};
  const encode=(collection,id)=>JSON.stringify([collection,id]);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const isShared=x=>String(x||'').startsWith(PREFIX);
  const checkPath=x=>{const path=String(x||'').slice(PREFIX.length);if(!/^[a-f0-9-]{36}\/[a-zA-Z0-9_/-]+\.(png|jpg|webp)$/.test(path))throw Error('Invalid cloud image reference');return path;};
  function notify(msg,bad=false){lastStatus=msg;lastStatusBad=bad;let node=document.getElementById('pancoonHouseholdStatus');if(node){node.textContent=msg;node.style.color=bad?'#a33236':'';node.setAttribute('role',bad?'alert':'status');}}
  function saveBaseline(){
    if(!connected||!household)return;
    const rows=[...baseline].map(([key,content])=>[key,content,remote.get(key)?.revision||0]);
    localStorage.setItem(BASELINE+household,JSON.stringify(rows));
  }
  function readBaseline(id){
    try{const rows=JSON.parse(localStorage.getItem(BASELINE+id)||'null');
      return Array.isArray(rows)?new Map(rows.map(([key,content,revision])=>[key,{content,revision}])):null;
    }catch(_){return null;}
  }
  async function sdk(){
    if(client)return client;
    if(initPromise)return initPromise;
    initPromise=new Promise((resolve,reject)=>{
      if(window.supabase?.createClient)return resolve(window.supabase);
      const s=document.createElement('script');s.async=true;
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0';
      s.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(Error('Could not load sign-in library'));
      s.onerror=()=>reject(Error('Sign-in library could not load. Check your internet connection.'));
      document.head.appendChild(s);
    }).then(lib=>{
      client=lib.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
      return client;
    }).catch(err=>{initPromise=null;throw err;});
    return initPromise;
  }
  function originalDataCount(){
    const s=read(STATE,{});
    return (s.recipes?.length||0)+Object.keys(s.plan||{}).length+
      Object.values(s.inventories||{}).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0)+Object.keys(read(ZINES,{})).length;
  }
  function flatLocal(){
    const result=new Map(), s=read(STATE,{});
    const add=(kind,id,val)=>{if(id!=null&&id!=='')result.set(encode(kind,String(id)),clone(val));};
    for(const r of s.recipes||[])if(r?.id)add('recipes',r.id,r);
    for(const [key,v] of Object.entries(s.plan||{}))add('plan',key,v);
    for(const [kind,arr] of Object.entries(s.inventories||{}))
      for(const item of arr||[])if(item?.id)add('inventory',kind+':'+item.id,{kind,item});
    for(const k of ['groceryReview','groceryDismissed'])
      for(const [id,val] of Object.entries(s[k]||{}))add(k,id,val);
    for(const k of ['groceryExtras','squirrelQueue'])
      for(const item of s[k]||[])if(item?.id)add(k,item.id,item);
    add('settings','main',read(SETTINGS,{}));
    for(const [id,url] of Object.entries(read(ZINES,{})))if(url)add('zines',id,url);
    return result;
  }
  function rowsToMap(rows){
    const result=new Map();
    for(const r of rows||[])result.set(encode(r.collection,r.record_id),{revision:r.revision,content:r.content});
    return result;
  }
  function mapToKitchen(values){
    const result={version:3,recipes:[],plan:{},inventories:{pantry:[],fridge:[],freezer:[]},
      groceryReview:{},groceryDismissed:{},groceryExtras:[],squirrelQueue:[]};
    let settings={};const zines={};
    for(const [key,entry] of values){
      const val=entry.content;if(val===null||val===undefined)continue;
      let [kind,id]=JSON.parse(key);
      if(kind==='recipes')result.recipes.push(val);
      else if(kind==='plan')result.plan[id]=val;
      else if(kind==='inventory'&&result.inventories[val.kind]&&val.item)result.inventories[val.kind].push(val.item);
      else if(kind==='groceryReview'||kind==='groceryDismissed')result[kind][id]=val;
      else if(kind==='groceryExtras'||kind==='squirrelQueue')result[kind].push(val);
      else if(kind==='settings')settings=val;
      else if(kind==='zines')zines[id]=val;
    }
    return {state:result,settings,zines};
  }
  function applyCloud(){
    if(!connected)return;
    applying=true;
    try{
      const value=mapToKitchen(remote);
      localStorage.setItem(STATE,JSON.stringify(value.state));
      localStorage.setItem(SETTINGS,JSON.stringify(value.settings));
      localStorage.setItem(ZINES,JSON.stringify(value.zines));
      baseline=flatLocal();
      saveBaseline();
      window.PanCoonReloadFromStorage?.();
      window.dispatchEvent(new Event('pancoon:settings-changed'));
      window.dispatchEvent(new Event('pancoon:zine-changed'));
    }finally{applying=false;}
  }
  async function fetchRemote(){
    const c=await sdk();
    const {data,error}=await c.from('pancoon_records').select('household_id,collection,record_id,content,revision').eq('household_id',household);
    if(error)throw error;
    remote=rowsToMap(data);
  }
  async function resolve(ref){
    if(!isShared(ref))return ref;
    const path=checkPath(ref);
    const active=household||localStorage.getItem(CHOSEN);
    if(!active||!path.startsWith(active+'/'))throw Error('Not a member of this image’s kitchen');
    if(mediaCache.has(path))return mediaCache.get(path);
    if(mediaPending.has(path))return mediaPending.get(path);
    const task=(async()=>{
      const {data,error}=await (await sdk()).storage.from(BUCKET).download(path);
      if(error||!data)throw Error(error?.message||'Cloud image unavailable');
      const url=URL.createObjectURL(data);
      mediaCache.set(path,url);return url;
    })();
    mediaPending.set(path,task);
    try{return await task;}finally{mediaPending.delete(path);}
  }
  function hydrate(root){
    if(root?.nodeType!==1)return;
    const imgs=root.matches?.('img')?[root]:Array.from(root.querySelectorAll?.('img')||[]);
    for(const img of imgs){
      const raw=img.getAttribute('src')||'';
      if(!isShared(raw)||img.dataset.pancoonCloudPending===raw)continue;
      img.dataset.pancoonCloudPending=raw;
      resolve(raw).then(url=>{if(img.getAttribute('src')===raw)img.src=url;}).catch(err=>{
        if(img.getAttribute('src')===raw){img.removeAttribute('src');img.alt='Cloud zine unavailable: '+err.message;}
      }).finally(()=>{delete img.dataset.pancoonCloudPending;});
    }
  }
  function stop(){
    if(channel){client?.removeChannel(channel);channel=null;}
    clearInterval(pollTimer);pollTimer=null;
    clearTimeout(pushTimer);clearTimeout(pullTimer);
    for(const url of mediaCache.values())URL.revokeObjectURL(url);
    mediaCache.clear();mediaPending.clear();
    connected=false;household=null;remote.clear();baseline.clear();blocked=false;
  }
  async function put(key,val,expected){
    const [collection,recordId]=JSON.parse(key);
    const {data,error}=await (await sdk()).rpc('pancoon_put_record',{
      p_household_id:household,p_collection:collection,p_record_id:recordId,p_content:val,p_expected_revision:expected
    });
    if(error)throw Error(error.message);
    return {revision:data.revision,content:data.content};
  }
  async function push(){
    if(!connected||pushing||applying||blocked)return;
    pushing=true;
    try{
      const local=flatLocal();
      const all=new Set([...baseline.keys(),...local.keys()]);
      const changes=[...all].filter(k=>!equal(local.get(k)??null,baseline.get(k)??null));
      if(!changes.length)return;
      notify('Syncing '+changes.length+' change(s)…');
      for(const k of changes){
        let value=local.has(k)?local.get(k):null;
        if(JSON.parse(k)[0]==='zines'&&window.PanCoonZineStore?.isLocal(value)){
          value=await transferZine(JSON.parse(k)[1],value);
          applying=true;
          try{
            const z=read(ZINES,{});z[JSON.parse(k)[1]]=value;localStorage.setItem(ZINES,JSON.stringify(z));
          }finally{applying=false;}
        }
        const row=await put(k,value,remote.get(k)?.revision||0);
        remote.set(k,row);baseline.set(k,value);
        saveBaseline();
      }
      notify('All changes saved to your household cloud.');
    }catch(error){
      blocked=true;
      notify('Sync paused: '+error.message+' Your device data has been kept. Do not clear browser data.',true);
    }finally{pushing=false;}
  }
  function queuePush(){
    if(!connected||applying||loading||blocked)return;
    clearTimeout(pushTimer);pushTimer=setTimeout(()=>push(),800);
  }
  async function pull(){
    if(!connected||loading||pushing||blocked)return;
    loading=true;
    try{
      const before=flatLocal();
      if([...new Set([...before.keys(),...baseline.keys()])].some(k=>!equal(before.get(k)??null,baseline.get(k)??null))){
        loading=false;await push();loading=true;
        if(blocked)return;
      }
      await fetchRemote();
      applyCloud();
      notify('Kitchen synced across your devices.');
    }catch(error){notify('Could not refresh kitchen: '+error.message,true);}
    finally{loading=false;}
  }
  function listen(){
    if(channel){client.removeChannel(channel);channel=null;}
    channel=client.channel('pancoon-'+household).on('postgres_changes',
      {event:'*',schema:'public',table:'pancoon_records',filter:'household_id=eq.'+household},
      ()=>{clearTimeout(pullTimer);pullTimer=setTimeout(()=>pull(),900);}).subscribe();
    clearInterval(pollTimer);
    pollTimer=setInterval(()=>{if(document.visibilityState!=='hidden')pull();},30000);
  }
  async function connect(hid,force=false,resuming=false){
    household=hid;
    await fetchRemote();
    if(originalDataCount()>0&&!force&&!localStorage.getItem(CHOSEN)){
      render();notify('This device has local recipes. Import them before switching to the household cloud.',false);
      return;
    }
    if(resuming){
      const saved=readBaseline(hid);
      if(!saved && originalDataCount()>0){
        render();notify('Paused: this device has recipes but no verified cloud baseline. Make a backup, then choose Import this device or Use household cloud.',true);
        return;
      }
      if(saved){
        const local=flatLocal(),all=new Set([...local.keys(),...saved.keys()]);
        const pending=[...all].filter(k=>!equal(local.get(k)??null,saved.get(k)?.content??null));
        const conflicts=pending.filter(k=>{
          const prior=saved.get(k);
          const cloud=remote.get(k);
          return (cloud?.revision||0)!==(prior?.revision||0);
        });
        if(conflicts.length){
          render();notify('Sync paused: '+conflicts.length+' item(s) changed on both this device and the cloud. Local data is preserved; review before replacing.',true);
          return;
        }
        baseline=new Map([...saved].map(([key,row])=>[key,row.content]));
        connected=true;
        if(pending.length){
          await push();
          if(blocked)return;
          await fetchRemote();
        }
      }
    }
    connected=true;applying=true;
    try{localStorage.setItem(CHOSEN,hid);}finally{applying=false;}
    applyCloud();listen();render();notify('Connected. Cloud kitchen is ready.');
  }
  async function transferZine(recipeId,source){
    if(isShared(source))return source;
    const store=window.PanCoonZineStore;
    let blob=null;
    if(store?.isLocal(source)){
      const data=await store.read(recipeId);blob=data?.blob;
      if(!blob)throw Error('Zine for '+recipeId+' was not found on this device');
    }else if(source){
      let url;
      try{url=new URL(source,location.origin);}catch(_){}
      if(url?.origin===location.origin&&url.pathname.startsWith('/assets/')){
        const res=await fetch(url.href);if(res.ok)blob=await res.blob();
      }
    }
    if(!blob)return source; // Existing external URLs remain linked, but are not private uploads.
    if(blob.size>15*1024*1024)throw Error('Zine exceeds 15 MB upload limit');
    const prefix=new Uint8Array(await blob.slice(0,12).arrayBuffer());
    const png=prefix.length>7&&[137,80,78,71,13,10,26,10].every((n,i)=>prefix[i]===n);
    const jpg=prefix[0]===255&&prefix[1]===216&&prefix[2]===255;
    const webp=String.fromCharCode(...prefix.slice(0,4))==='RIFF'&&String.fromCharCode(...prefix.slice(8,12))==='WEBP';
    if(!png&&!jpg&&!webp)throw Error('Only PNG, JPEG, and WebP zines are supported');
    const ext=png?'png':jpg?'jpg':'webp';
    const path=household+'/'+crypto.randomUUID()+'.'+ext;
    const {error}=await (await sdk()).storage.from(BUCKET).upload(path,blob,{contentType:png?'image/png':jpg?'image/jpeg':'image/webp',upsert:false});
    if(error)throw Error('Zine upload failed: '+error.message);
    const check=await (await sdk()).storage.from(BUCKET).download(path);
    if(check.error||check.data?.size!==blob.size)throw Error('Zine upload could not be verified');
    return PREFIX+path;
  }
  async function importLocal(){
    if(!account||!household)return;
    if(!confirm('Copy this device’s recipes, meal plan, groceries and zines into this household? Your original browser data will remain available until the cloud copy is verified.'))return;
    const local=flatLocal();
    if(!local.size)return notify('There is no local kitchen to import.');
    loading=true;render();let done=0;
    try{
      await fetchRemote();
      for(const [key,original] of local){
        if(remote.has(key)){
          if(!equal(remote.get(key).content,original))throw Error('A different cloud copy exists for '+key+'. Nothing on this device was erased.');
          continue;
        }
        let val=original;
        if(JSON.parse(key)[0]==='zines')val=await transferZine(JSON.parse(key)[1],original);
        const row=await put(key,val,0);remote.set(key,row);done++;
        notify('Importing '+done+' of '+local.size+' kitchen records…');
      }
      connected=true;applying=true;
      try{localStorage.setItem(CHOSEN,household);}finally{applying=false;}
      await fetchRemote();applyCloud();listen();render();
      notify('Verified '+remote.size+' shared records. Your kitchen is connected!');
    }catch(error){notify('Import stopped after '+done+' record(s): '+error.message+' Your original data was not deleted.',true);}
    finally{loading=false;render();}
  }
  async function listHouseholds(){
    if(!account)return;
    const {data,error}=await (await sdk()).from('pancoon_members').select('household_id,role,pancoon_households(name)').eq('user_id',account.id);
    if(error)throw error;
    members=data||[];
    const selected=localStorage.getItem(CHOSEN);
    const active=members.find(x=>x.household_id===selected);
    if(active)await connect(active.household_id,true,true);
    else{stop();render();}
  }
  async function login(email){
    const c=await sdk();
    const {error}=await c.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+'/#settings'}});
    if(error)throw error;
    notify('Check your email and open the secure sign-in link on this same device. If it opens the wrong address, check Auth → URL Configuration.');
  }
  async function createKitchen(){
    const name=String(document.querySelector('#pancoonKitchenName')?.value||'My Kitchen').trim();
    if(!name)return notify('Give your kitchen a name.',true);
    const {data,error}=await (await sdk()).from('pancoon_households').insert({name,created_by:account.id}).select('id,name').single();
    if(error)throw error;
    await listHouseholds();
    household=data.id;
    render();notify('Kitchen created. Now import the recipes from this device.');
  }
  async function join(){
    const code=String(document.querySelector('#pancoonInviteCode')?.value||'').trim();
    if(!code)return notify('Paste your kitchen invitation code.',true);
    const {data,error}=await (await sdk()).rpc('pancoon_join_household',{p_code:code});
    if(error)throw error;
    await listHouseholds();
    await connect(data,originalDataCount()===0);
    render();notify('Joined your shared kitchen!');
  }
  async function invite(){
    if(!household||!account)return;
    const raw=crypto.getRandomValues(new Uint8Array(24));
    const code=Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('');
    const hashed=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));
    const hex=Array.from(new Uint8Array(hashed),b=>b.toString(16).padStart(2,'0')).join('');
    const expires=new Date(Date.now()+7*86400000).toISOString();
    const {error}=await (await sdk()).from('pancoon_invites').insert({
      household_id:household,token_hash:hex,created_by:account.id,uses_remaining:1,expires_at:expires
    });
    if(error)throw error;
    const display=document.getElementById('pancoonInviteDisplay');
    if(display){display.value=code;display.hidden=false;display.select();}
    notify('Invitation code created. Share it privately with one family member. Expires in 7 days.');
  }
  function render(){
    const settings=document.getElementById('settingsPage');if(!settings)return;
    let card=document.getElementById('pancoonHouseholdCard');
    if(!card){card=document.createElement('article');card.id='pancoonHouseholdCard';card.className='card pancoon-settings-card';settings.prepend(card);}
    let inner='<h3>☁️ Your shared PanCoon kitchen</h3>';
    if(!account){
      inner+='<p>Sign in to connect this device to a private household kitchen. Existing local recipes will not be moved automatically.</p>'+
       '<form id="pancoonHouseholdLogin"><label>Email <input name="email" type="email" autocomplete="email" required></label>'+
       '<button class="primary" type="submit">Email me a sign-in link</button></form>'+ 
       '<p class="hint">One-time setup: authorize <strong>https://pantryraccoon.netlify.app</strong> under Supabase Authentication → URL Configuration. Open each email sign-in link on the same device where you requested it.</p>';
    }else{
      inner+='<p>Signed in as <strong>'+esc(account.email)+'</strong>.</p>';
      if(!members.length){
        inner+='<p>Create your household on the Mac that already holds your recipes, or join a kitchen by invitation.</p>'+
        '<div class="button-row"><input id="pancoonKitchenName" value="Talbot Kitchen" aria-label="Kitchen name" maxlength="80">'+
        '<button type="button" class="primary" id="pancoonCreateKitchen">Create kitchen</button></div>';
      }else{
        inner+='<label>Household <select id="pancoonHouseholdSelect">'+members.map(m=>
         '<option value="'+esc(m.household_id)+'" '+(m.household_id===household?'selected':'')+'>'+
         esc(m.pancoon_households?.name||'My kitchen')+' ('+esc(m.role)+')</option>').join('')+'</select></label>';
        inner+='<p><strong>'+ (connected?'Connected to household cloud':'Not connected on this device yet') +'</strong></p>'+
          '<div class="button-row"><button type="button" class="primary" id="pancoonImportLocal">Import this device</button>'+
          '<button type="button" class="secondary" id="pancoonConnectCloud">Use household cloud here</button>'+
          '<button type="button" class="secondary" id="pancoonSyncNow">Sync now</button></div>';
        if(members.find(m=>m.household_id===household)?.role==='owner'){
          inner+='<div style="margin-top:16px"><button type="button" class="secondary" id="pancoonMakeInvite">Invite a household member</button>'+
            '<input id="pancoonInviteDisplay" hidden readonly aria-label="Invite code" style="width:100%;margin-top:8px"></div>';
        }
      }
      inner+='<div style="margin-top:16px"><label>Join another kitchen with an invitation code<input id="pancoonInviteCode" placeholder="Paste invite code"></label>'+
        '<button type="button" class="secondary" id="pancoonJoinKitchen">Join kitchen</button></div>'+
        '<button type="button" class="secondary" id="pancoonSignOut" style="margin-top:10px">Sign out</button>';
    }
    inner+='<p id="pancoonHouseholdStatus" class="hint" role="'+(lastStatusBad?'alert':'status')+'" style="'+(lastStatusBad?'color:#a33236':'')+'">'+esc(lastStatus)+'</p>';
    card.innerHTML=inner;
  }
  async function authenticated(){
    try{
      const {data,error}=await (await sdk()).auth.getUser();
      if(error)throw error;
      if(account?.id!==data.user?.id)stop();
      account=data.user||null;
      if(account)await listHouseholds();else{members=[];stop();render();}
    }catch(error){render();notify('Cloud sign-in error: '+error.message,true);}
  }
  function start(){
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      const result=original.call(this,key,value);
      if(this===localStorage&&tracked.has(key))queuePush();
      return result;
    };
    if(document.body)new MutationObserver(records=>{
      records.forEach(r=>r.type==='attributes'?hydrate(r.target):r.addedNodes.forEach(hydrate));
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
    hydrate(document.body);
    document.addEventListener('submit',async e=>{
      if(e.target.id!=='pancoonHouseholdLogin')return;
      e.preventDefault();
      try{await login(e.target.elements.email.value.trim());}catch(error){notify(error.message,true);}
    });
    document.addEventListener('click',async e=>{
      const a=e.target.closest('button[id]');if(!a)return;
      try{
        if(a.id==='pancoonCreateKitchen')await createKitchen();
        else if(a.id==='pancoonJoinKitchen')await join();
        else if(a.id==='pancoonMakeInvite')await invite();
        else if(a.id==='pancoonImportLocal')await importLocal();
        else if(a.id==='pancoonConnectCloud'){
          const hid=document.getElementById('pancoonHouseholdSelect')?.value||household;
          if(originalDataCount()&&!connected&&!confirm('This device has local recipes or meal plans. Back them up first. Replace this device’s local kitchen with the shared cloud kitchen?'))return;
          await connect(hid,true);
        }
        else if(a.id==='pancoonSyncNow')await pull();
        else if(a.id==='pancoonSignOut'){
          await (await sdk()).auth.signOut();account=null;members=[];stop();
          localStorage.removeItem(CHOSEN);render();
          notify('Signed out. For privacy on shared devices, close this browser session.');
        }
      }catch(error){render();notify(error.message||'Cloud operation failed',true);}
    });
    document.addEventListener('change',async e=>{
      if(e.target.id!=='pancoonHouseholdSelect')return;
      try{stop();household=e.target.value;render();notify('Select “Use household cloud here” to connect this kitchen.');}
      catch(error){notify(error.message,true);}
    });
    window.addEventListener('pancoon:settings-changed',render);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pull();});
    render();
    sdk().then(c=>{
      c.auth.onAuthStateChange((_evt,session)=>{
        if(session?.user?.id!==account?.id)setTimeout(authenticated,0);
      });
      return authenticated();
    }).catch(error=>notify('Cloud setup unavailable: '+error.message,true));
  }
  window.PanCoonSharedMedia=Object.freeze({isShared,resolve});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();