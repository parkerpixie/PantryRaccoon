(() => {
  'use strict';

  const STATE_KEY = 'pantry-raccoon:v1';
  const ZINES_KEY = 'pantry-raccoon:recipe-zines:v1';
  const LIBRARY_VERSION_KEY = 'pancoon:zine-library-version';
  const LIBRARY_VERSION = '2026-08-10-9';

  const ZINE_LIBRARY = [
    {id:'porter-sunshine-salad', name:'Chicken Apple Sunshine Salad', asset:'/assets/Chicken Apple Sunshine Salad.png'},
    {id:'blake-tacos', name:"Blake's Taco Tuesday", asset:'/assets/ChatGPT Image Aug 10, 2026, 07_40_15 PM.png'},
    {id:'chicken-shawarma-sheet-pan', name:'Chicken Shawarma Sheet Pan Dinner', asset:'/assets/Chicken Shawrma Sheet Pan Dinner.png'},

    {id:'broccoli-chicken-stir-fry', name:'Broccoli and Chicken Stir Fry', asset:'/assets/Broccoli and Chicken Stir Fry.jpg', awaitingSource:true},
    {id:'celestial-french-dip', name:'Celestial French Dip', asset:'/assets/Celestial Frech Dip.jpg', awaitingSource:true},
    {id:'creamy-one-pan-chicken-potatoes', name:'Creamy One Pan Chicken and Potatoes', asset:'/assets/Creamy One Pan Chicken and Potatoes.jpg', awaitingSource:true},
    {id:'egg-roll-in-a-bowl', name:'Egg Roll in a Bowl', asset:'/assets/Egg Roll in a Bowl.jpg', awaitingSource:true},
    {id:'greek-chicken-rice-bowls', name:'Greek Chicken Rice Bowls', asset:'/assets/Greek Chicken Rice Bowls.jpg', awaitingSource:true},
    {id:'grilled-pizza', name:'Grilled Pizza', asset:'/assets/Grilled Pizza.jpg', awaitingSource:true},
    {id:'peachy-grilled-pizza', name:'Peachy Grilled Pizza', asset:'/assets/Peachy Grilled Pizza.jpg', awaitingSource:true},
    {id:'roasted-turkey-breast', name:'Roasted Turkey Breast', asset:'/assets/Roasted Turkey Breast.jpg', awaitingSource:true},
    {id:'sheet-pan-gnocchi-sausage-kale', name:'Sheet Pan Gnocchi with Sausage and Kale', asset:'/assets/Sheet Pan Gnocchi with Sausage and Kale.jpg', awaitingSource:true}
  ];

  const NEW_RECIPE_IDS = new Set(ZINE_LIBRARY.filter(item => item.awaitingSource).map(item => item.id));

  function readJson(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function writeJson(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureRecipeZines(){
    const zines = readJson(ZINES_KEY, {});
    let changed = false;
    for (const item of ZINE_LIBRARY){
      if (zines[item.id] !== item.asset){
        zines[item.id] = item.asset;
        changed = true;
      }
    }
    if (changed) writeJson(ZINES_KEY, zines);
    return changed;
  }

  function ensureRecipeCards(){
    const state = readJson(STATE_KEY, {});
    state.recipes = Array.isArray(state.recipes) ? state.recipes : [];
    let changed = false;

    for (const item of ZINE_LIBRARY.filter(entry => entry.awaitingSource)){
      let recipe = state.recipes.find(entry => entry.id === item.id);
      if (!recipe){
        recipe = state.recipes.find(entry => String(entry.name || '').trim().toLowerCase() === item.name.toLowerCase());
      }

      if (!recipe){
        state.recipes.push({
          id:item.id,
          name:item.name,
          createdBy:'',
          category:'Dinner',
          servings:'',
          prepMinutes:0,
          cookMinutes:0,
          totalMinutes:0,
          url:'',
          sourceImageUrl:item.asset,
          ingredients:[],
          instructions:[],
          notes:'Recipe zine saved. Add the original recipe URL to fill in the simple recipe details.',
          awaitingSource:true,
          createdAt:new Date().toISOString(),
          updatedAt:new Date().toISOString()
        });
        changed = true;
      } else {
        if (!recipe.sourceImageUrl){ recipe.sourceImageUrl = item.asset; changed = true; }
        if (!recipe.url && !recipe.ingredients?.length){ recipe.awaitingSource = true; changed = true; }
      }
    }

    if (changed) writeJson(STATE_KEY, state);
    return changed;
  }

  function ensureBlakeTacoRecipe(){
    const state = readJson(STATE_KEY, {});
    state.recipes = Array.isArray(state.recipes) ? state.recipes : [];
    const recipe = state.recipes.find(item => item.id === 'blake-tacos');
    const details = {
      id:'blake-tacos',
      name:"Blake's Taco Tuesday",
      createdBy:'Blake',
      category:'Dinner',
      servings:'3–4',
      prepMinutes:10,
      cookMinutes:20,
      totalMinutes:30,
      ingredients:[
        '1 lb ground beef',
        '1 packet taco seasoning or 2 tbsp homemade taco seasoning',
        '3/4 cup water',
        '8–10 taco shells, hard or soft',
        '1 cup shredded lettuce',
        '1 cup diced tomatoes',
        '1 cup shredded cheese',
        '1/2 cup diced onions',
        '1/2 cup sour cream',
        'Salsa, to taste',
        'Hot sauce, to taste'
      ],
      instructions:[
        'Brown the ground beef in a large skillet over medium heat until no longer pink. Drain excess fat.',
        'Add taco seasoning and water. Stir and simmer for about 5 minutes, until thickened.',
        'Warm taco shells or tortillas.',
        'Fill with seasoned beef and add favorite toppings.'
      ],
      notes:'Taco Tuesday. The Jinx edition.'
    };
    if (recipe) Object.assign(recipe, details, {updatedAt:new Date().toISOString()});
    else state.recipes.push({...details,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    state.plan = state.plan && typeof state.plan === 'object' ? state.plan : {};
    state.plan['2026-08-11:dinner'] = {choice:'recipe:blake-tacos',cook:'Blake'};
    writeJson(STATE_KEY, state);
  }

  function zineFor(recipeId){
    return readJson(ZINES_KEY, {})[recipeId] || '';
  }

  function printZine(recipeId){
    const src = zineFor(recipeId);
    if (!src) return;
    const recipe = readJson(STATE_KEY, {}).recipes?.find(item => item.id === recipeId);
    const title = `${recipe?.name || 'PanCoon Recipe'} Zine`;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden','true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(frame);
    frame.onload = () => {
      const run = () => {
        try { frame.contentWindow?.focus(); frame.contentWindow?.print(); }
        finally { setTimeout(() => frame.remove(), 1600); }
      };
      const image = frame.contentDocument?.querySelector('img');
      if (image?.complete) run(); else if (image) image.onload = run; else run();
    };
    frame.srcdoc = `<!doctype html><html><head><title>${title}</title><style>@page{size:letter portrait;margin:.2in}html,body{margin:0;width:100%;height:100%;background:#fff}body{display:flex;align-items:center;justify-content:center}img{display:block;max-width:100%;max-height:10.6in;width:auto;height:auto;object-fit:contain}</style></head><body><img src="${new URL(src, location.origin).href}" alt="${title}"></body></html>`;
  }

  function addPrintAction(recipeId){
    const view = document.getElementById('recipeView');
    if (!view || !zineFor(recipeId)) return;
    const actions = view.querySelector('.recipe-view-actions');
    if (!actions || actions.querySelector(`[data-zine-print="${recipeId}"]`)) return;
    const print = document.createElement('button');
    print.type = 'button';
    print.className = 'primary';
    print.dataset.zinePrint = recipeId;
    print.textContent = 'Print Zine';
    actions.prepend(print);
  }

  function installImportTarget(){
    const form = document.getElementById('recipeImportForm');
    if (!form || form.querySelector('[name="targetRecipeId"]')) return;

    const state = readJson(STATE_KEY, {});
    const pending = (state.recipes || [])
      .filter(recipe => NEW_RECIPE_IDS.has(recipe.id) && (!recipe.url || recipe.awaitingSource))
      .sort((a,b) => a.name.localeCompare(b.name));

    if (!pending.length) return;

    const label = document.createElement('label');
    label.className = 'zine-import-target';
    label.innerHTML = `<span>Fill an existing zine recipe</span><select name="targetRecipeId"><option value="">Create a new recipe</option>${pending.map(recipe => `<option value="${recipe.id}">${recipe.name}</option>`).join('')}</select>`;
    const button = form.querySelector('button[type="submit"]');
    form.insertBefore(label, button);

    const hint = document.getElementById('importStatus');
    if (hint) hint.textContent = 'Paste the original recipe URL, then choose a saved zine recipe to fill that card instead of creating a duplicate.';
  }

  async function fillExistingRecipeFromUrl(event){
    const form = event.target.closest?.('#recipeImportForm');
    if (!form) return;
    const targetId = form.elements.targetRecipeId?.value;
    if (!targetId) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const input = form.elements.recipeUrl;
    const status = document.getElementById('importStatus');
    const button = form.querySelector('button[type="submit"]');
    let url;
    try {
      url = new URL(input.value.trim());
      if (url.protocol !== 'https:') throw new Error();
    } catch {
      if (status) status.textContent = 'Paste a full HTTPS recipe link.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Reading recipe…';
    if (status) status.textContent = 'The raccoon is filling your saved zine card…';

    try {
      const response = await fetch(`/api/recipe-context?url=${encodeURIComponent(url.href)}`, {cache:'no-store'});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Recipe import failed.');

      const state = readJson(STATE_KEY, {});
      state.recipes = Array.isArray(state.recipes) ? state.recipes : [];
      const recipe = state.recipes.find(item => item.id === targetId);
      if (!recipe) throw new Error('That saved zine recipe could not be found.');

      const zine = zineFor(targetId);
      Object.assign(recipe, {
        category:form.elements.category?.value || recipe.category || 'Dinner',
        prepMinutes:Number(data.prepMinutes) || 0,
        cookMinutes:Number(data.cookMinutes) || 0,
        totalMinutes:Number(data.totalMinutes) || Number(data.prepMinutes || 0) + Number(data.cookMinutes || 0),
        servings:data.servings || '',
        ingredients:Array.isArray(data.ingredients) ? data.ingredients : [],
        instructions:Array.isArray(data.instructions) ? data.instructions : [],
        sourceImageUrl:zine || recipe.sourceImageUrl || data.imageUrl || '',
        url:data.sourceUrl || url.href,
        notes:'',
        awaitingSource:false,
        updatedAt:new Date().toISOString()
      });

      writeJson(STATE_KEY, state);
      input.value = '';
      form.elements.targetRecipeId.value = '';
      if (status) status.textContent = `Filled ${recipe.name} with ${recipe.ingredients.length} ingredients.`;
      sessionStorage.setItem('pancoon:show-recipes-after-reload','1');
      location.reload();
    } catch (error){
      if (status) status.textContent = error.message || 'The recipe site could not be read.';
      button.disabled = false;
      button.textContent = 'Create recipe from URL';
    }
  }

  function openRecipesAfterReload(){
    if (sessionStorage.getItem('pancoon:show-recipes-after-reload') !== '1') return;
    sessionStorage.removeItem('pancoon:show-recipes-after-reload');
    location.hash = 'recipes';
  }

  function start(){
    const zinesChanged = ensureRecipeZines();
    ensureBlakeTacoRecipe();
    const cardsChanged = ensureRecipeCards();

    if ((zinesChanged || cardsChanged) && sessionStorage.getItem(LIBRARY_VERSION_KEY) !== LIBRARY_VERSION){
      sessionStorage.setItem(LIBRARY_VERSION_KEY, LIBRARY_VERSION);
      sessionStorage.setItem('pancoon:show-recipes-after-reload','1');
      location.reload();
      return;
    }

    openRecipesAfterReload();
    installImportTarget();

    document.addEventListener('submit', fillExistingRecipeFromUrl, true);

    document.addEventListener('click', event => {
      const view = event.target.closest('[data-view-recipe]');
      if (view && zineFor(view.dataset.viewRecipe)) setTimeout(() => addPrintAction(view.dataset.viewRecipe), 0);

      const printRecipe = event.target.closest('[data-print-recipe]');
      if (printRecipe && zineFor(printRecipe.dataset.printRecipe)){
        event.preventDefault();
        event.stopImmediatePropagation();
        printZine(printRecipe.dataset.printRecipe);
        return;
      }

      const zinePrint = event.target.closest('[data-zine-print]');
      if (zinePrint){
        event.preventDefault();
        event.stopImmediatePropagation();
        printZine(zinePrint.dataset.zinePrint);
      }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
