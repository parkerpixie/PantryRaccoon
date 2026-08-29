(() => {
  'use strict';

  const STATE_KEY = 'pantry-raccoon:v1';
  const BACKUP_KEY = 'pantry-raccoon:v1:backup';
  const ZINES_KEY = 'pantry-raccoon:recipe-zines:v1';
  const LIBRARY_VERSION_KEY = 'pancoon:zine-library-version';
  const LIBRARY_VERSION = '2026-08-29-recovery-1';

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
    {id:'sheet-pan-gnocchi-sausage-kale', name:'Sheet Pan Gnocchi with Sausage and Kale', asset:'/assets/Sheet Pan Gnocchi with Sausage and Kale.jpg', awaitingSource:true},
    {id:'fishtown-feta-freakout', name:"Porter's Fishtown Feta Freakout", asset:"/assets/Porter's Fishtown Feta Freakout.png", awaitingSource:true},
    {id:'cherry-blossom-cutlet-quest', name:'Cherry Blossom Cutlet Quest', asset:'/assets/Cherry Blossom Cutlet Quest.png', awaitingSource:true},
    {id:'boardman-river-carnitas-caper', name:'Boardman River Carnitas Caper', asset:'/assets/Boardman River Carintas Caper.png', awaitingSource:true},
    {id:'sleeping-bear-dunes-steaks', name:'Sleeping Bear Dunes Steaks', asset:'/assets/Sleeping Bear Dunes Steaks.png', awaitingSource:true},
    {id:'beneath-building-50-haunted-garden-feast', name:'Beneath Building 50: Haunted Garden Feast', asset:'/assets/Beneath Building 50_ Haunted Garden Feast.png', awaitingSource:true}
  ];

  let openPlanDay = '';

  function readJson(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function writeJson(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

  function normalized(value){
    return String(value || '').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
  }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  }

  function recipeKey(recipe){
    if (recipe?.url) return `url:${normalized(recipe.url)}`;
    if (recipe?.id) return `id:${recipe.id}`;
    return `name:${normalized(recipe?.name)}`;
  }

  function mergeRecoveredRecipes(){
    const state = readJson(STATE_KEY, {});
    const backup = readJson(BACKUP_KEY, {});
    state.recipes = Array.isArray(state.recipes) ? state.recipes : [];
    const backupRecipes = Array.isArray(backup.recipes) ? backup.recipes : [];
    const seen = new Set(state.recipes.map(recipeKey));
    let changed = false;

    for (const recipe of backupRecipes){
      if (!recipe?.name) continue;
      const keys = [recipeKey(recipe), `name:${normalized(recipe.name)}`];
      if (keys.some(key => seen.has(key))) continue;
      state.recipes.push({...recipe, recoveredAt:new Date().toISOString()});
      keys.forEach(key => seen.add(key));
      changed = true;
    }

    if (changed) writeJson(STATE_KEY, state);
    return changed;
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

  function titleFromAsset(asset){
    const raw = decodeURIComponent(String(asset || '').split('/').pop() || '')
      .replace(/\.(png|jpe?g|webp)$/i,'')
      .replace(/[_-]+/g,' ')
      .trim();
    return raw || 'PanCoon Recipe Zine';
  }

  function ensureRecipeCards(){
    const state = readJson(STATE_KEY, {});
    const zines = readJson(ZINES_KEY, {});
    state.recipes = Array.isArray(state.recipes) ? state.recipes : [];
    let changed = false;

    for (const item of ZINE_LIBRARY){
      let recipe = state.recipes.find(entry => entry.id === item.id)
        || state.recipes.find(entry => normalized(entry.name) === normalized(item.name));

      if (!recipe){
        recipe = {
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
          notes:item.awaitingSource ? 'Recipe zine saved. Add or import the original recipe details when available.' : '',
          awaitingSource:!!item.awaitingSource,
          createdAt:new Date().toISOString(),
          updatedAt:new Date().toISOString()
        };
        state.recipes.push(recipe);
        changed = true;
      } else if (!recipe.sourceImageUrl){
        recipe.sourceImageUrl = item.asset;
        changed = true;
      }
    }

    for (const [id, asset] of Object.entries(zines)){
      if (state.recipes.some(recipe => recipe.id === id)) continue;
      state.recipes.push({
        id,
        name:titleFromAsset(asset),
        createdBy:'',
        category:'Dinner',
        servings:'',
        prepMinutes:0,
        cookMinutes:0,
        totalMinutes:0,
        url:'',
        sourceImageUrl:asset,
        ingredients:[],
        instructions:[],
        notes:'Recovered from an existing PanCoon recipe zine.',
        awaitingSource:true,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      });
      changed = true;
    }

    if (changed) writeJson(STATE_KEY, state);
    return changed;
  }

  function zineFor(recipeId){ return readJson(ZINES_KEY, {})[recipeId] || ''; }
  function recipeFor(recipeId){ return readJson(STATE_KEY, {}).recipes?.find(item => item.id === recipeId) || null; }

  function installStyles(){
    if (document.getElementById('pancoon-zine-recovery-styles')) return;
    const style = document.createElement('style');
    style.id = 'pancoon-zine-recovery-styles';
    style.textContent = `
      .zine-primary-view{max-width:min(920px,94vw)!important;padding:18px!important}
      .zine-primary-head{padding:2px 42px 12px 2px}
      .zine-primary-head h2{margin:.2rem 0 .3rem}
      .zine-primary-head p{margin:0;color:var(--muted,#746f76)}
      .zine-primary-art{display:flex;justify-content:center;background:#eee7df;border-radius:18px;padding:12px;overflow:auto}
      .zine-primary-art img{display:block;width:auto;max-width:100%;max-height:76vh;object-fit:contain;border-radius:10px;box-shadow:0 10px 28px rgba(45,35,39,.18)}
      .zine-primary-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px}
      @media(max-width:640px){.zine-primary-view{width:96vw!important;padding:10px!important}.zine-primary-art{padding:6px}.zine-primary-art img{max-height:none;width:100%;height:auto}.zine-primary-actions{display:grid;grid-template-columns:1fr;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function openZineView(recipeId){
    const src = zineFor(recipeId);
    if (!src) return false;
    const recipe = recipeFor(recipeId);
    const view = document.getElementById('recipeView');
    const dialog = document.getElementById('recipeViewDialog');
    if (!view || !dialog) return false;

    view.classList.add('zine-primary-view');
    view.innerHTML = `
      <button type="button" class="dialog-close" data-close-view aria-label="Close recipe">×</button>
      <div class="zine-primary-head">
        <p class="eyebrow">PanCoon recipe zine</p>
        <h2>${esc(recipe?.name || 'Recipe')}</h2>
        <p>The zine is attached to this recipe card.</p>
      </div>
      <div class="zine-primary-art"><img src="${esc(src)}" alt="${esc(recipe?.name || 'Recipe')} recipe zine"></div>
      <div class="zine-primary-actions"><button type="button" class="primary" data-zine-print="${esc(recipeId)}">Print Zine</button></div>`;
    if (!dialog.open) dialog.showModal();
    return true;
  }

  function printZine(recipeId){
    const src = zineFor(recipeId);
    if (!src) return;
    const recipe = recipeFor(recipeId);
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
    frame.srcdoc = `<!doctype html><html><head><title>${esc(title)}</title><style>@page{size:letter portrait;margin:.2in}html,body{margin:0;width:100%;height:100%;background:#fff}body{display:flex;align-items:center;justify-content:center}img{display:block;max-width:100%;max-height:10.6in;width:auto;height:auto;object-fit:contain}</style></head><body><img src="${new URL(src, location.origin).href}" alt="${esc(title)}"></body></html>`;
  }

  function reopenPlanEditor(){
    if (!openPlanDay) return;
    const select = document.querySelector(`[data-plan-choice="${CSS.escape(openPlanDay)}"]`)
      || document.querySelector(`[data-plan-cook="${CSS.escape(openPlanDay)}"]`);
    const details = select?.closest('details.plan-edit');
    if (details) details.open = true;
  }

  function keepPlanEditorOpen(event){
    const select = event.target.closest?.('[data-plan-choice],[data-plan-cook]');
    if (!select) return;
    openPlanDay = select.dataset.planChoice || select.dataset.planCook || '';
    setTimeout(reopenPlanEditor, 0);
  }

  function observePlanRenders(){
    const plan = document.getElementById('mealPlan');
    if (!plan) return;
    new MutationObserver(() => reopenPlanEditor()).observe(plan,{childList:true,subtree:true});
  }

  function start(){
    installStyles();
    const recovered = mergeRecoveredRecipes();
    const zinesChanged = ensureRecipeZines();
    const cardsChanged = ensureRecipeCards();

    if ((recovered || zinesChanged || cardsChanged) && sessionStorage.getItem(LIBRARY_VERSION_KEY) !== LIBRARY_VERSION){
      sessionStorage.setItem(LIBRARY_VERSION_KEY, LIBRARY_VERSION);
      sessionStorage.setItem('pancoon:show-recipes-after-reload','1');
      location.reload();
      return;
    }

    if (sessionStorage.getItem('pancoon:show-recipes-after-reload') === '1'){
      sessionStorage.removeItem('pancoon:show-recipes-after-reload');
      location.hash = 'recipes';
    }

    observePlanRenders();
    document.addEventListener('change', keepPlanEditorOpen, false);

    document.addEventListener('click', event => {
      const view = event.target.closest('[data-view-recipe]');
      if (view && zineFor(view.dataset.viewRecipe)){
        event.preventDefault();
        event.stopImmediatePropagation();
        openZineView(view.dataset.viewRecipe);
        return;
      }

      const open = event.target.closest('[data-open-zine]');
      if (open && zineFor(open.dataset.openZine)){
        event.preventDefault();
        event.stopImmediatePropagation();
        openZineView(open.dataset.openZine);
        return;
      }

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