(() => {
  'use strict';

  const STORAGE_KEY = 'pantry-raccoon:v1';
  const SEED_VERSION = 3;
  const PLAN_SEED_VERSION = 2;
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

  const SEED_RECIPES = [
    {
      id:'beef-ragu',name:'Slow Cooked Shredded Beef Ragu Pasta',createdBy:'Nagi | RecipeTin Eats',category:'Dinner',
      servings:'5–6 with pasta',prepMinutes:20,cookMinutes:150,totalMinutes:170,
      url:'https://www.recipetineats.com/slow-cooked-shredded-beef-ragu-pasta/',
      ingredients:['2.5 lb chuck beef, divided into 4 large pieces','1 tbsp salt','Black pepper, to taste','3 tbsp olive oil, divided','3 garlic cloves, minced','1 onion, diced','1 cup diced carrots','1 cup diced celery','28 oz crushed tomatoes','3 tbsp tomato paste','2 beef bouillon cubes, crumbled','1 cup full-bodied red wine or beef broth/stock','1 1/2 cups water for stovetop method','3/4 tsp dried thyme or 3 fresh thyme sprigs','3 dried bay leaves','1 lb dried pappardelle or another wide pasta','Freshly grated Parmesan, for serving','Fresh parsley, finely chopped, optional'],
      instructions:['Pat the beef dry and season with salt and pepper.','Brown the beef aggressively in olive oil, then transfer to a plate.','Cook garlic and onion, then carrots and celery, until softened.','Add tomatoes, tomato paste, bouillon, wine or broth, water, thyme, and bay leaves. Return beef to the pot.','Cover and simmer gently about 2 hours, until the beef pulls apart easily.','Shred the beef and return it to the sauce. Simmer uncovered about 30 minutes until rich and thick.','Cook pappardelle just shy of done, reserving pasta water.','Toss pasta with hot ragu and enough pasta water for the sauce to cling. Serve with Parmesan and parsley.'],
      notes:'Slow cooker option: sear beef and cook the soffritto first. Transfer to slow cooker with remaining ragu ingredients, leaving out the water. Cook LOW 6–8 hours, shred, then reduce sauce if needed.'
    },
    {
      id:'chicken-shawarma-sheet-pan',name:'Chicken Shawarma Sheet Pan Dinner',createdBy:'The Modern Proper',category:'Dinner',
      servings:'6',prepMinutes:20,cookMinutes:25,totalMinutes:45,
      url:'https://themodernproper.com/print/chicken-shawarma-sheet-pan-dinner',
      ingredients:['1 cup plain Greek yogurt','2 teaspoons ground cumin','1 teaspoon ground cardamom','2 teaspoons ground turmeric','2 teaspoons ground cinnamon','2 teaspoons kosher salt','2 pounds boneless, skinless chicken breasts, cut into 1-inch strips','2 tablespoons extra-virgin olive oil','1 red onion, cut into 1/2-inch thick slices','2 large red bell peppers, cut into 1/2-inch thin strips','1/2 cup peppadew peppers, drained','1 cup tahini','4 garlic cloves, minced','1/3 cup extra-virgin olive oil','1/2 cup fresh lemon juice (from 3 lemons)','1/2 teaspoon kosher salt','4 to 8 pita breads, warmed','1/2 English cucumber, diced','1 Roma tomato, sliced','Minced fresh flat leaf parsley'],
      instructions:['Preheat the oven to 350°F with a rack in the center position.','In a large bowl, combine the yogurt, cumin, cardamom, turmeric, cinnamon, and salt. Add the chicken and toss until fully coated.','Spread 1 tablespoon olive oil on a large rimmed sheet pan. Arrange the chicken, onion, bell peppers, and peppadews on the pan. Drizzle with the remaining tablespoon olive oil and bake about 20 minutes, until the chicken is cooked through and the vegetables are tender.','While the chicken cooks, whisk the tahini, garlic, olive oil, lemon juice, salt, and 2/3 cup water until smooth.','Fill warmed pitas with the chicken and vegetables. Top with cucumber, tomato, tahini sauce, and parsley.'],
      notes:'Blake is making this for Saturday dinner.'
    },
    {
      id:'porter-sunshine-salad',name:'Chicken Apple Sunshine Salad',createdBy:'Porter',category:'Dinner',
      servings:'3',prepMinutes:15,cookMinutes:15,totalMinutes:30,
      ingredients:['1 large container mixed greens','1 1/2 pounds chicken breasts, grilled and sliced','1 green apple, chopped or thinly sliced','1 cucumber, chopped','2 tomatoes, chopped','1 cup shredded carrots','1/2 cup blue cheese crumbles','1/3 cup sunflower seeds',"Dressing of each person's choice"],
      instructions:['Grill or warm the chicken and slice it.','Divide mixed greens among bowls.','Add green apple, cucumber, tomato, and carrots.','Top with chicken, blue cheese, and sunflower seeds.','Serve with dressing choices.'],
      notes:'Same salad as last week, specifically green apple this time.'
    },
    {id:'blake-tacos',name:"Blake's Taco Night",createdBy:'Blake',category:'Dinner',servings:'3',prepMinutes:15,cookMinutes:20,totalMinutes:35,ingredients:["Taco protein for Blake's usual taco night",'Taco seasoning','Taco shells or tortillas','Shredded lettuce','Tomatoes','Taco toppings of choice'],instructions:['Prepare the taco filling using Blake’s usual method.','Warm shells or tortillas.','Set out toppings and build tacos.']},
    {id:'freezer-butter-chicken',name:'Freezer Butter Chicken with Rice',createdBy:'Parker',category:'Dinner',servings:'3',prepMinutes:5,cookMinutes:25,totalMinutes:30,ingredients:['1 freezer butter chicken meal','Rice, enough for 3 servings'],instructions:['Heat the freezer butter chicken according to package or freezer-label directions.','Cook rice while it heats.','Serve butter chicken over rice.']},
    {id:'crispy-chicken-cutlets',name:'Crispy Chicken Cutlets with Buttered Noodles & Broccoli',createdBy:'The Mediterranean Dish + Talbot sides',category:'Dinner',servings:'4 cutlets',prepMinutes:20,cookMinutes:10,totalMinutes:30,url:'https://www.themediterraneandish.com/breaded-chicken-cutlets/',ingredients:['4 chicken cutlets or 2 boneless skinless chicken breasts','Kosher salt','Black pepper','1/2 cup all-purpose flour','2 large eggs','1 cup unseasoned breadcrumbs or Panko','1/2 cup grated Parmesan','2 teaspoons Italian seasoning','Extra virgin olive oil, for frying','Lemon wedges, for serving','Buttered noodles, for serving','Broccoli, for serving'],instructions:['Season chicken with salt and pepper.','Set up flour, beaten eggs, and breadcrumbs mixed with Parmesan and Italian seasoning.','Coat chicken in flour, egg, then breadcrumbs. Rest about 10 minutes.','Pan-fry until crisp and golden, about 3 minutes per side.','Serve with lemon wedges, buttered noodles, and broccoli.']}
  ];

  let state = load();
  let toastTimer;

  function freshState(){
    return {
      version:3, recipes:[], plan:{}, inventories:{pantry:[],fridge:[],freezer:[]},
      groceryReview:{}, groceryDismissed:{}, groceryExtras:[], squirrelQueue:[],
      seedVersion:0, planSeedVersion:0
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
  function fridayStart(now=new Date()){ const d=new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate()-((d.getDay()-5+7)%7)); return d; }
  function weekDates(){ const s=fridayStart(); return Array.from({length:8},(_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);return d;}); }
  function weekKey(){ return dateKey(weekDates()[0]); }
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

  function ensureSeeds(){
    migrate();
    if(Number(state.seedVersion||0)<SEED_VERSION){
      for(const seed of SEED_RECIPES){
        const existing=state.recipes.find(r=>r.id===seed.id || (r.url&&seed.url&&r.url===seed.url));
        if(!existing) state.recipes.push({...seed,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      }
      state.seedVersion=SEED_VERSION;
    }
    if(Number(state.planSeedVersion||0)<PLAN_SEED_VERSION){
      state.plan['2026-08-08:lunch'] ||= {choice:'special:out',cook:'Nobody'};
      state.plan['2026-08-09:lunch'] ||= {choice:'special:leftovers',cook:'Nobody'};
      const sat=state.plan['2026-08-08:dinner'];
      if(!sat || sat.choice==='special:out') state.plan['2026-08-08:dinner']={choice:'recipe:chicken-shawarma-sheet-pan',cook:'Blake'};
      state.plan['2026-08-09:dinner'] ||= {choice:'recipe:beef-ragu',cook:'Parker'};
      state.plan['2026-08-10:dinner'] ||= {choice:'recipe:porter-sunshine-salad',cook:'Porter'};
      state.plan['2026-08-11:dinner'] ||= {choice:'recipe:blake-tacos',cook:'Blake'};
      state.plan['2026-08-12:dinner'] ||= {choice:'recipe:freezer-butter-chicken',cook:'Parker'};
      state.plan['2026-08-13:dinner'] ||= {choice:'recipe:crispy-chicken-cutlets',cook:'Parker'};
      state.planSeedVersion=PLAN_SEED_VERSION;
    }
    save();
  }

  function route(name){
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===name));
    document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.route===name));
    const meta={
      plan:['This week','Friday through Friday. Weekend lunches included.'],
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
  function cookOptions(selected=''){ return ['Unassigned','Parker','Blake','Porter','Nobody'].map(v=>`<option ${selected===v?'selected':''}>${v}</option>`).join(''); }

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

  function renderPlan(){
    const dates=weekDates(), today=dateKey(new Date());
    document.getElementById('weekRange').textContent=`${fmt(dates[0],{month:'short',day:'numeric'})} → ${fmt(dates[7],{month:'short',day:'numeric'})}`;
    document.getElementById('mealPlan').innerHTML=dates.map(date=>{
      const day=dateKey(date), weekend=[0,6].includes(date.getDay());
      const dinner=state.plan[`${day}:dinner`]||{choice:'',cook:'Unassigned'};
      const lunch=state.plan[`${day}:lunch`]||{choice:'',cook:'Nobody'};
      return `<article class="meal-day ${day===today?'today':''}">
        <div class="meal-date"><strong>${fmt(date,{weekday:'long'})}</strong><span>${fmt(date,{month:'short',day:'numeric'})}</span></div>
        <div class="day-meals">${weekend?mealDisplay(day,'lunch'):''}${mealDisplay(day,'dinner')}</div>
        <details class="plan-edit"><summary>Edit plan</summary>
          ${weekend?`<label>Lunch<select data-plan-choice="${day}" data-plan-kind="lunch">${choiceOptions(lunch.choice,'lunch')}</select></label>`:''}
          <label>Dinner<select data-plan-choice="${day}" data-plan-kind="dinner">${choiceOptions(dinner.choice,'dinner')}</select></label>
          <label>Cook<select data-plan-cook="${day}" data-plan-kind="dinner">${cookOptions(dinner.cook||'Unassigned')}</select></label>
        </details>
      </article>`;
    }).join('');
  }

  function renderRecipes(){
    const q=(document.getElementById('recipeSearch')?.value||'').trim().toLowerCase();
    const list=[...state.recipes].filter(r=>!q||[r.name,r.createdBy,r.category].some(v=>String(v||'').toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name));
    document.getElementById('recipeShelf').innerHTML=list.length?list.map(r=>`<article class="recipe-card">
      <div class="recipe-card-image">${r.sourceImageUrl?`<img src="${esc(r.sourceImageUrl)}" alt="">`:'<span>🍲</span>'}</div>
      <div class="recipe-card-copy"><p class="eyebrow">${esc(r.category||'Recipe')}</p><h3>${esc(r.name)}</h3><p>${r.createdBy?`By ${esc(r.createdBy)} · `:''}${r.totalMinutes||'?'} min · ${(r.ingredients||[]).length} ingredients</p>
      <div class="recipe-card-actions"><button data-view-recipe="${esc(r.id)}">View</button><button data-edit-recipe="${esc(r.id)}">Edit</button><button data-print-recipe="${esc(r.id)}">Print</button><button data-email-recipe="${esc(r.id)}">Email</button>${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">Source</a>`:''}</div></div>
    </article>`).join(''):'<div class="empty">No recipes match.</div>';
  }

  function openRecipeForm(recipe=null){
    const f=document.getElementById('recipeForm'); f.reset();
    f.elements.id.value=recipe?.id||''; f.elements.name.value=recipe?.name||''; f.elements.createdBy.value=recipe?.createdBy||'';
    f.elements.prepMinutes.value=recipe?.prepMinutes||0; f.elements.cookMinutes.value=recipe?.cookMinutes||0; f.elements.servings.value=recipe?.servings||'';
    f.elements.url.value=recipe?.url||''; f.elements.ingredients.value=(recipe?.ingredients||[]).join('\n'); f.elements.instructions.value=(recipe?.instructions||[]).join('\n'); f.elements.notes.value=recipe?.notes||'';
    document.getElementById('recipeDialogTitle').textContent=recipe?`Edit ${recipe.name}`:'Add family recipe'; document.getElementById('recipeDialog').showModal();
  }
  function saveRecipeForm(form){
    const existing=state.recipes.find(r=>r.id===form.elements.id.value);
    const recipe={...(existing||{}),id:existing?.id||uid(),name:form.elements.name.value.trim(),createdBy:form.elements.createdBy.value.trim(),category:existing?.category||'Dinner',
      prepMinutes:Number(form.elements.prepMinutes.value)||0,cookMinutes:Number(form.elements.cookMinutes.value)||0,servings:form.elements.servings.value.trim(),url:form.elements.url.value.trim(),
      ingredients:lines(form.elements.ingredients.value),instructions:lines(form.elements.instructions.value),notes:form.elements.notes.value.trim(),updatedAt:new Date().toISOString(),createdAt:existing?.createdAt||new Date().toISOString()};
    recipe.totalMinutes=recipe.prepMinutes+recipe.cookMinutes||existing?.totalMinutes||0;
    state.recipes=[recipe,...state.recipes.filter(r=>r.id!==recipe.id)]; save(); form.closest('dialog').close(); renderRecipes(); renderPlan(); renderGrocery(); toast('Recipe saved.',recipe.name);
  }
  function viewRecipe(recipe){
    if(!recipe)return;
    document.getElementById('recipeView').innerHTML=`<button type="button" class="dialog-close" data-close-view>×</button><p class="eyebrow">${esc(recipe.category||'Recipe')}</p><h2>${esc(recipe.name)}</h2><p>${recipe.createdBy?`By ${esc(recipe.createdBy)} · `:''}${recipe.servings?`Serves ${esc(recipe.servings)} · `:''}${recipe.totalMinutes||'?'} minutes</p>
      <div class="recipe-columns"><section><h3>Ingredients</h3><ul>${(recipe.ingredients||[]).map(v=>`<li>${esc(v)}</li>`).join('')}</ul></section><section><h3>Instructions</h3><ol>${(recipe.instructions||[]).map(v=>`<li>${esc(v)}</li>`).join('')}</ol></section></div>
      ${recipe.notes?`<p><strong>Notes:</strong> ${esc(recipe.notes)}</p>`:''}<div class="button-row recipe-view-actions"><button class="primary" data-print-recipe="${esc(recipe.id)}">Print</button><button class="secondary" data-email-recipe="${esc(recipe.id)}">Email</button>${recipe.url?`<a class="secondary" href="${esc(recipe.url)}" target="_blank" rel="noopener">Original recipe</a>`:''}</div>`;
    document.getElementById('recipeViewDialog').showModal();
  }
  function printRecipe(recipe){ if(!recipe)return; viewRecipe(recipe); setTimeout(()=>window.print(),80); }
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
    const entries=[]; for(const date of weekDates()){const day=dateKey(date);for(const kind of ['lunch','dinner']){const recipe=recipeForChoice(state.plan[`${day}:${kind}`]?.choice);if(recipe)entries.push({date,kind,recipe});}} return entries;
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
    state.plan[key]||={choice:'',cook:kind==='dinner'?'Unassigned':'Nobody'};
    if(type==='choice')state.plan[key].choice=select.value;else state.plan[key].cook=select.value;
    save();renderPlan();renderGrocery();
  }

  function start(){
    ensureSeeds(); inventoryFormOptions(); renderPlan();renderRecipes();renderAllInventory();renderGrocery();route((location.hash||'#plan').slice(1));

    document.addEventListener('click',event=>{
      const nav=event.target.closest('[data-route]'); if(nav)return route(nav.dataset.route);
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