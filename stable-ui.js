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
      .recipe-zine-field{display:grid;gap:12px;margin:12px 0;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff9f2}
      .recipe-zine-field label{display:grid;gap:6px;font-weight:750}
      .recipe-zine-field small{font-weight:500;color:var(--muted);line-height:1.4}
      .recipe-zine-field input[type=file]{display:block;width:100%;padding:10px;background:white;border:1px solid var(--line);border-radius:10px}
      .recipe-zine-field .zine-remove-label{display:flex;align-items:center;gap:9px;font-weight:650}
      .recipe-zine-field .zine-remove-label input{width:auto}
      .recipe-zine-field .zine-field-status{font-size:12px;color:var(--muted);margin:0}
      .recipe-zine-field .zine-field-thumb{display:flex;align-items:center;gap:12px}
      .recipe-zine-field .zine-field-thumb img{width:70px;max-height:94px;object-fit:cover;object-position:top;border-radius:8px;border:1px solid var(--line)}
      .tonight-card.has-dinner-zine{grid-template-columns:minmax(0,1.15fr) minmax(240px,.85fr)}
      .tonight-card.has-dinner-zine .tonight-art{background:#eee0d0;display:grid;place-items:center;padding:14px;overflow:hidden}
      .tonight-card.has-dinner-zine .dinner-zine-hero-button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;width:100%;height:100%;border:0;background:transparent;padding:0;cursor:pointer}
      .tonight-card.has-dinner-zine .dinner-zine-hero-button img{width:100%;height:auto;max-width:100%;max-height:360px;min-height:0;object-fit:contain!important;object-position:center;display:block;box-shadow:0 6px 20px rgba(50,34,29,.18);border-radius:7px}
      .tonight-card.has-dinner-zine .dinner-zine-hero-button span{font-size:11px;font-weight:800;color:#57444d}
      @media(max-width:760px){.tonight-card.has-dinner-zine{display:flex;flex-direction:column;min-height:0}.tonight-card.has-dinner-zine .tonight-details{margin:8px;padding:17px;border-radius:16px}.tonight-card.has-dinner-zine .tonight-details:after{display:none}.tonight-card.has-dinner-zine .tonight-art{min-height:0;padding:10px 12px 15px}.tonight-card.has-dinner-zine .dinner-zine-hero-button img{max-height:490px;width:auto;max-width:100%;min-height:0}}
      .recipe-zine-preview{display:grid;grid-template-columns:minmax(150px,210px) minmax(0,1fr);gap:20px;align-items:center;margin:22px 0 26px;padding:16px;border:1px solid var(--line);border-radius:18px;background:#f7efe3}
      .recipe-zine-preview button{display:block;width:100%;padding:0;border:0;background:transparent;cursor:pointer;border-radius:12px;overflow:hidden;box-shadow:0 10px 28px rgba(54,42,49,.16)}
      .recipe-zine-preview img{display:block;width:100%;height:auto;max-height:330px;object-fit:cover;object-position:top;background:#201a1b}
      .recipe-zine-preview h3{margin:0 0 7px;font-family:Georgia,serif;font-size:23px}
      .recipe-zine-preview p{margin:0 0 12px;color:var(--muted);line-height:1.5}
      .recipe-zine-preview .zine-preview-kicker{margin:0 0 5px;color:var(--teal);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}
      @media(max-width:760px){.inventory-tools{align-items:stretch}.inventory-search{max-width:none}.inventory-filters{overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px}.inventory-filter{white-space:nowrap}.recipe-zine-preview{grid-template-columns:110px minmax(0,1fr);gap:13px;padding:12px}.recipe-zine-preview img{max-height:175px}.recipe-zine-preview h3{font-size:19px}.recipe-zine-preview p{font-size:12px}}
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

  // Follow only the current day's DINNER plan, not lunch or another recipe.
  function renderDinnerArtwork(recipeId){
    const card=document.querySelector('.tonight-card');
    const art=card?.querySelector('.tonight-art');
    if(!art)return;
    const source=recipeId?zinePathFor(recipeId):'';
    if(!source){
      card.classList.remove('has-dinner-zine');
      art.setAttribute('aria-hidden','true');
      if(art.dataset.zineSource || !art.querySelector('img')){
        art.innerHTML='<img src="/assets/HERO%20Raccoon%20in%20Kitchen.png" alt="" decoding="async">';
        delete art.dataset.zineSource;
      }
      return;
    }
    card.classList.add('has-dinner-zine');
    art.removeAttribute('aria-hidden');
    if(art.dataset.zineSource!==source || !art.querySelector('.dinner-zine-hero-button')){
      art.dataset.zineSource=source;
      art.innerHTML=`<button type="button" class="dinner-zine-hero-button" data-view-recipe="${esc(recipeId)}" aria-label="Open tonight's dinner zine"><img src="${esc(source)}" alt="Tonight's dinner recipe zine"><span>Tap to view full-size zine</span></button>`;
    }
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
      renderDinnerArtwork('');
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
      renderDinnerArtwork(recipe ? id : '');
      return;
    }

    const special = SPECIALS[slot.choice] || ['Dinner is planned',''];
    name.textContent = special[0];
    cook.textContent = slot.cook && !['Nobody','Unassigned'].includes(slot.cook)
      ? `${slot.cook} is handling dinner tonight.`
      : special[1];
    actions.innerHTML = '';
    renderDinnerArtwork('');
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
    if (window.PanCoonZineStore?.isLocal(text)) return text;
    if (text.startsWith('/')) return text;
    if (text.startsWith('assets/')) return `/${text}`;
    return `/assets/${text}`;
  }

  function ensureZineField(){
    const form = document.getElementById('recipeForm');
    if (!form || form.elements.zineAsset) return;
    const section = document.createElement('div');
    section.className = 'recipe-zine-field';
    section.innerHTML = `
      <label>Recipe Zine image URL (optional)
        <input name="zineAsset" placeholder="assets/My Recipe Zine.png">
        <small>For existing images on a website or in the app assets folder.</small>
      </label>
      <label>Upload a zine from your device
        <input name="zineUpload" type="file" accept="image/png,image/jpeg,image/webp">
        <small>PNG, JPEG or WebP, up to 15 MB. Saved privately in this browser, attached only to your recipe. It does not automatically sync between devices.</small>
      </label>
      <label class="zine-remove-label"><input name="zineRemove" type="checkbox"> Remove existing zine</label>
      <div class="zine-field-thumb" id="recipeZineFieldPreview" hidden></div>
      <p class="zine-field-status" id="recipeZineFieldStatus"></p>`;
    const notesLabel = form.elements.notes?.closest('label');
    if (notesLabel) form.insertBefore(section, notesLabel);
    else form.appendChild(section);
  }

  function populateZineField(recipeId){
    ensureZineField();
    const form = document.getElementById('recipeForm');
    if (!form) return;
    const current = recipeId ? zinePathFor(recipeId) : '';
    const local = window.PanCoonZineStore?.isLocal(current);
    form.elements.zineAsset.value = local ? '' : current;
    form.elements.zineUpload.value = '';
    form.elements.zineRemove.checked = false;
    const status = document.getElementById('recipeZineFieldStatus');
    if (status) status.textContent = local
      ? 'This recipe already has a zine stored in this browser. Choose a new image to replace it.'
      : current ? 'An existing zine URL is attached. Upload an image to replace it.' : 'No zine attached yet.';
    const preview = document.getElementById('recipeZineFieldPreview');
    if (preview) {
      preview.hidden = !current;
      preview.innerHTML = current ? `<img src="${esc(current)}" alt="Current recipe zine"><small>Current zine</small>` : '';
    }
  }

  function decorateRecipeCards(){
    const zines = readZines();
    document.querySelectorAll('#recipeShelf .recipe-card').forEach(card => {
      const id = card.querySelector('[data-view-recipe]')?.dataset.viewRecipe;
      card.querySelector('.zine-badge')?.remove();
      card.querySelector('[data-open-zine]')?.remove();
      if (!id || !zines[id]) return;
      const image = card.querySelector('.recipe-card-image');
      if (image) {
        image.innerHTML = `<img src="${esc(zines[id])}" alt="${esc(card.querySelector('h3')?.textContent || 'Recipe')} zine preview">`;
        card.classList.add('has-zine');
      }

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
    const view = document.getElementById('recipeView');
    const actions = document.querySelector('#recipeViewDialog .recipe-view-actions');
    if (!view || !actions) return;

    actions.querySelector('[data-open-zine]')?.remove();
    view.querySelector('.recipe-zine-preview')?.remove();

    const zinePath = zinePathFor(recipeId);
    if (!zinePath) return;

    const state = readState();
    const recipe = Array.isArray(state.recipes) ? state.recipes.find(item => item.id === recipeId) : null;
    const preview = document.createElement('section');
    preview.className = 'recipe-zine-preview';
    preview.innerHTML = `
      <button type="button" data-open-zine="${esc(recipeId)}" aria-label="Open ${esc(recipe?.name || 'recipe')} zine full size">
        <img src="${esc(zinePath)}" alt="${esc(recipe?.name || 'Recipe')} zine preview">
      </button>
      <div>
        <p class="zine-preview-kicker">PanCoon recipe zine</p>
        <h3>See the recipe in full technicolor chaos ✨</h3>
        <p>Tap the preview to open the full-page zine. The regular ingredients and instructions are still right below it.</p>
        <button type="button" class="secondary" data-open-zine="${esc(recipeId)}">Open Recipe Zine</button>
      </div>`;

    const columns = view.querySelector('.recipe-columns');
    if (columns) columns.before(preview);
    else actions.before(preview);

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

  function uploadZineForRecipe(recipeId, button){
    const recipe=readState().recipes?.find(item=>item.id===recipeId);
    const store=window.PanCoonZineStore;
    if(!recipe || !store){alert('Recipe or image storage was not found. Reload PanCoon and retry.');return;}
    const picker=document.createElement('input');
    picker.type='file';picker.accept='image/png,image/jpeg,image/webp';picker.hidden=true;
    document.body.appendChild(picker);
    picker.addEventListener('change',async()=>{
      const file=picker.files?.[0];
      if(!file){picker.remove();return;}
      const label=button.textContent;
      button.disabled=true;button.textContent='Saving zine…';
      try{
        const ref=await store.put(recipeId,file);
        const image=await store.resolve(ref);
        await new Promise((resolve,reject)=>{
          const proof=new Image();
          proof.onload=resolve;
          proof.onerror=()=>reject(new Error('Saved file could not be displayed as an image.'));
          proof.src=image;
        });
        const zines=readZines();
        zines[recipeId]=ref;
        writeJson(ZINES_KEY,zines);
        decorateRecipeCards();
        updateTonight();
        button.textContent='Replace zine';
        let feedback=button.closest('.recipe-card')?.querySelector('.zine-upload-feedback');
        if(!feedback){feedback=document.createElement('small');feedback.className='zine-upload-feedback';button.closest('.recipe-card')?.querySelector('.recipe-card-copy')?.appendChild(feedback);}
        if(feedback)feedback.textContent='✓ Image saved and linked to this recipe';
        window.dispatchEvent(new CustomEvent('pancoon:zine-changed',{detail:{recipeId}}));
      }catch(error){
        alert('Could not attach zine to '+recipe.name+': '+(error?.message||'Unknown error'));
        button.textContent=label;
      }finally{
        button.disabled=false;
        picker.remove();
      }
    },{once:true});
    picker.click();
  }

  function start(){
    injectStyles();
    ensureZineField();
    updateTonight();
    scheduleFiveAmRefresh();
    refreshInventoryEnhancements();
    setTimeout(decorateRecipeCards, 0);

    document.addEventListener('submit', event => {
      captureInventorySubmit(event);
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
      if (event.target.name === 'zineUpload') {
        const file = event.target.files?.[0];
        const status = document.getElementById('recipeZineFieldStatus');
        if (status && file) status.textContent = file.name + ' selected. It will be attached when you save the recipe.';
      }
    });

    document.addEventListener('click', event => {
      const uploader=event.target.closest('[data-upload-zine]');
      if(uploader){event.preventDefault();uploadZineForRecipe(uploader.dataset.uploadZine,uploader);return;}
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

      const viewButton = event.target.closest('[data-view-recipe]');
      if (viewButton) setTimeout(() => decorateRecipeView(viewButton.dataset.viewRecipe), 0);

      if (event.target.closest('[data-inventory-status],[data-remove-inventory]')){
        setTimeout(() => {
          cleanupRemovedNotes();
          refreshInventoryEnhancements();
        }, 0);
      }
    });

    window.addEventListener('pancoon:zine-changed', () => { decorateRecipeCards(); updateTonight(); });

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