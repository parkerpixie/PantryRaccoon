(() => {
  'use strict';

  const STATE_KEY = 'pantry-raccoon:v1';
  const NOTES_KEY = 'pantry-raccoon:inventory-notes:v1';
  const SPECIALS = {
    'special:out': ['Go out to Eat', 'Nobody is cooking tonight.'],
    'special:leftovers': ['Leftovers', 'Nobody needs to start from scratch tonight.'],
    'special:freezer': ['Freezer / Heat & Eat', 'Dinner is deliberately easy tonight.'],
    'special:undecided': ['Undecided', 'Cook not assigned yet.']
  };
  const STATUS_OPTIONS = [
    ['plenty','Plenty'],['half','Half Full'],['low','Low'],['out','Out']
  ];

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

  function dateKey(date){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function dinnerDate(now = new Date()){
    const date = new Date(now);
    if (date.getHours() < 5) date.setDate(date.getDate() - 1);
    date.setHours(0,0,0,0);
    return date;
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
        ? `<button type="button" class="primary" data-view-recipe="${esc(id)}">View Recipe</button><button type="button" class="secondary" data-print-recipe="${esc(id)}">Print</button>`
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

  function refreshInventoryEnhancements(){
    ensureFruitOption();
    renderFruitGroup();
    refreshInventoryNotes('fridge');
    refreshInventoryNotes('freezer');
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

  function start(){
    updateTonight();
    scheduleFiveAmRefresh();
    refreshInventoryEnhancements();

    document.addEventListener('submit', captureInventorySubmit, true);

    document.addEventListener('change', event => {
      if (event.target.matches('[data-plan-choice],[data-plan-cook]')) setTimeout(updateTonight, 0);
    });

    document.addEventListener('click', event => {
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
      }
      if (event.key === NOTES_KEY) refreshInventoryEnhancements();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
