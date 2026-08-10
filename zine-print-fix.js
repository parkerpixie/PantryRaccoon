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

  function decoratePorterRecipe(){
    const view = document.getElementById('recipeView');
    if (!view) return;
    const action = view.querySelector(`[data-print-recipe="${PORTER_RECIPE_ID}"], [data-email-recipe="${PORTER_RECIPE_ID}"]`);
    if (!action) return;

    if (!view.querySelector('.porter-zine-preview')){
      const section = document.createElement('section');
      section.className = 'porter-zine-preview';
      section.innerHTML = `
        <button type="button" class="porter-zine-image" data-porter-open-zine aria-label="Open Chicken Apple Sunshine Salad zine">
          <img src="${PORTER_ZINE}" alt="Chicken Apple Sunshine Salad zine preview">
        </button>
        <div class="porter-zine-copy">
          <p class="eyebrow">PanCoon Recipe Zine</p>
          <h3>Porter's Always Sunny edition</h3>
          <p>The full-page zine is attached to this recipe. Open it full size or print the zine directly.</p>
          <div class="button-row">
            <button type="button" class="primary" data-porter-print-zine>Print Zine</button>
            <button type="button" class="secondary" data-porter-open-zine>Open Zine</button>
          </div>
        </div>`;
      const columns = view.querySelector('.recipe-columns');
      if (columns) columns.before(section);
      else view.prepend(section);
    }

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

  function injectStyles(){
    if (document.getElementById('porter-zine-fix-styles')) return;
    const style = document.createElement('style');
    style.id = 'porter-zine-fix-styles';
    style.textContent = `
      .porter-zine-preview{display:grid;grid-template-columns:minmax(150px,220px) minmax(0,1fr);gap:20px;align-items:center;margin:22px 0 26px;padding:16px;border:1px solid var(--line);border-radius:18px;background:#f7efe3}
      .porter-zine-image{display:block;width:100%;padding:0;border:0;background:transparent;cursor:pointer;border-radius:12px;overflow:hidden;box-shadow:0 10px 28px rgba(54,42,49,.16)}
      .porter-zine-image img{display:block;width:100%;height:auto;max-height:340px;object-fit:cover;object-position:top;background:#201a1b}
      .porter-zine-copy h3{margin:0 0 7px;font-family:Georgia,serif;font-size:23px}.porter-zine-copy p{line-height:1.5}
      @media(max-width:760px){.porter-zine-preview{grid-template-columns:110px minmax(0,1fr);gap:13px;padding:12px}.porter-zine-image img{max-height:180px}.porter-zine-copy h3{font-size:19px}.porter-zine-copy p{font-size:12px}}
    `;
    document.head.appendChild(style);
  }

  function start(){
    ensurePorterZine();
    injectStyles();
    document.addEventListener('click', event => {
      const view = event.target.closest(`[data-view-recipe="${PORTER_RECIPE_ID}"]`);
      if (view) setTimeout(decoratePorterRecipe, 0);

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
        return;
      }

      if (event.target.closest('[data-porter-open-zine]')){
        event.preventDefault();
        event.stopImmediatePropagation();
        window.open(`/zine.html?recipe=${encodeURIComponent(PORTER_RECIPE_ID)}`, '_blank', 'noopener');
      }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
