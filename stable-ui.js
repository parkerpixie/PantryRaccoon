(() => {
  'use strict';

  const STATE_KEY = 'pantry-raccoon:v1';
  const NOTES_KEY = 'pantry-raccoon:inventory-notes:v1';
  const ZINES_KEY = 'pantry-raccoon:recipe-zines:v1';
  const SPECIALS = {
    'special:out': ['Go out to Eat', 'Nobody is cooking tonight.'],
    'special:leftovers': ['Leftovers', 'Nobody needs to start from scratch tonight.'],
    'special:freezer': ['Freezer / Heat & Eat', 'Dinner is deliberately easy tonight.'],
    'special:undecided': ['Undecided', 'Cook not assigned yet.']
  };
  const STATUS_OPTIONS = [
    ['plenty','Plenty'],['half','Half Full'],['low','Low'],['out','Out']
  ];
  const INVENTORY_KINDS = ['pantry','fridge','freezer'];
  const inventoryView = Object.fromEntries(INVENTORY_KINDS.map(kind => [kind,{query:'',filter:'all'}]));

  let fiveAmTimer = null;

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[ch]));
  }

  function readJson(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function writeJson(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readState(){ return readJson(STATE_KEY, {}); }
  function readNotes(){ return readJson(NOTES_KEY, {}); }
  function readZines(){ return readJson(ZINES_KEY, {}); }

  function injectStyles(){
    if (document.getElementById('pancoon-stable-feature-styles')) return;
    const style = document.createElement('style');
    style.id = 'pancoon-stable-feature-styles';
    style.textContent = `
      .inventory-tools{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:0 0 18px;padding:14px 16px;background:#fffaf3;border:1px solid var(--line);border-radius:16px}
      .inventory-search{flex:1 1 260px;max-width:520px}.inventory-search input{background:#fff}
      .inventory-filters{display:flex;gap:7px;flex-wrap:wrap}.inventory-filter{border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:999px;padding:8px 11px;font-size:11px;font-weight:800}.inventory-filter.active{background:var(--plum);border-color:var(--plum);color:#fff}
      .inventory-item[data-stock="plenty"]{border-color:#77a393}.inventory-item[data-stock="half"]{border-color:#8d89ad}.inventory-item[data-stock="low"]{border-color:#d29a45}.inventory-item[data-stock="out"]{border-color:#b75d58}.inventory-item[hidden],.inventory-group[hidden]{display:none!important}
      .inventory-result-note{font-size:11px;color:var(--muted);margin-left:4px}
      .zine-badge{display:inline-flex;align-items:center;width:max-content;margin:8px 0 0;padding:5px 8px;border-radius:999px;background:#f3e6cf;color:#76561f;font-size:10px;font-weight:900;letter-spacing:.02em}
      .recipe-card-actions [data-open-zine],.recipe-view-actions [data-open-zine]{border-color:#c8a66b;background:#fff9ed;color:#654b24}
      .recipe-zine-field small{font-weight:500;color:var(--muted);line-height:1.4}
      @media(max-width:760px){.inventory-tools{align-items:stretch}.inventory-search{max-width:none}.inventory-filters{overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px}.inventory-filter{white-space:nowrap}}
    `;
    document.head.appendChild(style);
  }

  function dateKey(date){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function dinnerDate(now = new Date()){
    const date = new Date(now);
    if (date.getHours() < 5) date.setDate(date.getDate() - 1);
    date.setHours(0,0,0,0);
    return date;
  }

  function zinePathFor(recipeId){
    return readZines()[recipeId] || '';
  }

  function updateTonight(){
    const name = document.getElementById('tonightMealName');
    const cook = document.getElementById('tonightCook');
    const actions = document.getElementById('tonightActions');
    if (!name || !cook || !actions) return;

    const state = readState();
    const slot = state.plan?.[`${dateKey(dinnerDate())}:dinner`];

    if (!slot?.choice){
      name.textContent = 'Nothing planned yet';
      cook.textContent = 'Cook not assigned yet.';
      actions.innerHTML = '';
      return;
    }

    if (slot.choice.startsWith('recipe:')){
      const id = slot.choice.slice(7);
      const recipe = Array.isArray(state.recipes) ? state.recipes.find(item => item.id === id) : null;
      name.textContent = recipe?.name || 'Dinner is planned';
      cook.textContent = slot.cook && slot.cook !== 'Unassigned'
        ? `${slot.cook} is cooking tonight.`
        : 'Cook not assigned yet.';
      actions.innerHTML = recipe
        ? `<button type="button" class="primary" data-view-recipe="${esc(id)}">View Recipe</button><button type="button" class="secondary" data-print-recipe="${esc(id)}">Print</button>${zinePathFor(id) ? `<button type="button" class="secondary" data-open-zine="${esc(id)}">Open Recipe Zine</button>` : ''}`
        : '';
      return;
    }

    const special = SPECIALS[slot.choice] || ['Dinner is planned',''];
    name.textContent = special[0];
    cook.textContent = slot.cook && !['Nobody','Unassigned'].includes(slot.cook)
      ? `${slot.cook} is handling dinner tonight.`
      : special[1];
    actions.innerHTML = '';
  }

  function scheduleFiveAmRefresh(){
    clearTimeout(fiveAmTimer);
    const now = new Date();
    const next = new Date(now);
    next.setHours(5,0,0,0);
    if (next <= now) next.setDate(next.getDate() + 1);
    fiveAmTimer = setTimeout(() => {
      updateTonight();
      scheduleFiveAmRefresh();
    }, Math.max(1000, next.getTime() - now.getTime()));
  }

  function ensureFruitOption(){
    const select = document.querySelector('[data-inventory-form="pantry"] select[name="category"]');
    if (!select || [...select.options].some(option => option.value === 'Fruit')) return;
    const option = document.createElement('option');
    option.value = 'Fruit';
    option.textContent = 'Fruit';
    const other = [...select.options].find(item => item.value === 'Other');
    if (other) select.insertBefore(option, other);
    else select.appendChild(option);
  }

  function inventoryItemId(card){
    return card.querySelector('[data-inventory-status]')?.dataset.inventoryStatus || '';
  }

  function inventoryStatus(card){
    const status = card.querySelector('.status');
    return STATUS_OPTIONS.find(([value]) => status?.classList.contains(value))?.[0] || '';
  }

  function displayNote(item, kind, notes){
    if (notes[item.id]) return notes[item.id];
    if (kind === 'fridge' && item.expirationDate) return `Expires ${item.expirationDate}`;
    if (kind === 'freezer' && item.dateAdded) return `Added ${item.dateAdded}`;
    return '';
  }

  function refreshInventoryNotes(kind){
    const state = readState();
    const notes = readNotes();
    const items = state.inventories?.[kind] || [];
    const byId = new Map(items.map(item => [item.id, item]));
    const target = document.getElementById(`${kind}List`);
    if (!target) return;

    target.querySelectorAll('.inventory-item').forEach(card => {
      const id = inventoryItemId(card);
      const item = byId.get(id);
      card.querySelector('.inventory-note-line')?.remove();
      if (!item) return;
      const note = displayNote(item, kind, notes);
      if (!note) return;
      const line = document.createElement('small');
      line.className = 'inventory-note-line';
      line.textContent = note;
      const copy = card.querySelector('div:first-child');
      copy?.appendChild(line);
    });
  }

  function fruitCard(item){
    return `<article class="inventory-item">
      <div><strong>${esc(item.name)}</strong><small>${esc(item.quantity || 'Quantity not set')}</small></div>
      <span class="status ${esc(item.status)}">${esc(STATUS_OPTIONS.find(([value]) => value === item.status)?.[1] || item.status)}</span>
      <div class="inventory-actions">${STATUS_OPTIONS.map(([value,label]) => `<button data-inventory-status="${esc(item.id)}" data-inventory-kind="pantry" data-status="${value}">${label}</button>`).join('')}<button data-remove-inventory="${esc(item.id)}" data-inventory-kind="pantry">Remove</button></div>
    </article>`;
  }

  function renderFruitGroup(){
    const target = document.getElementById('pantryList');
    if (!target) return;
    target.querySelector('.stable-fruit-group')?.remove();

    const state = readState();
    const fruit = (state.inventories?.pantry || [])
      .filter(item => item.category === 'Fruit')
      .sort((a,b) => String(a.name).localeCompare(String(b.name)));
    if (!fruit.length) return;

    const section = document.createElement('section');
    section.className = 'inventory-group stable-fruit-group';
    section.innerHTML = `<h3>Fruit <span>${fruit.length}</span></h3><div class="inventory-grid">${fruit.map(fruitCard).join('')}</div>`;
    target.appendChild(section);
  }

  function ensureInventoryTools(kind){
    const target = document.getElementById(`${kind}List`);
    if (!target || document.querySelector(`[data-inventory-tools="${kind}"]`)) return;
    const tools = document.createElement('div');
    tools.className = 'inventory-tools';
    tools.dataset.inventoryTools = kind;
    tools.innerHTML = `
      <label class="inventory-search"><input type="search" data-inventory-search="${kind}" placeholder="Search ${kind}…" autocomplete="off" aria-label="Search ${kind}"></label>
      <div class="inventory-filters" aria-label="Filter ${kind} by amount">
        <button type="button" class="inventory-filter active" data-inventory-filter="all" data-inventory-kind="${kind}">All</button>
        <button type="button" class="inventory-filter" data-inventory-filter="plenty" data-inventory-kind="${kind}">Plenty</button>
        <button type="button" class="inventory-filter" data-inventory-filter="half" data-inventory-kind="${kind}">Half Full</button>
        <button type="button" class="inventory-filter" data-inventory-filter="low" data-inventory-kind="${kind}">Low</button>
        <button type="button" class="inventory-filter" data-inventory-filter="out" data-inventory-kind="${kind}">Out</button>
        <button type="button" class="inventory-filter" data-inventory-filter="attention" data-inventory-kind="${kind}">Low + Out</button>
      </div>`;
    target.parentNode.insertBefore(tools, target);
  }

  function applyInventoryFilter(kind){
    const target = document.getElementById(`${kind}List`);
    if (!target) return;
    const view = inventoryView[kind];
    const query = view.query.trim().toLowerCase();

    target.querySelectorAll('.inventory-item').forEach(card => {
      const name = (card.querySelector('strong')?.textContent || '').toLowerCase();
      const status = inventoryStatus(card);
      card.dataset.stock = status;
      const matchesQuery = !query || name.includes(query);
      const matchesFilter = view.filter === 'all' || status === view.filter || (view.filter === 'attention' && ['low','out'].includes(status));
      card.hidden = !(matchesQuery && matchesFilter);
    });

    target.querySelectorAll('.inventory-group').forEach(group => {
      const cards = [...group.querySelectorAll('.inventory-item')];
      const visible = cards.filter(card => !card.hidden).length;
      group.hidden = visible === 0;
      const count = group.querySelector(':scope > h3 span');
      if (count) count.textContent = (query || view.filter !== 'all') ? `${visible}/${cards.length}` : String(cards.length);
    });
  }

  function refreshInventoryEnhancements(){
    ensureFruitOption();
    renderFruitGroup();
    refreshInventoryNotes('fridge');
    refreshInventoryNotes('freezer');
    INVENTORY_KINDS.forEach(kind => {
      ensureInventoryTools(kind);
      applyInventoryFilter(kind);
    });
  }

  function captureInventorySubmit(event){
    const form = event.target.closest?.('[data-inventory-form]');
    if (!form) return;
    const kind = form.dataset.inventoryForm;
    const name = form.elements.name?.value.trim() || '';
    const note = form.elements.notes?.value.trim() || '';

    setTimeout(() => {
      if (note && ['fridge','freezer'].includes(kind)){
        const state = readState();
        const list = state.inventories?.[kind] || [];
        const item = [...list].reverse().find(candidate => candidate.name === name);
        if (item){
          const notes = readNotes();
          notes[item.id] = note;
          writeJson(NOTES_KEY, notes);
        }
      }
      refreshInventoryEnhancements();
    }, 0);
  }

  function cleanupRemovedNotes(){
    const state = readState();
    const liveIds = new Set([
      ...(state.inventories?.fridge || []).map(item => item.id),
      ...(state.inventories?.freezer || []).map(item => item.id)
    ]);
    const notes = readNotes();
    let changed = false;
    Object.keys(notes).forEach(id => {
      if (!liveIds.has(id)){
        delete notes[id];
        changed = true;
      }
    });
    if (changed) writeJson(NOTES_KEY, notes);
  }

  function normalizeZinePath(value){
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^https?:\/\//i.test(text)) return text;
    if (text.startsWith('/')) return text;
    if (text.startsWith('assets/')) return `/${text}`;
    return `/assets/${text}`;
  }

  function ensureDefaultZines(){
    const zines = readZines();
    if (!zines['chicken-shawarma-sheet-pan']){
      zines['chicken-shawarma-sheet-pan'] = '/assets/Chicken Shawrma Sheet Pan Dinner.png';
      writeJson(ZINES_KEY, zines);
    }
  }

  function ensureZineField(){
    const form = document.getElementById('recipeForm');
    if (!form || form.elements.zineAsset) return;
    const label = document.createElement('label');
    label.className = 'recipe-zine-field';
    label.innerHTML = `Recipe Zine asset<input name="zineAsset" placeholder="assets/My Recipe Zine.png"><small>Upload the zine image to the repo's assets folder, then paste its filename or assets/ path here.</small>`;
    const notesLabel = form.elements.notes?.closest('label');
    if (notesLabel) form.insertBefore(label, notesLabel);
    else form.appendChild(label);
  }

  function populateZineField(recipeId){
    ensureZineField();
    const input = document.getElementById('recipeForm')?.elements.zineAsset;
    if (!input) return;
    input.value = recipeId ? zinePathFor(recipeId) : '';
  }

  function saveRecipeZineAfterCoreSave(form){
    const existingId = form.elements.id?.value || '';
    const recipeName = form.elements.name?.value.trim() || '';
    const path = normalizeZinePath(form.elements.zineAsset?.value || '');

    setTimeout(() => {
      const state = readState();
      const recipes = Array.isArray(state.recipes) ? state.recipes : [];
      const recipe = existingId
        ? recipes.find(item => item.id === existingId)
        : [...recipes].reverse().find(item => item.name === recipeName);
      if (!recipe) return;
      const zines = readZines();
      if (path) zines[recipe.id] = path;
      else delete zines[recipe.id];
      writeJson(ZINES_KEY, zines);
      decorateRecipeCards();
      updateTonight();
    }, 0);
  }

  function decorateRecipeCards(){
    const zines = readZines();
    document.querySelectorAll('#recipeShelf .recipe-card').forEach(card => {
      const id = card.querySelector('[data-view-recipe]')?.dataset.viewRecipe;
      card.querySelector('.zine-badge')?.remove();
      card.querySelector('[data-open-zine]')?.remove();
      if (!id || !zines[id]) return;

      const badge = document.createElement('span');
      badge.className = 'zine-badge';
      badge.textContent = 'Zine available ✨';
      card.querySelector('.recipe-card-copy h3')?.insertAdjacentElement('afterend', badge);

      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.openZine = id;
      button.textContent = 'Open Recipe Zine';
      card.querySelector('.recipe-card-actions')?.appendChild(button);
    });
  }

  function decorateRecipeView(recipeId){
    const actions = document.querySelector('#recipeViewDialog .recipe-view-actions');
    if (!actions) return;
    actions.querySelector('[data-open-zine]')?.remove();
    if (!zinePathFor(recipeId)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.dataset.openZine = recipeId;
    button.textContent = 'Open Recipe Zine';
    actions.appendChild(button);
  }

  function openZine(recipeId){
    if (!zinePathFor(recipeId)) return;
    window.open(`/zine.html?recipe=${encodeURIComponent(recipeId)}`, '_blank', 'noopener');
  }

  function start(){
    injectStyles();
    ensureDefaultZines();
    ensureZineField();
    updateTonight();
    scheduleFiveAmRefresh();
    refreshInventoryEnhancements();
    setTimeout(decorateRecipeCards, 0);

    document.addEventListener('submit', event => {
      captureInventorySubmit(event);
      if (event.target.id === 'recipeForm') saveRecipeZineAfterCoreSave(event.target);
      if (event.target.id === 'recipeImportForm') setTimeout(decorateRecipeCards, 0);
    }, true);

    document.addEventListener('input', event => {
      const kind = event.target.dataset.inventorySearch;
      if (kind && inventoryView[kind]){
        inventoryView[kind].query = event.target.value;
        applyInventoryFilter(kind);
      }
      if (event.target.id === 'recipeSearch') setTimeout(decorateRecipeCards, 0);
    });

    document.addEventListener('change', event => {
      if (event.target.matches('[data-plan-choice],[data-plan-cook]')) setTimeout(updateTonight, 0);
    });

    document.addEventListener('click', event => {
      const filter = event.target.closest('[data-inventory-filter]');
      if (filter){
        const kind = filter.dataset.inventoryKind;
        inventoryView[kind].filter = filter.dataset.inventoryFilter;
        document.querySelectorAll(`[data-inventory-filter][data-inventory-kind="${kind}"]`).forEach(button => button.classList.toggle('active', button === filter));
        applyInventoryFilter(kind);
        return;
      }

      const zineButton = event.target.closest('[data-open-zine]');
      if (zineButton){
        event.preventDefault();
        openZine(zineButton.dataset.openZine);
        return;
      }

      const edit = event.target.closest('[data-edit-recipe]');
      if (edit) setTimeout(() => populateZineField(edit.dataset.editRecipe), 0);
      if (event.target.closest('#manualRecipeButton,#quickRecipeButton')) setTimeout(() => populateZineField(''), 0);

      const view = event.target.closest('[data-view-recipe]');
      if (view) setTimeout(() => decorateRecipeView(view.dataset.viewRecipe), 0);

      if (event.target.closest('[data-inventory-status],[data-remove-inventory]')){
        setTimeout(() => {
          cleanupRemovedNotes();
          refreshInventoryEnhancements();
        }, 0);
      }
    });

    window.addEventListener('storage', event => {
      if (event.key === STATE_KEY){
        updateTonight();
        refreshInventoryEnhancements();
        decorateRecipeCards();
      }
      if (event.key === NOTES_KEY) refreshInventoryEnhancements();
      if (event.key === ZINES_KEY){
        updateTonight();
        decorateRecipeCards();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
