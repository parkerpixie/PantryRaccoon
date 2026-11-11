(() => {
  'use strict';

  const STORAGE_KEY = 'pantry-raccoon:v1';
  const SETTINGS_KEY = 'pancoon:settings:v1';
  const MEAL_KINDS = ['breakfast','lunch','dinner','snacks'];
  const DEFAULT_MEALS = ['dinner','lunch'];
  const INSTALL_KIND_KEY = 'pancoon:install-kind:v1';
  if (!localStorage.getItem(INSTALL_KIND_KEY)) {
    const fresh = !localStorage.getItem(STORAGE_KEY) && !localStorage.getItem(SETTINGS_KEY);
    localStorage.setItem(INSTALL_KIND_KEY, fresh ? 'new' : 'legacy');
  }
  window.PanCoonLegacyInstall = localStorage.getItem(INSTALL_KIND_KEY) === 'legacy';
  window.PanCoonFirstInstall = !window.PanCoonLegacyInstall && !localStorage.getItem(SETTINGS_KEY);
  const GROCERY_CATEGORIES = ['Produce','Meat & Seafood','Dairy & Refrigerated','Bakery & Bread','Frozen','Pantry','Other'];
  const INVENTORY_CONFIG = {
    pantry: {label:'Pantry', categories:['Baking','Spices','Snacks','Staples','Other'], locations:['Pantry']},
    fridge: {label:'Fridge', categories:['Produce','Dairy','Deli','Condiments','Drinks','Leftovers','Other'], locations:['Fridge']},
    freezer: {label:'Freezer', categories:['Meals','Meat','Vegetables','Fruit','Bread','Treats','Other'], locations:['Upstairs','Chest Freezer']}
  };
  const STATUS_OPTIONS = [
    {value:'plenty',label:'Plenty'},
    {value:'half',label:'Half Full'},
    {value:'low',label:'Low'},
    {value:'out',label:'Out'}
  ];
  const SPECIALS = [
    {id:'special:out',name:'Go out to Eat',note:'No ingredients. No prep. Everybody wins.'},
    {id:'special:leftovers',name:'Leftovers',note:'Use what is already cooked.'},
    {id:'special:freezer',name:'Freezer / Heat & Eat',note:'A deliberately easy meal.'},
    {id:'special:undecided',name:'Undecided',note:'Future you can solve this one.'}
  ];

  let state = load();
  let toastTimer;

  function freshState(){
    return {
      version:3, recipes:[], plan:{}, inventories:{pantry:[],fridge:[],freezer:[]},
      groceryReview:{}, groceryDismissed:{}, groceryExtras:[], squirrelQueue:[],
      // Brand-new kitchens begin empty. Existing local state is never erased here.
    };
  }
  function load(){
    try { return {...freshState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}; }
    catch { return freshState(); }
  }
  function save(){ state.version=3; localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
  function uid(){ return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function esc(v){ return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }
  function lines(v){ return String(v||'').split(/\r?\n/).map(x=>x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').trim()).filter(Boolean); }
  function dateKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function planSettings(){
    let raw={}; try {raw=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{};} catch (_) {}
    const weekday=(v,def)=>Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<=6?Number(v):def;
    const meals=Array.isArray(raw.meals)?raw.meals.filter(v=>MEAL_KINDS.includes(v)):DEFAULT_MEALS;
    return {weekStart:weekday(raw.weekStart,0),planningDay:weekday(raw.planningDay,6),meals,
      mealDays:raw.mealDays&&typeof raw.mealDays==='object'?raw.mealDays:{},
      members:Array.isArray(raw.members)?raw.members.filter(v=>typeof v==='string'&&v.trim()):[]};
  }
  function weekDates(now=new Date()){
    const start=new Date(now);start.setHours(0,0,0,0);
    start.setDate(start.getDate()-((start.getDay()-planSettings().weekStart+7)%7));
    return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});
  }
  function weekKey(){return dateKey(weekDates()[0]);}
  function mealsForDay(date){
    const config=planSettings(),custom=config.mealDays[date.getDay()];
    return Array.isArray(custom)?custom.filter(v=>MEAL_KINDS.includes(v)):config.meals;
  }
  function fmt(d,opts){ return new Intl.DateTimeFormat('en-US',opts).format(d); }
  function toast(title,detail=''){ const t=document.getElementById('toast'); if(!t)return; t.querySelector('strong').textContent=title; t.querySelector('span').textContent=detail; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),3200); }

  function migrate(){
    state.recipes=Array.isArray(state.recipes)?state.recipes:[];
    state.plan=state.plan&&typeof state.plan==='object'?state.plan:{};
    state.inventories=state.inventories&&typeof state.inventories==='object'?state.inventories:{pantry:[],fridge:[],freezer:[]};
    for(const key of Object.keys(INVENTORY_CONFIG)) state.inventories[key]=Array.isArray(state.inventories[key])?state.inventories[key]:[];
    if(Array.isArray(state.pantry) && state.pantry.length){
      for(const old of state.pantry){
        if(!state.inventories.pantry.some(x=>x.id===old.id)){
          state.inventories.pantry.push({...old,category:old.category||'Staples',location:'Pantry'});
        }
      }
      delete state.pantry;
    }
    state.groceryReview=state.groceryReview&&typeof state.groceryReview==='object'?state.groceryReview:{};
    state.groceryDismissed=state.groceryDismissed&&typeof state.groceryDismissed==='object'?state.groceryDismissed:{};
    state.groceryExtras=Array.isArray(state.groceryExtras)?state.groceryExtras:[];
    state.squirrelQueue=Array.isArray(state.squirrelQueue)?state.squirrelQueue:[];
  }

  function initializeKitchen(){
    migrate();
    save();
  }

  function route(name){
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===name));
    document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.route===name));
    const meta={
      plan:['This week','Your week, your meals. Change the schedule in Settings.'],
      settings:['Settings','Customize your kitchen and protect your saved data.'],
      recipes:['Recipe box','Save it once. Cook it whenever.'],
      pantry:['Pantry','Baking, spices, snacks, staples, and the useful stuff.'],
      fridge:['Fridge','Track the things that disappear quietly.'],
      freezer:['Freezer','Upstairs and chest freezer, finally in one place.'],
      grocery:['Grocery','Shop the plan, then clear what is ordered.']
    }[name]||['PanCoon','Kitchen command center'];
    document.getElementById('pageTitle').textContent=meta[0];
    document.getElementById('pageSubtitle').textContent=meta[1];
    location.hash=name;
  }

  function recipeForChoice(choice){ return choice?.startsWith('recipe:') ? state.recipes.find(r=>r.id===choice.slice(7))||null : null; }
  function specialForChoice(choice){ return SPECIALS.find(s=>s.id===choice)||null; }
  function choiceOptions(selected='',kind='dinner'){
    const specials=SPECIALS.map(s=>`<option value="${s.id}" ${selected===s.id?'selected':''}>${esc(s.name)}</option>`).join('');
    const recipes=[...state.recipes].sort((a,b)=>a.name.localeCompare(b.name)).map(r=>`<option value="recipe:${esc(r.id)}" ${selected===`recipe:${r.id}`?'selected':''}>${esc(r.name)}</option>`).join('');
    return `<option value="">Choose ${kind}…</option><optgroup label="Real life">${specials}</optgroup><optgroup label="Recipes">${recipes}</optgroup>`;
  }
  function cookOptions(selected=''){
    const savedNames=Object.values(state.plan).map(slot=>slot?.cook).filter(Boolean);
    const options=[...new Set(['Unassigned','Nobody',...planSettings().members,...savedNames,selected].filter(Boolean))];
    return options.map(name=>'<option '+(name===selected?'selected':'')+'>'+esc(name)+'</option>').join('');
  }

  function mealDisplay(day,kind){
    const slot=state.plan[`${day}:${kind}`]||{choice:'',cook:'Unassigned'};
    const recipe=recipeForChoice(slot.choice), special=specialForChoice(slot.choice);
    if(recipe){
      return `<div class="planned-meal">
        <div><span class="meal-kind">${kind}</span><strong>${esc(recipe.name)}</strong><small>${recipe.totalMinutes||'?'} min${kind==='dinner'&&slot.cook?` · ${esc(slot.cook)} cooking`:''}</small></div>
        <div class="meal-actions"><button data-view-recipe="${esc(recipe.id)}">View</button><button data-print-recipe="${esc(recipe.id)}">Print</button></div>
      </div>`;
    }
    if(special) return `<div class="planned-meal special-display"><div><span class="meal-kind">${kind}</span><strong>${esc(special.name)}</strong><small>${esc(special.note)}</small></div></div>`;
    return `<div class="planned-meal empty-meal"><div><span class="meal-kind">${kind}</span><strong>Nothing planned yet</strong></div></div>`;
  }

  let selectedPlanDay = '';
  function renderPlan(){
    const dates=weekDates(),today=dateKey(new Date());
    const days=dates.map(dateKey);
    if(!days.includes(selectedPlanDay))selectedPlanDay=days.includes(today)?today:days[0];
    const opened=Boolean(document.querySelector('#mealPlan .plan-edit[open]'));
    document.getElementById('weekRange').textContent=fmt(dates[0],{month:'short',day:'numeric'})+' → '+fmt(dates[6],{month:'short',day:'numeric'});
    const date=dates[days.indexOf(selectedPlanDay)], day=selectedPlanDay, kinds=mealsForDay(date);
    const tabs=dates.map(d=>{
      const key=dateKey(d), active=key===day;
      return '<button type="button" class="week-day-tab '+(active?'selected':'')+(key===today?' is-today':'')+'" data-select-plan-day="'+key+'" aria-pressed="'+active+'"><span>'+fmt(d,{weekday:'short'})+'</span><strong>'+d.getDate()+'</strong>'+(key===today?'<small>Today</small>':'<small>&nbsp;</small>')+'</button>';
    }).join('');
    const controls=kinds.map(kind=>{
      const slot=state.plan[day+':'+kind]||{choice:'',cook:'Unassigned'};
      const label=kind.charAt(0).toUpperCase()+kind.slice(1);
      return '<label>'+esc(label)+'<select data-plan-choice="'+day+'" data-plan-kind="'+kind+'">'+choiceOptions(slot.choice,kind)+'</select></label>'+
        '<label>'+esc(label)+' cook<select data-plan-cook="'+day+'" data-plan-kind="'+kind+'">'+cookOptions(slot.cook||'Unassigned')+'</select></label>';
    }).join('');
    const overview=dates.map(d=>{
      const key=dateKey(d), enabled=mealsForDay(d);
      const items=enabled.map(kind=>{
        const slot=state.plan[key+':'+kind]||{}, recipe=recipeForChoice(slot.choice), special=specialForChoice(slot.choice);
        return '<span class="week-overview-meal"><small>'+esc(kind)+'</small><strong>'+esc(recipe?.name||special?.name||'Not planned')+'</strong>'+(slot.cook&&!['Unassigned','Nobody'].includes(slot.cook)?'<span class="week-overview-cook">'+esc(slot.cook)+'</span>':'')+'</span>';
      }).join('');
      return '<button type="button" class="week-overview-row '+(key===day?'selected':'')+'" data-select-plan-day="'+key+'" aria-pressed="'+(key===day)+'"><span class="week-overview-date"><strong>'+fmt(d,{weekday:'short'})+'</strong><small>'+fmt(d,{month:'short',day:'numeric'})+'</small></span><span class="week-overview-meals">'+(items||'<small>No meals configured</small>')+'</span><span class="week-chevron" aria-hidden="true">›</span></button>';
    }).join('');
    document.getElementById('mealPlan').innerHTML=
      '<div class="week-day-strip" aria-label="Choose a day">'+tabs+'</div>'+
      '<div class="week-layout"><article class="week-focus"><div class="week-focus-header"><div><p class="eyebrow">'+(day===today?'Today':'Selected day')+'</p><h3>'+fmt(date,{weekday:'long',month:'short',day:'numeric'})+'</h3></div></div>'+
      '<div class="day-meals">'+(kinds.map(kind=>mealDisplay(day,kind)).join('')||'<div class="empty-meal">No meals configured. Open Settings to choose some.</div>')+'</div>'+
      (controls?'<details class="plan-edit" data-day="'+day+'" '+(opened?'open':'')+'><summary>Edit this day</summary><div class="week-edit-fields">'+controls+'</div></details>':'')+
      '</article><section class="week-overview"><h3>At a glance</h3><p class="hint">Tap any day to view or change its meals.</p><div class="week-overview-list">'+overview+'</div></section></div>';
  }
  function renderRecipes(){
    let zines={};
    try{zines=JSON.parse(localStorage.getItem('pantry-raccoon:recipe-zines:v1')||'{}')||{};}catch(_){}
    const q=(document.getElementById('recipeSearch')?.value||'').trim().toLowerCase();
    const list=[...state.recipes].filter(r=>!q||[r.name,r.createdBy,r.category].some(v=>String(v||'').toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name));
    document.getElementById('recipeShelf').innerHTML=list.length?list.map(r=>`<article class="recipe-card${zines[r.id]?' has-zine':''}">
      <div class="recipe-card-image">${(zines[r.id]||r.sourceImageUrl)?`<img src="${esc(zines[r.id]||r.sourceImageUrl)}" alt="${esc(r.name)} thumbnail" loading="lazy">`:'<span>🍲</span>'}</div>
      <div class="recipe-card-copy"><p class="eyebrow">${esc(r.category||'Recipe')}</p><h3>${esc(r.name)}</h3><p>${r.createdBy?`By ${esc(r.createdBy)} · `:''}${r.totalMinutes||'?'} min · ${(r.ingredients||[]).length} ingredients</p>
      <div class="recipe-card-actions"><button data-view-recipe="${esc(r.id)}">View</button><button data-edit-recipe="${esc(r.id)}">Edit</button><button data-upload-zine="${esc(r.id)}">${zines[r.id]?'Replace zine':'Add zine'}</button><button data-print-recipe="${esc(r.id)}">Print</button><button data-email-recipe="${esc(r.id)}">Email</button>${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">Source</a>`:''}</div></div>
    </article>`).join(''):'<div class="empty">No recipes match.</div>';
  }

  function openRecipeForm(recipe=null){
    const f=document.getElementById('recipeForm'); f.reset();
    f.elements.id.value=recipe?.id||''; f.elements.name.value=recipe?.name||''; f.elements.createdBy.value=recipe?.createdBy||'';
    f.elements.prepMinutes.value=recipe?.prepMinutes||0; f.elements.cookMinutes.value=recipe?.cookMinutes||0; f.elements.servings.value=recipe?.servings||'';
    f.elements.url.value=recipe?.url||''; f.elements.ingredients.value=(recipe?.ingredients||[]).join('\n'); f.elements.instructions.value=(recipe?.instructions||[]).join('\n'); f.elements.notes.value=recipe?.notes||'';
    document.getElementById('recipeDialogTitle').textContent=recipe?`Edit ${recipe.name}`:'Add family recipe'; document.getElementById('recipeDialog').showModal();
  }
  async function saveRecipeForm(form){
    if(form.dataset.saving==='true')return;
    const submit=form.querySelector('[type="submit"]'), previousLabel=submit?.textContent||'Save recipe';
    form.dataset.saving='true';
    if(submit){submit.disabled=true;submit.textContent='Saving recipe & zine…';}
    const notice=document.getElementById('recipeZineFieldStatus');
    const oldKitchen=localStorage.getItem(STORAGE_KEY);
    const oldZinesRaw=localStorage.getItem('pantry-raccoon:recipe-zines:v1');
    try{
      const existing=state.recipes.find(r=>r.id===form.elements.id.value);
      const id=existing?.id||uid();
      const file=form.elements.zineUpload?.files?.[0]||null;
      const removeZine=Boolean(form.elements.zineRemove?.checked);
      const newPath=String(form.elements.zineAsset?.value||'').trim();
      const store=window.PanCoonZineStore;
      let zines={};
      try{zines=JSON.parse(oldZinesRaw||'{}')||{};}catch(_){zines={};}
      const previousZine=zines[id]||'';
      let nextZine=previousZine;

      if(file){
        if(!store)throw new Error('Image storage is not available. Reload the app and try again.');
        if(notice)notice.textContent='Saving and verifying '+file.name+'…';
        nextZine=await store.put(id,file);
        // The record must be retrievable after IndexedDB transaction completion.
        await store.resolve(nextZine);
      }else if(removeZine){
        nextZine='';
      }else if(newPath){
        nextZine=/^https?:\/\//i.test(newPath)||newPath.startsWith('/')||newPath.startsWith('pancoon-private://')
          ?newPath :newPath.startsWith('assets/')?'/'+newPath:'/assets/'+newPath;
      }

      const recipe={...(existing||{}),id,name:form.elements.name.value.trim(),createdBy:form.elements.createdBy.value.trim(),category:existing?.category||'Dinner',
        prepMinutes:Number(form.elements.prepMinutes.value)||0,cookMinutes:Number(form.elements.cookMinutes.value)||0,servings:form.elements.servings.value.trim(),url:form.elements.url.value.trim(),
        ingredients:lines(form.elements.ingredients.value),instructions:lines(form.elements.instructions.value),notes:form.elements.notes.value.trim(),updatedAt:new Date().toISOString(),createdAt:existing?.createdAt||new Date().toISOString()};
      recipe.totalMinutes=recipe.prepMinutes+recipe.cookMinutes||existing?.totalMinutes||0;
      state.recipes=[recipe,...state.recipes.filter(r=>r.id!==recipe.id)];
      save();
      if(nextZine)zines[id]=nextZine;else delete zines[id];
      localStorage.setItem('pantry-raccoon:recipe-zines:v1',JSON.stringify(zines));

      // Retire old blobs only after the recipe and new zine reference are safely saved.
      if(store?.isLocal(previousZine)&&previousZine!==nextZine){
        try{await store.remove(id);}catch(error){console.warn('Old zine cleanup deferred:',error);}
      }
      form.closest('dialog').close();
      renderRecipes();renderPlan();renderGrocery();
      window.dispatchEvent(new CustomEvent('pancoon:zine-changed',{detail:{recipeId:id}}));
      toast(file?'Recipe and zine saved.':'Recipe saved.',recipe.name);
    }catch(error){
      // If a storage write fails, preserve the user's pre-save recipe collection.
      try{
        if(oldKitchen!==null)localStorage.setItem(STORAGE_KEY,oldKitchen);
        if(oldZinesRaw!==null)localStorage.setItem('pantry-raccoon:recipe-zines:v1',oldZinesRaw);
        state=load();
      }catch(_){}
      const msg=error?.message||'The image could not be saved.';
      if(notice){notice.textContent='Save failed: '+msg;notice.setAttribute('role','alert');}
      toast('Save failed.',msg);
      console.error('PanCoon recipe/zine save:',error);
    }finally{
      delete form.dataset.saving;
      if(submit){submit.disabled=false;submit.textContent=previousLabel;}
    }
  }
  function viewRecipe(recipe){
    if(!recipe)return;
    document.getElementById('recipeView').classList.remove('zine-primary-view');
    document.getElementById('recipeView').innerHTML=`<button type="button" class="dialog-close" data-close-view>×</button><p class="eyebrow">${esc(recipe.category||'Recipe')}</p><h2>${esc(recipe.name)}</h2><p>${recipe.createdBy?`By ${esc(recipe.createdBy)} · `:''}${recipe.servings?`Serves ${esc(recipe.servings)} · `:''}${recipe.totalMinutes||'?'} minutes</p>
      <div class="recipe-columns"><section><h3>Ingredients</h3><ul>${(recipe.ingredients||[]).map(v=>`<li>${esc(v)}</li>`).join('')}</ul></section><section><h3>Instructions</h3><ol>${(recipe.instructions||[]).map(v=>`<li>${esc(v)}</li>`).join('')}</ol></section></div>
      ${recipe.notes?`<p><strong>Notes:</strong> ${esc(recipe.notes)}</p>`:''}<div class="button-row recipe-view-actions"><button class="primary" data-print-recipe="${esc(recipe.id)}">Print</button><button class="secondary" data-email-recipe="${esc(recipe.id)}">Email</button>${recipe.url?`<a class="secondary" href="${esc(recipe.url)}" target="_blank" rel="noopener">Original recipe</a>`:''}</div>`;
    const dialog=document.getElementById('recipeViewDialog'); if(!dialog.open)dialog.showModal();
  }
  function printRecipe(recipe){ if(!recipe)return; viewRecipe(recipe); document.body.classList.add('pancoon-print-recipe'); window.addEventListener('afterprint',()=>document.body.classList.remove('pancoon-print-recipe'),{once:true}); window.print(); setTimeout(()=>document.body.classList.remove('pancoon-print-recipe'),60000); }
  function emailRecipe(recipe){ if(!recipe)return; const body=[recipe.name,'',...(recipe.ingredients||[]).map(v=>`• ${v}`),'','Instructions',...(recipe.instructions||[]).map((v,i)=>`${i+1}. ${v}`),recipe.url?`Source: ${recipe.url}`:''].join('\n'); location.href=`mailto:?subject=${encodeURIComponent(`Recipe: ${recipe.name}`)}&body=${encodeURIComponent(body)}`; }

  async function importRecipe(form){
    const input=form.elements.recipeUrl,status=document.getElementById('importStatus'),button=form.querySelector('button[type="submit"]');
    let url; try{url=new URL(input.value.trim());if(url.protocol!=='https:')throw new Error();}catch{toast('Paste a full HTTPS recipe link.');return;}
    button.disabled=true; button.textContent='Reading recipe…'; status.textContent='The raccoon is checking the recipe card…';
    try{
      const response=await fetch(`/api/recipe-context?url=${encodeURIComponent(url.href)}`,{cache:'no-store'}), data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||'Recipe import failed.');
      const existing=state.recipes.find(r=>r.url===data.sourceUrl||r.url===url.href);
      const recipe={...(existing||{}),id:existing?.id||uid(),name:data.name||url.hostname,createdBy:existing?.createdBy||'',category:form.elements.category.value||'Dinner',prepMinutes:Number(data.prepMinutes)||0,cookMinutes:Number(data.cookMinutes)||0,totalMinutes:Number(data.totalMinutes)||Number(data.prepMinutes||0)+Number(data.cookMinutes||0),servings:data.servings||'',ingredients:Array.isArray(data.ingredients)?data.ingredients:[],instructions:Array.isArray(data.instructions)?data.instructions:[],sourceImageUrl:data.imageUrl||'',url:data.sourceUrl||url.href,notes:existing?.notes||'',createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      state.recipes=[recipe,...state.recipes.filter(r=>r.id!==recipe.id)]; save(); input.value=''; renderRecipes(); renderPlan(); renderGrocery(); status.textContent=`Saved ${recipe.name} with ${recipe.ingredients.length} ingredients.`; toast('Recipe created from URL.',recipe.name);
    }catch(error){status.textContent=error.message||'The recipe site could not be read.';toast('Recipe import failed.',status.textContent);}
    finally{button.disabled=false;button.textContent='Create recipe from URL';}
  }

  function statusLabel(v){ return STATUS_OPTIONS.find(x=>x.value===v)?.label||v; }
  function renderInventory(kind){
    const cfg=INVENTORY_CONFIG[kind], target=document.getElementById(`${kind}List`), list=state.inventories[kind]||[];
    const groups=cfg.categories.map(cat=>({cat,items:list.filter(x=>(x.category||'Other')===cat).sort((a,b)=>a.name.localeCompare(b.name))})).filter(g=>g.items.length);
    target.innerHTML=groups.length?groups.map(g=>`<section class="inventory-group"><h3>${esc(g.cat)} <span>${g.items.length}</span></h3><div class="inventory-grid">${g.items.map(item=>`<article class="inventory-item">
      <div><strong>${esc(item.name)}</strong><small>${esc(item.quantity||'Quantity not set')}${kind==='freezer'?` · ${esc(item.location||'Upstairs')}`:''}</small></div>
      <span class="status ${esc(item.status)}">${esc(statusLabel(item.status))}</span>
      <div class="inventory-actions">${STATUS_OPTIONS.map(s=>`<button data-inventory-status="${esc(item.id)}" data-inventory-kind="${kind}" data-status="${s.value}">${esc(s.label)}</button>`).join('')}<button data-remove-inventory="${esc(item.id)}" data-inventory-kind="${kind}">Remove</button></div>
    </article>`).join('')}</div></section>`).join(''):`<div class="empty">Nothing tracked in ${esc(cfg.label.toLowerCase())} yet.</div>`;
  }
  function renderAllInventory(){ Object.keys(INVENTORY_CONFIG).forEach(renderInventory); }
  function inventoryFormOptions(){
    document.querySelectorAll('[data-inventory-form]').forEach(form=>{
      const kind=form.dataset.inventoryForm,cfg=INVENTORY_CONFIG[kind];
      form.elements.category.innerHTML=cfg.categories.map(c=>`<option>${esc(c)}</option>`).join('');
      form.elements.status.innerHTML=STATUS_OPTIONS.map(s=>`<option value="${s.value}">${esc(s.label)}</option>`).join('');
      if(form.elements.location) form.elements.location.innerHTML=cfg.locations.map(l=>`<option>${esc(l)}</option>`).join('');
    });
  }

  function stripQty(value){ return String(value||'').toLowerCase().normalize('NFKD').replace(/\([^)]*\)/g,' ').replace(/\b\d+(?:\s+\d+\/\d+|[./]\d+)?\b/g,' ').replace(/\b(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|grams?|kg|ml|cloves?|cans?|packages?|jars?|bottles?|containers?|bunches?|heads?|stalks?|sprigs?|slices?|pieces?|pinches?|dashes?)\b/g,' ').replace(/[^a-z0-9\s-]/g,' ').replace(/\s+/g,' ').trim(); }
  function ingredientIdentity(value){
    const raw=String(value||'').toLowerCase(), stripped=stripQty(raw);
    if(/\btomato paste\b/.test(raw))return{key:'tomato paste',name:'Tomato Paste'};
    if(/\bcrushed tomatoes?\b/.test(raw))return{key:'crushed tomatoes',name:'Crushed Tomatoes'};
    if(/\bdiced tomatoes?\b/.test(raw)&&/\b(can|canned|oz)\b/.test(raw))return{key:'diced canned tomatoes',name:'Diced Canned Tomatoes'};
    if(/\btomato sauce\b/.test(raw))return{key:'tomato sauce',name:'Tomato Sauce'};
    if(/\broma tomatoes?\b/.test(raw))return{key:'roma tomatoes',name:'Roma Tomatoes'};
    if(/\btomatoes?\b/.test(raw))return{key:'fresh tomatoes',name:'Fresh Tomatoes'};
    if(/\bshredded carrots?\b/.test(raw))return{key:'shredded carrots',name:'Shredded Carrots'};
    if(/\bdiced carrots?\b/.test(raw))return{key:'diced carrots',name:'Diced Carrots'};
    if(/\bcarrots?\b/.test(raw))return{key:'carrots',name:'Carrots'};
    let key=stripped.replace(/\b(to taste|for serving|plus more|optional|drained|warmed|finely|thinly)\b/g,' ').replace(/\b(cut into|chopped|sliced|minced|diced|shredded|divided|softened|melted|cooked|uncooked|boneless|skinless|large|small|medium)\b/g,' ').replace(/\s+/g,' ').trim();
    [['scallions','green onion'],['garbanzo beans','chickpeas'],['chicken breasts','chicken breast'],['chicken cutlets','chicken breast'],['panko','breadcrumbs']].forEach(([a,b])=>key=key.replace(new RegExp(`\\b${a}\\b`,'g'),b));
    return{key,name:key.replace(/\b\w/g,c=>c.toUpperCase())};
  }
  function canonical(v){return ingredientIdentity(v).key;}
  function groceryCategory(line){
    const t=canonical(line),raw=String(line||'').toLowerCase();
    if(/tomato paste|crushed tomatoes|diced canned tomatoes|tomato sauce|peppadew|tahini|bouillon|broth|stock/.test(t))return'Pantry';
    if(/apple|avocado|banana|berry|broccoli|cabbage|carrot|celery|cilantro|corn|cucumber|garlic|greens|herb|lemon|lime|lettuce|mango|mushroom|onion|orange|peach|pepper|potato|spinach|fresh tomato|roma tomato|zucchini|parsley/.test(t))return'Produce';
    if(/chicken|beef|steak|pork|turkey|sausage|bacon|fish|salmon|shrimp|tuna|taco protein/.test(t))return'Meat & Seafood';
    if(/cheese|parmesan|milk|cream|butter|yogurt|egg/.test(t))return'Dairy & Refrigerated';
    if(/frozen|freezer|ice cream/.test(raw)||/frozen|freezer/.test(t))return'Frozen';
    if(/bread|bun|pita|tortilla|taco shell|baguette|bagel/.test(t))return'Bakery & Bread';
    if(/rice|pasta|noodle|flour|breadcrumbs|sugar|oil|vinegar|sauce|dressing|mustard|mayo|spice|seasoning|cumin|cardamom|turmeric|cinnamon|thyme|bay leaves|beans|nuts|seeds|salt/.test(t))return'Pantry';
    return'Other';
  }
  function inventoryMatch(key){
    for(const kind of Object.keys(INVENTORY_CONFIG)){
      const found=(state.inventories[kind]||[]).find(item=>{const k=canonical(item.name);return k===key||k.includes(key)||key.includes(k);});
      if(found)return{...found,kind};
    }
    return null;
  }
  function plannedMealEntries(){
    const entries=[]; for(const date of weekDates()){const day=dateKey(date);for(const kind of mealsForDay(date)){const recipe=recipeForChoice(state.plan[`${day}:${kind}`]?.choice);if(recipe)entries.push({date,kind,recipe});}} return entries;
  }
  function review(){state.groceryReview[weekKey()]||={};return state.groceryReview[weekKey()];}
  function dismissed(){state.groceryDismissed[weekKey()]||={};return state.groceryDismissed[weekKey()];}
  function groceryModel(){
    const map=new Map();
    for(const {date,kind,recipe} of plannedMealEntries()){
      for(const line of recipe.ingredients||[]){
        const identity=ingredientIdentity(line),key=identity.key||stripQty(line)||line.toLowerCase(); if(!key)continue;
        const item=map.get(key)||{key,name:identity.name||key,requirements:[],recipes:new Set(),category:groceryCategory(line),extraId:null};
        if(!item.requirements.includes(line))item.requirements.push(line); item.recipes.add(`${recipe.name} (${fmt(date,{weekday:'short'})} ${kind})`); map.set(key,item);
      }
    }
    for(const extra of state.groceryExtras){
      const key=`extra:${extra.id}`;
      map.set(key,{key,name:extra.name,requirements:[extra.name],recipes:new Set(['Added manually']),category:groceryCategory(extra.name),extraId:extra.id});
    }
    return [...map.values()].map(item=>{const inv=inventoryMatch(item.extraId?canonical(item.name):item.key);return{...item,inventory:inv,inventoryStatus:inv?.status||'need'};});
  }

  function renderGrocery(){
    const items=groceryModel(),r=review(),d=dismissed();
    const current=items.filter(i=>!d[i.key] && !r[i.key] && !['plenty','half'].includes(i.inventoryStatus));
    const completed=items.filter(i=>!d[i.key] && !!r[i.key]);
    const covered=items.filter(i=>['plenty','half'].includes(i.inventoryStatus)).length;
    document.getElementById('grocerySummary').innerHTML=`<span class="summary-chip">${current.length} to buy</span><span class="summary-chip">${completed.length} completed</span><span class="summary-chip">${covered} already covered</span>`;
    document.getElementById('groceryList').innerHTML=renderGroceryGroups(current,false);
    document.getElementById('groceryCompleted').innerHTML=completed.length?`<div class="completed-heading"><h3>Ordered / Completed</h3><button class="secondary small-button" id="clearCompleted">Clear completed</button></div>${renderGroceryGroups(completed,true)}`:'';
  }
  function renderGroceryGroups(items,done){
    const groups=GROCERY_CATEGORIES.map(cat=>({cat,items:items.filter(i=>i.category===cat)})).filter(g=>g.items.length);
    return groups.length?groups.map(g=>`<section class="grocery-group ${done?'completed-group':''}"><h3>${g.cat}</h3>${g.items.map(item=>`<label class="grocery-item ${done?'checked':''}">
      <input type="checkbox" data-grocery-check="${esc(item.key)}" ${done?'checked':''}><span><strong>${esc(item.name)}</strong><small>${esc(item.requirements.join(' + '))}</small></span><span class="grocery-source">${esc([...item.recipes].join(' · '))}</span>
      ${item.extraId&&!done?`<button type="button" class="squirrel-button" data-queue-squirrel="${esc(item.extraId)}">Send to Squirrels</button>`:''}
    </label>`).join('')}</section>`).join(''):'<div class="empty">Nothing waiting to be bought. Tiny raccoon victory. 🦝</div>';
  }
  function clearCompleted(){
    const r=review(),d=dismissed();
    for(const item of groceryModel().filter(i=>r[i.key])){
      if(item.extraId) state.groceryExtras=state.groceryExtras.filter(x=>x.id!==item.extraId);
      else d[item.key]=true;
      delete r[item.key];
    }
    save();renderGrocery();toast('Completed groceries cleared.','Add forgotten items anytime this week.');
  }
  function copyGrocery(){
    const r=review(),d=dismissed();
    const need=groceryModel().filter(i=>!d[i.key]&&!r[i.key]&&!['plenty','half'].includes(i.inventoryStatus));
    const text=GROCERY_CATEGORIES.flatMap(cat=>{const list=need.filter(i=>i.category===cat);return list.length?[cat.toUpperCase(),...list.map(i=>`☐ ${i.requirements.join(' + ')}`),'']:[];}).join('\n').trim()||'Nothing left to buy.';
    navigator.clipboard.writeText(text).then(()=>toast('Shopping list copied.')).catch(()=>toast('Copy did not work.','The list is still visible.'));
  }
  function queueForSquirrels(extraId){
    const extra=state.groceryExtras.find(x=>x.id===extraId); if(!extra)return;
    if(!state.squirrelQueue.some(x=>x.extraId===extraId)) state.squirrelQueue.push({id:uid(),extraId,name:extra.name,createdAt:new Date().toISOString(),status:'waiting-for-mts-bridge'});
    save();toast('Queued for Manage the Squirrels.','The PanCoon side is ready; the MTS receiving bridge is next.');
  }

  function changePlan(select,type){
    const day=type==='choice'?select.dataset.planChoice:select.dataset.planCook,kind=select.dataset.planKind||'dinner',key=`${day}:${kind}`;
    state.plan[key]||={choice:'',cook:'Unassigned'};
    if(type==='choice')state.plan[key].choice=select.value;else state.plan[key].cook=select.value;
    save();renderPlan();renderGrocery();
  }

  // Allows verified household records to refresh the current UI without erasing the open browser session.
  window.PanCoonReloadFromStorage = function(){
    state=load();
    renderPlan();renderRecipes();renderAllInventory();renderGrocery();
  };

  function start(){
    initializeKitchen(); inventoryFormOptions(); renderPlan();renderRecipes();renderAllInventory();renderGrocery();route((location.hash||'#plan').slice(1));
    window.addEventListener('pancoon:settings-changed',()=>{renderPlan();renderGrocery();route((location.hash||'#plan').slice(1));});

    document.addEventListener('click',event=>{
      const dayButton=event.target.closest('[data-select-plan-day]');
      if(dayButton){const fromOverview=dayButton.classList.contains('week-overview-row');if(dayButton.dataset.selectPlanDay!==selectedPlanDay){document.querySelector('#mealPlan .plan-edit[open]')?.removeAttribute('open');}selectedPlanDay=dayButton.dataset.selectPlanDay;renderPlan();if(fromOverview&&window.matchMedia('(max-width:760px)').matches)document.querySelector('.week-focus')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
      const nav=event.target.closest('[data-route]'); if(nav){event.preventDefault();return route(nav.dataset.route);}
      if(event.target.closest('#quickRecipeButton,#manualRecipeButton'))return openRecipeForm();
      if(event.target.closest('[data-close-dialog]'))return document.getElementById('recipeDialog').close();
      if(event.target.closest('[data-close-view]'))return document.getElementById('recipeViewDialog').close();
      const vr=event.target.closest('[data-view-recipe]');if(vr)return viewRecipe(state.recipes.find(r=>r.id===vr.dataset.viewRecipe));
      const er=event.target.closest('[data-edit-recipe]');if(er)return openRecipeForm(state.recipes.find(r=>r.id===er.dataset.editRecipe));
      const pr=event.target.closest('[data-print-recipe]');if(pr)return printRecipe(state.recipes.find(r=>r.id===pr.dataset.printRecipe));
      const em=event.target.closest('[data-email-recipe]');if(em)return emailRecipe(state.recipes.find(r=>r.id===em.dataset.emailRecipe));
      if(event.target.closest('#copyGrocery'))return copyGrocery();
      if(event.target.closest('#clearCompleted'))return clearCompleted();
      const sq=event.target.closest('[data-queue-squirrel]');if(sq){event.preventDefault();return queueForSquirrels(sq.dataset.queueSquirrel);}
      const st=event.target.closest('[data-inventory-status]');if(st){const kind=st.dataset.inventoryKind,item=state.inventories[kind].find(x=>x.id===st.dataset.inventoryStatus);if(item){item.status=st.dataset.status;save();renderInventory(kind);renderGrocery();}return;}
      const rm=event.target.closest('[data-remove-inventory]');if(rm){const kind=rm.dataset.inventoryKind;state.inventories[kind]=state.inventories[kind].filter(x=>x.id!==rm.dataset.removeInventory);save();renderInventory(kind);renderGrocery();return;}
    });

    document.addEventListener('change',event=>{
      if(event.target.matches('[data-plan-choice]'))return changePlan(event.target,'choice');
      if(event.target.matches('[data-plan-cook]'))return changePlan(event.target,'cook');
      if(event.target.matches('[data-grocery-check]')){const r=review(),key=event.target.dataset.groceryCheck;if(event.target.checked)r[key]=true;else delete r[key];save();renderGrocery();}
    });

    document.getElementById('recipeForm').addEventListener('submit',e=>{e.preventDefault();saveRecipeForm(e.currentTarget);});
    document.getElementById('recipeImportForm').addEventListener('submit',e=>{e.preventDefault();importRecipe(e.currentTarget);});
    document.getElementById('recipeSearch').addEventListener('input',renderRecipes);

    document.querySelectorAll('[data-inventory-form]').forEach(form=>form.addEventListener('submit',e=>{
      e.preventDefault(); const f=e.currentTarget,kind=f.dataset.inventoryForm;
      state.inventories[kind].push({id:uid(),name:f.elements.name.value.trim(),quantity:f.elements.quantity.value.trim(),status:f.elements.status.value,category:f.elements.category.value,location:f.elements.location?.value||INVENTORY_CONFIG[kind].locations[0]});
      save();f.reset();inventoryFormOptions();renderInventory(kind);renderGrocery();f.elements.name.focus();toast(`${INVENTORY_CONFIG[kind].label} updated.`);
    }));

    document.getElementById('groceryExtraForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget;state.groceryExtras.push({id:uid(),name:f.elements.name.value.trim(),createdAt:new Date().toISOString()});save();f.reset();renderGrocery();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();