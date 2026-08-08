(() => {
  'use strict';

  const STORAGE_KEY = 'pantry-raccoon:v1';
  const ASSETS = {
    desktopHero: '/assets/Home%20Page%20Dinner%20Landscape-Raccon%20on%20left.png',
    mobileHero: '/assets/Mobile%20Experience%20Home%20Page%20Dinner%20Portrait-Raccoon%20on%20Top.png',
    kitchen: '/assets/Talbot%20kitchen%20with%20Luna%20and%20Ozzy.png',
    mixer: '/assets/Pink%20Kitchaid%20mixer%20with%20cutting%20board%20and%20utensials.png',
    mushroom: '/assets/Mushroom%20Detail.png'
  };

  const ZINES = {
    'chicken-shawarma-sheet-pan': {
      src: '/assets/Chicken%20Shawrma%20Sheet%20Pan%20Dinner.png',
      filename: 'Chicken-Shawarma-Sheet-Pan-Dinner-PanCoon-Zine.png'
    }
  };

  const SPECIALS = {
    'special:out': {name:'Go out to Eat', note:'No ingredients. No prep. Everybody wins.'},
    'special:leftovers': {name:'Leftovers', note:'Use what is already cooked.'},
    'special:freezer': {name:'Freezer / Heat & Eat', note:'A deliberately easy meal.'},
    'special:undecided': {name:'Undecided', note:'Future you can solve this one.'}
  };

  const CSS = `
    .dinner-hero{position:relative;padding:0!important;overflow:hidden;min-height:0!important;aspect-ratio:3/2;background:#efe4d6;border-radius:28px!important;isolation:isolate}
    .dinner-hero-art,.dinner-hero-art img{position:absolute;inset:0;width:100%;height:100%;display:block}
    .dinner-hero-art img{object-fit:cover}
    .dinner-hero-content{position:absolute;z-index:2;left:31%;top:13%;width:63%;height:73%;display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,28%);gap:18px;align-items:center;padding:1.5% 2.5% 1.5% 4%}
    .dinner-hero-copy{text-align:center;min-width:0}
    .dinner-hero-kicker{margin:0 0 8px;color:var(--coral);font-family:Georgia,serif;font-style:italic;font-weight:700;font-size:clamp(15px,1.8vw,24px)}
    .dinner-hero-title{margin:0;color:#2b2930;font-family:Georgia,serif;font-size:clamp(25px,3.35vw,49px);line-height:.98;letter-spacing:-.035em;text-wrap:balance}
    .dinner-hero-cook{display:flex;align-items:center;justify-content:center;gap:7px;margin:13px 0 0;color:#4c6661;font-size:clamp(12px,1.15vw,16px);font-weight:750}
    .dinner-hero-cook::before{content:'♨';display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:#dceae5;color:#315e56;font-size:12px}
    .dinner-hero-note{margin:12px auto 0;max-width:520px;color:#756f76;font-size:13px;line-height:1.45}
    .dinner-hero-actions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin-top:17px}
    .dinner-hero-actions button{border-radius:999px;padding:10px 15px;border:1px solid #9fbcb5;background:rgba(255,255,255,.92);font-weight:850;color:#2d3a38;box-shadow:0 6px 16px rgba(62,45,37,.06)}
    .dinner-hero-actions button:first-child{background:#245f5d;color:#fff;border-color:#245f5d}
    .dinner-hero-zine{align-self:center;justify-self:center;width:min(100%,165px);border:0;background:rgba(255,255,255,.84);border-radius:14px;padding:8px;box-shadow:0 12px 28px rgba(56,42,35,.15);cursor:pointer}
    .dinner-hero-zine img{display:block;width:100%;max-height:235px;object-fit:cover;object-position:top;border-radius:8px}
    .dinner-hero-zine span{display:block;margin-top:7px;font-size:10px;font-weight:850;color:#4f8077;text-align:center}
    .dinner-hero-empty .dinner-hero-copy{grid-column:1/-1;max-width:560px;justify-self:center}

    .planned-meal.has-zine{display:grid;grid-template-columns:66px minmax(0,1fr) auto;align-items:start}
    .meal-zine-thumb{border:0;background:transparent;padding:0;border-radius:9px;overflow:hidden;box-shadow:0 4px 12px rgba(54,42,49,.12);height:82px}
    .meal-zine-thumb img{width:66px;height:82px;display:block;object-fit:cover;object-position:top}
    .planned-meal.has-zine .meal-actions{align-self:start}

    .recipe-card.has-zine .recipe-card-image{height:210px;background:#201a1b}
    .recipe-card.has-zine .recipe-card-image img{object-fit:cover;object-position:top}
    .recipe-zine-detail{display:grid;grid-template-columns:minmax(230px,42%) 1fr;gap:22px;align-items:center;margin:20px 0 24px;padding:18px;border:1px solid var(--line);border-radius:18px;background:#f4eee7}
    .recipe-zine-detail img{width:100%;max-height:600px;object-fit:contain;border-radius:12px;box-shadow:0 12px 28px rgba(54,42,49,.16);background:#1f181a}
    .recipe-zine-detail h3{font-family:Georgia,serif;font-size:24px;margin:0 0 8px}
    .recipe-zine-detail p{color:var(--muted);line-height:1.55;margin:0 0 14px}
    .recipe-zine-detail .button-row button{flex:1}

    .plan-kitchen-footer{margin-top:28px;border-radius:26px;overflow:hidden;border:1px solid var(--line);box-shadow:var(--shadow);background:#ead4bc}
    .plan-kitchen-footer img{width:100%;height:auto;display:block}
    .page-art{display:block;height:auto;pointer-events:none;user-select:none}
    .recipe-mixer-art{width:min(470px,70%);margin:28px auto 0}
    .pantry-mushroom-art{width:min(420px,66%);margin:28px auto 0}

    @media(max-width:900px) and (min-width:761px){
      .dinner-hero-content{left:29%;width:67%;grid-template-columns:minmax(0,1fr) 135px;padding-left:5%}
      .dinner-hero-title{font-size:clamp(26px,4.2vw,40px)}
      .dinner-hero-zine{width:130px}
    }

    @media(max-width:760px){
      .dinner-hero{aspect-ratio:5/8;margin-top:6px;border-radius:24px!important}
      .dinner-hero-content{left:7.5%;top:29%;width:85%;height:64%;display:flex;flex-direction:column;justify-content:flex-start;gap:0;padding:4.5% 5% 3%}
      .dinner-hero-copy{width:100%}
      .dinner-hero-kicker{font-size:15px;margin-bottom:5px}
      .dinner-hero-title{font-size:clamp(27px,8.2vw,37px);line-height:1.02}
      .dinner-hero-cook{font-size:12px;margin-top:8px}
      .dinner-hero-note{font-size:11px;margin-top:7px;line-height:1.35}
      .dinner-hero-zine{width:108px;margin-top:10px;padding:5px;border-radius:10px}
      .dinner-hero-zine img{max-height:136px;border-radius:6px}
      .dinner-hero-zine span{display:none}
      .dinner-hero-actions{width:100%;display:grid;grid-template-columns:1fr;margin-top:10px;gap:6px}
      .dinner-hero-actions button{width:100%;padding:8px 10px;font-size:12px}
      .dinner-hero-empty .dinner-hero-copy{margin-top:20%}

      .planned-meal.has-zine{grid-template-columns:58px minmax(0,1fr)}
      .meal-zine-thumb,.meal-zine-thumb img{width:58px;height:72px}
      .planned-meal.has-zine .meal-actions{grid-column:1/-1;flex-direction:row;margin-top:2px}
      .recipe-card.has-zine .recipe-card-image{height:230px}
      .recipe-zine-detail{grid-template-columns:1fr;padding:13px}
      .recipe-zine-detail img{max-height:none}
      .plan-kitchen-footer img{height:230px;object-fit:cover;object-position:center}
      .recipe-mixer-art{width:min(360px,92%)}
      .pantry-mushroom-art{width:min(330px,90%)}
    }
  `;

  function injectStyles(){
    if(document.getElementById('pancoon-polish-styles')) return;
    const style = document.createElement('style');
    style.id = 'pancoon-polish-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function loadState(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  function dateKey(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[ch]));
  }

  function recipeById(state,id){
    return Array.isArray(state.recipes) ? state.recipes.find(recipe => recipe.id === id) || null : null;
  }

  function zineFor(id){ return ZINES[id] || null; }

  function tonightModel(){
    const state = loadState();
    const slot = state.plan?.[`${dateKey(new Date())}:dinner`] || null;
    if(!slot?.choice) return {type:'empty', name:'Nothing planned yet', cook:'Unassigned'};
    if(slot.choice.startsWith('recipe:')){
      const id = slot.choice.slice(7);
      const recipe = recipeById(state,id);
      return recipe ? {type:'recipe', id, recipe, name:recipe.name, cook:slot.cook || 'Unassigned'} : {type:'empty', name:'Dinner is still deciding what it wants to be', cook:'Unassigned'};
    }
    const special = SPECIALS[slot.choice];
    if(special) return {type:'special', name:special.name, note:special.note, cook:slot.cook || 'Nobody'};
    return {type:'empty', name:'Nothing planned yet', cook:'Unassigned'};
  }

  function installHero(){
    const hero = document.querySelector('.page[data-page="plan"] .hero, .page[data-page="plan"] #dinnerHero');
    if(!hero) return;
    if(hero.id !== 'dinnerHero'){
      hero.id = 'dinnerHero';
      hero.className = 'dinner-hero card';
      hero.setAttribute('aria-live','polite');
      hero.innerHTML = `
        <picture class="dinner-hero-art" aria-hidden="true">
          <source media="(max-width:760px)" srcset="${ASSETS.mobileHero}">
          <img src="${ASSETS.desktopHero}" alt="">
        </picture>
        <div id="dinnerHeroContent" class="dinner-hero-content"></div>`;
    }
    renderTonightHero();
  }

  function cookText(cook){
    if(!cook || cook === 'Unassigned') return 'Cook not assigned yet.';
    if(cook === 'Nobody') return 'Nobody is cooking tonight.';
    return `${cook} is cooking tonight.`;
  }

  function renderTonightHero(){
    const target = document.getElementById('dinnerHeroContent');
    if(!target) return;
    const dinner = tonightModel();
    const zine = dinner.type === 'recipe' ? zineFor(dinner.id) : null;
    const actions = dinner.type === 'recipe' ? `
      <div class="dinner-hero-actions">
        <button type="button" data-view-recipe="${esc(dinner.id)}">▣ View Recipe</button>
        <button type="button" ${zine?`data-print-zine="${esc(dinner.id)}"`:`data-print-recipe="${esc(dinner.id)}"`}>▧ Print</button>
        ${zine?`<button type="button" data-download-zine="${esc(dinner.id)}">⇩ Download</button>`:''}
      </div>` : '';
    const zineCard = zine ? `<button type="button" class="dinner-hero-zine" data-view-recipe="${esc(dinner.id)}" aria-label="View ${esc(dinner.name)}"><img src="${zine.src}" alt=""><span>Tonight's recipe zine</span></button>` : '';
    target.classList.toggle('dinner-hero-empty', dinner.type !== 'recipe');
    target.innerHTML = `
      <div class="dinner-hero-copy">
        <p class="dinner-hero-kicker">What's for dinner tonight?</p>
        <h2 class="dinner-hero-title">${esc(dinner.name)}</h2>
        <p class="dinner-hero-cook">${esc(cookText(dinner.cook))}</p>
        ${dinner.note?`<p class="dinner-hero-note">${esc(dinner.note)}</p>`:''}
        ${actions}
      </div>
      ${zineCard}`;
  }

  function installDecor(){
    const plan = document.querySelector('.page[data-page="plan"]');
    if(plan && !plan.querySelector('.plan-kitchen-footer')){
      const footer = document.createElement('div');
      footer.className = 'plan-kitchen-footer';
      footer.innerHTML = `<img src="${ASSETS.kitchen}" alt="Illustrated Talbot kitchen with Luna and Ozzy">`;
      plan.appendChild(footer);
    }

    const recipes = document.querySelector('.page[data-page="recipes"]');
    if(recipes && !recipes.querySelector('.recipe-mixer-art')){
      const img = document.createElement('img');
      img.className = 'page-art recipe-mixer-art';
      img.src = ASSETS.mixer;
      img.alt = 'Watercolor pink stand mixer with kitchen utensils';
      recipes.appendChild(img);
    }

    const pantry = document.querySelector('.page[data-page="pantry"]');
    if(pantry && !pantry.querySelector('.pantry-mushroom-art')){
      const img = document.createElement('img');
      img.className = 'page-art pantry-mushroom-art';
      img.src = ASSETS.mushroom;
      img.alt = 'Botanical mushroom illustration';
      pantry.appendChild(img);
    }
  }

  function enhanceMealCards(){
    document.querySelectorAll('#mealPlan .planned-meal').forEach(meal => {
      const view = meal.querySelector('[data-view-recipe]');
      const id = view?.dataset.viewRecipe;
      const zine = zineFor(id);
      if(!zine) return;
      meal.classList.add('has-zine');
      if(!meal.querySelector('.meal-zine-thumb')){
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'meal-zine-thumb';
        thumb.dataset.viewRecipe = id;
        thumb.setAttribute('aria-label','Open recipe zine');
        thumb.innerHTML = `<img src="${zine.src}" alt="">`;
        meal.prepend(thumb);
      }
      const actions = meal.querySelector('.meal-actions');
      if(actions && !actions.querySelector('[data-download-zine]')){
        const download = document.createElement('button');
        download.type = 'button';
        download.dataset.downloadZine = id;
        download.textContent = 'Download';
        actions.appendChild(download);
      }
    });
  }

  function enhanceRecipeShelf(){
    document.querySelectorAll('#recipeShelf .recipe-card').forEach(card => {
      const view = card.querySelector('[data-view-recipe]');
      const id = view?.dataset.viewRecipe;
      const zine = zineFor(id);
      if(!zine) return;
      card.classList.add('has-zine');
      const image = card.querySelector('.recipe-card-image');
      if(image && image.dataset.zine !== id){
        image.dataset.zine = id;
        image.innerHTML = `<img src="${zine.src}" alt="${esc(card.querySelector('h3')?.textContent || 'Recipe zine')}">`;
      }
      const actions = card.querySelector('.recipe-card-actions');
      if(actions && !actions.querySelector('[data-download-zine]')){
        const download = document.createElement('button');
        download.type = 'button';
        download.dataset.downloadZine = id;
        download.textContent = 'Download';
        actions.appendChild(download);
      }
      const print = card.querySelector('[data-print-recipe]');
      if(print && print.textContent !== 'Print zine') print.textContent = 'Print zine';
    });
  }

  function enhanceRecipeView(){
    const view = document.getElementById('recipeView');
    if(!view) return;
    const print = view.querySelector('[data-print-recipe]');
    const email = view.querySelector('[data-email-recipe]');
    const id = print?.dataset.printRecipe || email?.dataset.emailRecipe;
    const zine = zineFor(id);
    if(!zine) return;

    if(!view.querySelector('.recipe-zine-detail')){
      const section = document.createElement('section');
      section.className = 'recipe-zine-detail';
      section.innerHTML = `
        <img src="${zine.src}" alt="Printable Chicken Shawarma recipe zine">
        <div>
          <p class="eyebrow">PanCoon recipe zine</p>
          <h3>Blake's Demon Slayer dinner card</h3>
          <p>The full-page zine is ready to view here, print as a single recipe page, or save to your device.</p>
          <div class="button-row">
            <button type="button" class="primary" data-print-zine="${esc(id)}">Print zine</button>
            <button type="button" class="secondary" data-download-zine="${esc(id)}">Download zine</button>
          </div>
        </div>`;
      const columns = view.querySelector('.recipe-columns');
      if(columns) columns.before(section); else view.appendChild(section);
    }

    if(print && print.textContent !== 'Print zine') print.textContent = 'Print zine';
    const actionRow = view.querySelector('.recipe-view-actions');
    if(actionRow && !actionRow.querySelector('[data-download-zine]')){
      const download = document.createElement('button');
      download.type = 'button';
      download.className = 'secondary';
      download.dataset.downloadZine = id;
      download.textContent = 'Download zine';
      actionRow.insertBefore(download, actionRow.children[1] || null);
    }
  }

  function downloadZine(id){
    const zine = zineFor(id);
    if(!zine) return;
    const link = document.createElement('a');
    link.href = zine.src;
    link.download = zine.filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function printZine(id){
    const zine = zineFor(id);
    if(!zine) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden','true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(frame);
    frame.onload = () => {
      const image = frame.contentDocument?.querySelector('img');
      const run = () => {
        try { frame.contentWindow?.focus(); frame.contentWindow?.print(); }
        finally { setTimeout(() => frame.remove(), 1800); }
      };
      if(image?.complete) run(); else if(image) image.onload = run; else run();
    };
    frame.srcdoc = `<!doctype html><html><head><title>PanCoon Recipe Zine</title><style>@page{size:letter portrait;margin:0}html,body{margin:0;width:100%;height:100%;background:#fff}body{display:flex;align-items:center;justify-content:center}img{display:block;max-width:100%;max-height:100vh;width:auto;height:auto;object-fit:contain}</style></head><body><img src="${new URL(zine.src,location.origin).href}" alt=""></body></html>`;
  }

  function bindActions(){
    document.addEventListener('click', event => {
      const customPrint = event.target.closest('[data-print-zine]');
      if(customPrint){
        event.preventDefault();
        event.stopImmediatePropagation();
        printZine(customPrint.dataset.printZine);
        return;
      }

      const standardPrint = event.target.closest('[data-print-recipe]');
      if(standardPrint && zineFor(standardPrint.dataset.printRecipe)){
        event.preventDefault();
        event.stopImmediatePropagation();
        printZine(standardPrint.dataset.printRecipe);
        return;
      }

      const download = event.target.closest('[data-download-zine]');
      if(download){
        event.preventDefault();
        event.stopImmediatePropagation();
        downloadZine(download.dataset.downloadZine);
      }
    }, true);
  }

  function observe(){
    const mealPlan = document.getElementById('mealPlan');
    if(mealPlan) new MutationObserver(() => { enhanceMealCards(); renderTonightHero(); }).observe(mealPlan,{childList:true,subtree:true});
    const recipeShelf = document.getElementById('recipeShelf');
    if(recipeShelf) new MutationObserver(enhanceRecipeShelf).observe(recipeShelf,{childList:true,subtree:true});
    const recipeView = document.getElementById('recipeView');
    if(recipeView) new MutationObserver(enhanceRecipeView).observe(recipeView,{childList:true,subtree:true});
  }

  function start(){
    injectStyles();
    installHero();
    installDecor();
    enhanceMealCards();
    enhanceRecipeShelf();
    enhanceRecipeView();
    bindActions();
    observe();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();