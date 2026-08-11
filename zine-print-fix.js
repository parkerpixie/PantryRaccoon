(() => {
  'use strict';

  const STATE_KEY = 'pantry-raccoon:v1';
  const ZINES_KEY = 'pantry-raccoon:recipe-zines:v1';
  const PORTER_RECIPE_ID = 'porter-sunshine-salad';
  const PORTER_ZINE = '/assets/Chicken Apple Sunshine Salad.png';
  const BLAKE_RECIPE_ID = 'blake-tacos';
  const BLAKE_ZINE = '/assets/ChatGPT Image Aug 10, 2026, 07_40_15 PM.png';

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
    if (zines[PORTER_RECIPE_ID] !== PORTER_ZINE){ zines[PORTER_RECIPE_ID] = PORTER_ZINE; changed = true; }
    if (zines[BLAKE_RECIPE_ID] !== BLAKE_ZINE){ zines[BLAKE_RECIPE_ID] = BLAKE_ZINE; changed = true; }
    if (changed) writeJson(ZINES_KEY, zines);
  }

  function ensureBlakeTacoRecipe(){
    const state = readJson(STATE_KEY, {});
    state.recipes = Array.isArray(state.recipes) ? state.recipes : [];
    const recipe = state.recipes.find(item => item.id === BLAKE_RECIPE_ID);
    const details = {
      id:BLAKE_RECIPE_ID,
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
        'Fill with seasoned beef and add favorite toppings. Eat. Repeat. No further questions.'
      ],
      notes:'Taco Tuesday. The Jinx edition.'
    };
    if (recipe) Object.assign(recipe, details, {updatedAt:new Date().toISOString()});
    else state.recipes.push({...details,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    state.plan = state.plan && typeof state.plan === 'object' ? state.plan : {};
    state.plan['2026-08-11:dinner'] = {choice:`recipe:${BLAKE_RECIPE_ID}`,cook:'Blake'};
    writeJson(STATE_KEY, state);
  }

  function printZine(recipeId){
    const zines = readJson(ZINES_KEY, {});
    const src = zines[recipeId];
    if (!src) return;
    const title = recipeId === BLAKE_RECIPE_ID ? 'Blake Taco Tuesday The Jinx Zine' : 'Chicken Apple Sunshine Salad Zine';
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
    if (!view) return;
    const action = view.querySelector(`[data-print-recipe="${recipeId}"], [data-email-recipe="${recipeId}"]`);
    if (!action) return;
    const actions = view.querySelector('.recipe-view-actions');
    if (!actions || actions.querySelector(`[data-zine-print="${recipeId}"]`)) return;
    const print = document.createElement('button');
    print.type = 'button';
    print.className = 'primary';
    print.dataset.zinePrint = recipeId;
    print.textContent = 'Print Zine';
    actions.prepend(print);
  }

  function start(){
    ensureRecipeZines();
    ensureBlakeTacoRecipe();

    document.addEventListener('click', event => {
      const view = event.target.closest('[data-view-recipe]');
      if (view && [PORTER_RECIPE_ID,BLAKE_RECIPE_ID].includes(view.dataset.viewRecipe)) setTimeout(() => addPrintAction(view.dataset.viewRecipe), 0);

      const printRecipe = event.target.closest('[data-print-recipe]');
      if (printRecipe && [PORTER_RECIPE_ID,BLAKE_RECIPE_ID].includes(printRecipe.dataset.printRecipe)){
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
