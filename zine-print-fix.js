(() => {
  'use strict';

  const ZINES_KEY = 'pantry-raccoon:recipe-zines:v1';
  const PORTER_RECIPE_ID = 'porter-sunshine-salad';
  const PORTER_ZINE = '/assets/Chicken Apple Sunshine Salad.png';

  function readZines(){
    try { return JSON.parse(localStorage.getItem(ZINES_KEY) || '{}'); }
    catch { return {}; }
  }

  function writeZines(zines){
    localStorage.setItem(ZINES_KEY, JSON.stringify(zines));
  }

  function ensurePorterZine(){
    const zines = readZines();
    if (zines[PORTER_RECIPE_ID] !== PORTER_ZINE){
      zines[PORTER_RECIPE_ID] = PORTER_ZINE;
      writeZines(zines);
    }
  }

  function printZine(){
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
    frame.srcdoc = `<!doctype html><html><head><title>Chicken Apple Sunshine Salad Zine</title><style>@page{size:letter portrait;margin:.2in}html,body{margin:0;width:100%;height:100%;background:#fff}body{display:flex;align-items:center;justify-content:center}img{display:block;max-width:100%;max-height:10.6in;width:auto;height:auto;object-fit:contain}</style></head><body><img src="${new URL(PORTER_ZINE, location.origin).href}" alt="Chicken Apple Sunshine Salad recipe zine"></body></html>`;
  }

  function addPrintAction(){
    const view = document.getElementById('recipeView');
    if (!view) return;
    const action = view.querySelector(`[data-print-recipe="${PORTER_RECIPE_ID}"], [data-email-recipe="${PORTER_RECIPE_ID}"]`);
    if (!action) return;

    const actions = view.querySelector('.recipe-view-actions');
    if (actions && !actions.querySelector('[data-porter-print-zine]')){
      const print = document.createElement('button');
      print.type = 'button';
      print.className = 'primary';
      print.dataset.porterPrintZine = '';
      print.textContent = 'Print Zine';
      actions.prepend(print);
    }
  }

  function start(){
    ensurePorterZine();
    document.addEventListener('click', event => {
      const view = event.target.closest(`[data-view-recipe="${PORTER_RECIPE_ID}"]`);
      if (view) setTimeout(addPrintAction, 0);

      const printRecipe = event.target.closest(`[data-print-recipe="${PORTER_RECIPE_ID}"]`);
      if (printRecipe){
        event.preventDefault();
        event.stopImmediatePropagation();
        printZine();
        return;
      }

      if (event.target.closest('[data-porter-print-zine]')){
        event.preventDefault();
        event.stopImmediatePropagation();
        printZine();
      }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
