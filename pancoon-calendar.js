(() => {
  'use strict';
  // Browser-only OAuth: Google access tokens are NEVER written to localStorage.
  const KEY='pancoon:calendar-settings:v1';
  const DEFAULTS={clientId:'',calendarId:'',dinnerHour:17,lunchHour:11,timeZone:'America/Chicago'};
  const SCOPES='https://www.googleapis.com/auth/calendar.events';
  const apiBase='https://www.googleapis.com/calendar/v3/calendars/';
  const specials={'special:out':'Go out to Eat','special:leftovers':'Leftovers',
    'special:freezer':'Freezer / Heat & Eat'};
  const ui=id=>document.getElementById(id);
  const isOwner=()=>Boolean(window.PanCoonAccess?.status?.().isOwner);
  let accessToken='',expiresAt=0,tokenClient=null,tokenClientId='',gisPromise=null,
      busy=false,auto=false,autoTimer=null;
  const config=()=>{
    try{return {...DEFAULTS,...JSON.parse(localStorage.getItem(KEY)||'{}')};}
    catch(_){return {...DEFAULTS};}
  };
  const authorized=()=>Boolean(accessToken && Date.now() < expiresAt-60000);
  const recipeLink=(id,zine=false)=>{
    const link=new URL(location.origin+location.pathname);
    link.searchParams.set(zine?'zine':'recipe',id);
    link.hash='recipes';
    return link.toString();
  };
  const planLink=()=>location.origin+location.pathname+'#plan';
  function tell(message,isError=false){
    const el=ui('pancoonCalendarStatus');
    if(el){el.textContent=message;el.style.color=isError?'#a33236':'';}
    refresh();
  }
  function refresh(){
    const cfg=config(),ready=Boolean(cfg.clientId && cfg.calendarId);
    const connect=ui('pancoonCalendarConnect');
    if(connect){connect.disabled=!ready||busy;connect.textContent=authorized()?'Reconnect Google':'Connect Google';}
    const publish=ui('pancoonCalendarPublish');
    if(publish)publish.disabled=!ready||busy||!authorized();
    const autoCheck=ui('pancoonCalendarAuto');
    if(autoCheck)autoCheck.disabled=!authorized()||busy;
    const connected=ui('pancoonCalendarConnection');
    if(connected)connected.textContent=authorized()
      ?'Connected to Google for this browser session.'
      :'Not connected to Google. Connect before publishing.';
  }
  function snapshot(){
    if(typeof window.PanCoonMealCalendar?.snapshot!=='function')
      throw Error('PanCoon meal planner is not ready.');
    return window.PanCoonMealCalendar.snapshot();
  }
  function preview(){
    const node=ui('pancoonCalendarPreview');if(!node)return;
    try{
      const week=snapshot();
      const planned=week.rows.filter(x=>x.choice&&x.choice!=='special:undecided');
      const dinners=planned.filter(x=>x.kind==='dinner').length;
      const lunches=planned.filter(x=>x.kind==='lunch').length;
      node.textContent=week.startDate+' through '+week.endDate+': '+dinners+' dinner(s), '+lunches+' lunch(es) planned.';
    }catch(e){node.textContent='Waiting for meal planner…';}
  }
  function loadGis(){
    if(window.google?.accounts?.oauth2)return Promise.resolve();
    if(gisPromise)return gisPromise;
    gisPromise=new Promise((resolve,reject)=>{
      const tag=document.createElement('script');
      tag.src='https://accounts.google.com/gsi/client';tag.async=true;
      tag.onload=()=>window.google?.accounts?.oauth2?resolve():reject(Error('Google authorization failed to initialize.'));
      tag.onerror=()=>reject(Error('Cannot load Google sign-in. Check your connection or content blocker.'));
      document.head.appendChild(tag);
    }).catch(error=>{gisPromise=null;throw error;});
    return gisPromise;
  }
  function connect(){
    if(!isOwner())return;
    const cfg=config();
    if(!cfg.clientId||!cfg.calendarId){
      tell('Save both Google setup fields first.',true);
      ui('pancoonCalendarSetup')?.setAttribute('open','');return;
    }
    if(!window.google?.accounts?.oauth2){
      tell('Google sign-in is still loading. Please click Connect Google again.',true);
      loadGis().catch(error=>tell(error.message,true));return;
    }
    try{
      if(!tokenClient||tokenClientId!==cfg.clientId){
        tokenClient=window.google.accounts.oauth2.initTokenClient({
          client_id:cfg.clientId,scope:SCOPES,
          callback:response=>{
            if(!response?.access_token){
              tell('Google authorization failed: '+(response?.error||'no token received'),true);return;
            }
            accessToken=response.access_token;
            expiresAt=Date.now()+Number(response.expires_in||3300)*1000;
            tell('Google connected! Choose Publish this week.');
          },
          error_callback:()=>tell('Google sign-in was cancelled or blocked. Try connecting again.',true)
        });
        tokenClientId=cfg.clientId;
      }
      tokenClient.requestAccessToken({prompt:'select_account'});
    }catch(error){tell('Google sign-in error: '+error.message,true);}
  }
  async function request(calendarId,path,method='GET',body){
    if(!authorized())throw Error('Google authorization expired. Reconnect and publish again.');
    const options={method,headers:{Authorization:'Bearer '+accessToken},cache:'no-store'};
    if(body){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
    const response=await fetch(apiBase+encodeURIComponent(calendarId)+'/events'+path,options);
    if(response.status===404||response.status===410)return {missing:true};
    if(response.status===204)return {};
    const text=await response.text();let parsed={};
    try{parsed=JSON.parse(text);}catch(_){}
    if(!response.ok)throw Error('Google Calendar '+response.status+': '+(parsed.error?.message||text.slice(0,150)));
    return parsed;
  }
  async function idFor(calendarId,row){
    const household=localStorage.getItem('pancoon:household-id:v1')||'local';
    const source=[calendarId,household,row.date,row.kind].join('|');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
    return 'pancoon'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  }
  function buildEvent(row,id,cfg){
    const dinner=row.kind==='dinner',hour=dinner?cfg.dinnerHour:cfg.lunchHour;
    const start=row.date+'T'+String(hour).padStart(2,'0')+':00:00';
    const end=row.date+'T'+String(hour).padStart(2,'0')+':30:00';
    const name=row.name||specials[row.choice]||'Meal planned';
    const nameKind=dinner?'Dinner':'Lunch';
    const details=[nameKind+': '+name,
      'Cooking: '+(row.cook&&row.cook!=='Unassigned'?row.cook:'Unassigned'),'',
      'Open recipe in PanCoon: '+(row.recipeId?recipeLink(row.recipeId):planLink())];
    if(row.recipeId&&row.hasZine)
      details.push('Open or print zine in PanCoon: '+recipeLink(row.recipeId,true));
    details.push('','Managed by PanCoon. Change meals in the PanCoon planner.');
    return {id,summary:(dinner?'🍽️ Dinner: ':'🥪 Lunch: ')+name,
      description:details.join('\n'),
      start:{dateTime:start,timeZone:cfg.timeZone},
      end:{dateTime:end,timeZone:cfg.timeZone},
      transparency:'transparent',reminders:{useDefault:false,overrides:[]},
      extendedProperties:{private:{pancoon:'meal',mealDate:row.date,mealKind:row.kind}}};
  }
  async function publish(automatic=false){
    if(!isOwner()||busy)return;
    const cfg=config();
    if(!cfg.clientId||!cfg.calendarId||!authorized()){tell('Connect Google to publish your meals.',true);return;}
    let week;
    try{week=snapshot();}catch(e){tell(e.message,true);return;}
    const planned=week.rows.filter(x=>x.choice&&x.choice!=='special:undecided');
    if(!planned.length&&!automatic&&!confirm(
      'There are no planned meals this week. Publishing will remove any previously published PanCoon meals for this week. Continue?'))return;
    busy=true;refresh();
    let created=0,updated=0,removed=0,unchanged=0;
    tell('Publishing the selected week to Google Calendar…');
    try{
      for(const row of week.rows){
        const id=await idFor(cfg.calendarId,row);
        const current=await request(cfg.calendarId,'/'+id);
        const isPlanned=Boolean(row.choice&&row.choice!=='special:undecided');
        if(!isPlanned){
          if(!current.missing){await request(cfg.calendarId,'/'+id,'DELETE');removed++;}
          else unchanged++;
          continue;
        }
        const next=buildEvent(row,id,cfg);
        if(current.missing){
          try{await request(cfg.calendarId,'','POST',next);created++;}
          catch(error){
            if(!/Calendar 409/.test(error.message))throw error;
            await request(cfg.calendarId,'/'+id,'PATCH',next);updated++;
          }
        }else{
          const different=['summary','description','transparency'].some(key=>current[key]!==next[key])||
            current.start?.dateTime?.slice(0,19)!==next.start.dateTime||
            current.end?.dateTime?.slice(0,19)!==next.end.dateTime;
          if(different){await request(cfg.calendarId,'/'+id,'PATCH',next);updated++;}
          else unchanged++;
        }
      }
      tell('Calendar synced: '+created+' new, '+updated+' updated, '+removed+' removed'+
        (unchanged?', '+unchanged+' already current.':'.'));
    }catch(error){
      if(!authorized()){auto=false;if(ui('pancoonCalendarAuto'))ui('pancoonCalendarAuto').checked=false;}
      tell('Sync interrupted after '+(created+updated+removed)+' changes: '+error.message,true);
    }finally{busy=false;refresh();}
  }
  function scheduleAutoPublish(){
    if(!auto)return;
    if(!authorized()){
      auto=false;
      const toggle=ui('pancoonCalendarAuto');
      if(toggle)toggle.checked=false;
      tell('Google authorization expired. Reconnect and publish again.',true);
      return;
    }
    if(busy)return;
    clearTimeout(autoTimer);
    autoTimer=setTimeout(()=>publish(true),2500);
  }
  function saveSettings(){
    if(!isOwner())return;
    const clientId=ui('pancoonCalendarClientId').value.trim();
    const calendarId=ui('pancoonCalendarId').value.trim();
    const dinnerHour=Number(ui('pancoonCalendarDinnerHour').value.slice(0,2));
    const lunchHour=Number(ui('pancoonCalendarLunchHour').value.slice(0,2));
    if(clientId&&!/^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)){
      tell('Please enter a Google OAuth Web Client ID.',true);return;
    }
    if(!calendarId||!clientId){
      tell('Both the OAuth Client ID and editable Google Calendar ID are required.',true);return;
    }
    if(!ui('pancoonCalendarDinnerHour').value.endsWith(':00')||
       !ui('pancoonCalendarLunchHour').value.endsWith(':00')||
       !Number.isInteger(dinnerHour)||dinnerHour>23||dinnerHour<0||
       !Number.isInteger(lunchHour)||lunchHour>23||lunchHour<0){
      tell('Select a valid start time.',true);return;
    }
    const prior=config();
    localStorage.setItem(KEY,JSON.stringify({clientId,calendarId,dinnerHour,lunchHour,timeZone:'America/Chicago'}));
    if(prior.clientId!==clientId||prior.calendarId!==calendarId){
      accessToken='';expiresAt=0;tokenClient=null;tokenClientId='';auto=false;
      ui('pancoonCalendarAuto').checked=false;
    }
    loadGis().catch(error=>tell(error.message,true));
    tell('Calendar settings saved on this device. Connect Google to publish.');
  }
  function start(){
    const settingsPage=ui('settingsPage');
    if(!settingsPage)return;
    const existing=ui('pancoonCalendarCard');
    if(!isOwner()){
      // Remove the controls immediately on sign-out or account changes.
      if(existing)existing.remove();
      accessToken='';expiresAt=0;tokenClient=null;tokenClientId='';
      auto=false;clearTimeout(autoTimer);
      return;
    }
    if(existing)return;
    const style=document.createElement('style');
    style.id='pancoonCalendarStyles';
    style.textContent='.pancoon-calendar{margin-top:20px;padding:22px;border:1px solid var(--line,#e5dbd6);border-radius:18px;background:var(--card,#fff)}'+
      '.pancoon-calendar h3{margin:4px 0 8px;font:700 1.35rem Georgia,serif}'+
      '.pancoon-calendar p{margin:8px 0;line-height:1.5}'+
      '.pancoon-calendar .calendar-actions{display:flex;flex-wrap:wrap;gap:9px;margin:14px 0}'+
      '.pancoon-calendar .calendar-settings{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:12px 0}'+
      '.pancoon-calendar .calendar-settings label{display:grid;gap:5px;font-weight:700;font-size:.9rem}'+
      '.pancoon-calendar .calendar-settings input{width:100%;box-sizing:border-box;max-width:100%;padding:10px;border:1px solid #bcb4b0;border-radius:10px;background:#fff;color:#272123}'+
      '.pancoon-calendar .calendar-auto{display:flex;align-items:flex-start;gap:9px;font-size:.9rem}'+
      '.pancoon-calendar .calendar-auto input{margin-top:4px}'+
      '.pancoon-calendar details{margin-top:12px}.pancoon-calendar summary{font-weight:750;cursor:pointer}'+
      '.pancoon-calendar small{color:var(--muted,#6d6569)}';
    if(!ui('pancoonCalendarStyles'))document.head.appendChild(style);
    const card=document.createElement('section');
    card.id='pancoonCalendarCard';card.className='pancoon-calendar';
    card.setAttribute('aria-label','PanCoon Google Calendar publishing');
    card.innerHTML='<p class="eyebrow">Owner controls · Family calendar</p>'+
      '<h3>🗓️ Publish meals to Google Calendar</h3>'+
      '<p>Only the household owner sees these controls. Select a week in Meal Plan first, then publish it here. Dinner defaults to 5 PM and lunch to 11 AM. Re-publishing updates existing appointments.</p>'+
      '<p id="pancoonCalendarPreview" class="hint"></p>'+
      '<div class="calendar-actions"><button type="button" class="secondary" id="pancoonCalendarConnect">Connect Google</button>'+
      '<button type="button" class="primary" id="pancoonCalendarPublish">Publish this week</button></div>'+
      '<p class="hint" id="pancoonCalendarConnection"></p>'+
      '<label class="calendar-auto"><input type="checkbox" id="pancoonCalendarAuto"><span>Auto-update after meal changes'+
      ' <small>(only while Google is connected in this open tab)</small></span></label>'+
      '<p id="pancoonCalendarStatus" role="status" aria-live="polite"></p>'+
      '<details id="pancoonCalendarSetup"><summary>Google setup and meal times</summary>'+
      '<p class="hint">One-time setup: enable Google Calendar API, create an OAuth Web Client ID in '+
      '<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>,'+
      ' and add this website to Authorized JavaScript origins. Add your Google account as a test user if the OAuth app is in Testing.'+
      ' Do not enter a client secret or Google password.</p>'+
      '<div class="calendar-settings">'+
      '<label>Google OAuth Web Client ID<input id="pancoonCalendarClientId" type="text" autocomplete="off" placeholder="12345-abc.apps.googleusercontent.com"></label>'+
      '<label>Google Calendar ID / email<input id="pancoonCalendarId" type="text" autocomplete="off" placeholder="Family Calendar address"></label>'+
      '<label>Dinner time<input id="pancoonCalendarDinnerHour" type="time" step="3600"></label>'+
      '<label>Lunch time<input id="pancoonCalendarLunchHour" type="time" step="3600"></label></div>'+
      '<button type="button" class="secondary" id="pancoonCalendarSave">Save calendar settings</button>'+
      '<p><small>Google access expires and may need reconnecting. Events are 30 minutes, marked free, with no reminders.'+
      ' This connection uses America/Chicago time. Your Google token is not stored or shared with the family.</small></p>'+
      '</details>';
    const householdCard=ui('pancoonHouseholdCard');
    if(householdCard)householdCard.insertAdjacentElement('afterend',card);
    else settingsPage.prepend(card);
    const cfg=config();
    ui('pancoonCalendarClientId').value=cfg.clientId;
    ui('pancoonCalendarId').value=cfg.calendarId;
    ui('pancoonCalendarDinnerHour').value=String(cfg.dinnerHour).padStart(2,'0')+':00';
    ui('pancoonCalendarLunchHour').value=String(cfg.lunchHour).padStart(2,'0')+':00';
    if(!cfg.clientId||!cfg.calendarId)ui('pancoonCalendarSetup').open=true;
    ui('pancoonCalendarConnect').addEventListener('click',connect);
    ui('pancoonCalendarPublish').addEventListener('click',()=>publish(false));
    ui('pancoonCalendarSave').addEventListener('click',saveSettings);
    ui('pancoonCalendarAuto').checked=auto;
    ui('pancoonCalendarAuto').addEventListener('change',event=>{
      auto=Boolean(isOwner()&&event.target.checked&&authorized());
      tell(auto?'Auto-update enabled while this tab stays connected.':'Auto-update disabled.');
    });
    if(cfg.clientId)loadGis().catch(error=>tell(error.message,true));
    preview();refresh();
    if(!cfg.clientId||!cfg.calendarId)tell('Configure your Google Calendar connection below to start publishing.');
  }
  window.addEventListener('pancoon:access-changed',start);
  window.addEventListener('pancoon:settings-rendered',start);
  window.addEventListener('pancoon:week-changed',preview);
  window.addEventListener('pancoon:cloud-refresh',preview);
  window.addEventListener('pancoon:plan-updated',()=>{
    preview();
    if(!isOwner())return;
    if(auto)scheduleAutoPublish();
    else if(authorized())tell('Meal plan changed. Publish this week to refresh Google Calendar.');
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();