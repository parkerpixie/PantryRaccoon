(() => {
  'use strict';

  const STATE_KEY = 'pantry-raccoon:v1';
  const BACKUP_KEY = 'pantry-raccoon:v1:backup';
  const ZINES_KEY = 'pantry-raccoon:recipe-zines:v1';
  const LIBRARY_VERSION_KEY = 'pancoon:zine-library-version';
  const LIBRARY_VERSION = '2026-08-29-recovery-1';

  let openPlanDay = '';

  function readJson(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function writeJson(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

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

  async function printZine(recipeId){
    const original = zineFor(recipeId);
    if (!original) return;
    let src = original;
    if (window.PanCoonSharedMedia?.isShared(original)) {
      try {src=await window.PanCoonSharedMedia.resolve(original);}
      catch (_) {alert('Sign in to your shared kitchen before printing this zine.');return;}
    } else if (window.PanCoonZineStore?.isLocal(original)) {
      try { src = await window.PanCoonZineStore.resolve(original); }
      catch (_) { alert('This zine is not available in this browser yet.'); return; }
    } else if (original.startsWith('pancoon-private://')){
      try {
        src = await window.PanCoonPrivateMedia.resolve(original);
      } catch (_) {
        alert('Sign in to your private PanCoon kitchen before printing this artwork.');
        return;
      }
    }
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
    frame.srcdoc = `<!doctype html><html><head><title>${esc(title)}</title><style>@page{size:letter portrait;margin:.2in}html,body{margin:0;width:100%;height:100%;background:#fff}body{display:flex;align-items:center;justify-content:center}img{display:block;max-width:100%;max-height:10.6in;width:auto;height:auto;object-fit:contain}</style></head><body><img src="${esc(/^(blob:|data:)/.test(src) ? src : new URL(src, location.origin).href)}" alt="${esc(title)}"></body></html>`;
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