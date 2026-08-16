(() => {
  'use strict';

  const SHOPPING_KEY = 'pancoon:shopping-trip:2026-08-16:v1';
  const DEPARTMENTS = [
    'Produce',
    'Meat & Seafood',
    'Dairy & Refrigerated',
    'Frozen',
    'Pantry & Canned Goods',
    'Snacks & Chips',
    'Household'
  ];

  const INITIAL_ITEMS = [
    { id:'produce-cucumbers', department:'Produce', name:'2 cucumbers' },
    { id:'produce-red-onion', department:'Produce', name:'1 red onion', detail:'Need about 1/4 for the cucumber salad.' },
    { id:'produce-lettuce', department:'Produce', name:'Shredded lettuce OR 1 bag Southwest chopped salad' },
    { id:'produce-rapidash-romaine', department:'Produce', name:'Romaine lettuce for Rapidash' },
    { id:'produce-broccoli', department:'Produce', name:'Broccoli' },
    { id:'produce-cherry-tomatoes', department:'Produce', name:'8 oz cherry tomatoes' },
    { id:'produce-lemon', department:'Produce', name:'1 lemon' },
    { id:'produce-dill', department:'Produce', name:'Fresh dill', detail:'Need about 1 Tbsp chopped.' },
    { id:'produce-basil', department:'Produce', name:'Fresh basil', detail:'Need about 2 Tbsp chopped.' },
    { id:'produce-cilantro', department:'Produce', name:'Fresh cilantro', detail:'For the carnitas tacos.' },
    { id:'produce-garlic', department:'Produce', name:'Garlic', detail:'Need at least 1 clove.' },

    { id:'meat-chicken', department:'Meat & Seafood', name:'4 chicken cutlets OR 2 boneless skinless chicken breasts' },
    { id:'meat-salmon', department:'Meat & Seafood', name:'8 oz skinless salmon' },

    { id:'dairy-sour-cream', department:'Dairy & Refrigerated', name:'Sour cream', detail:'Need about 1/2 cup.' },
    { id:'dairy-eggs', department:'Dairy & Refrigerated', name:'2 large eggs' },
    { id:'dairy-parmesan', department:'Dairy & Refrigerated', name:'Grated Parmesan cheese', detail:'Need about 1/2 cup.' },
    { id:'dairy-feta', department:'Dairy & Refrigerated', name:'4 oz feta cheese' },
    { id:'dairy-butter', department:'Dairy & Refrigerated', name:'Butter' },

    { id:'frozen-tater-tots', department:'Frozen', name:'1 bag frozen tater tots' },
    { id:'frozen-peas', department:'Frozen', name:'Frozen peas' },
    { id:'frozen-uncrustables', department:'Frozen', name:'Uncrustables' },

    { id:'pantry-consomme', department:'Pantry & Canned Goods', name:'1 can beef consommé' },
    { id:'pantry-salsa', department:'Pantry & Canned Goods', name:'Salsa' },

    { id:'snacks-tortilla-chips', department:'Snacks & Chips', name:'Tortilla chips' },

    { id:'household-toilet-paper', department:'Household', name:'Toilet paper' }
  ];

  let observer;
  let rendering = false;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[ch]));
  }

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function loadTrip() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(SHOPPING_KEY) || 'null'); }
    catch { saved = null; }

    if (!saved || !Array.isArray(saved.items)) {
      saved = {
        date: '2026-08-16',
        title: 'Sunday grocery run',
        items: INITIAL_ITEMS.map(item => ({ ...item, checked:false, addedBy:'seed' }))
      };
      saveTrip(saved);
      return saved;
    }

    // Add any seeded items introduced after a device first opened the list,
    // without resetting checkmarks or deleting manual additions.
    const existingIds = new Set(saved.items.map(item => item.id));
    for (const item of INITIAL_ITEMS) {
      if (!existingIds.has(item.id)) saved.items.push({ ...item, checked:false, addedBy:'seed' });
    }
    saveTrip(saved);
    return saved;
  }

  function saveTrip(trip) {
    localStorage.setItem(SHOPPING_KEY, JSON.stringify(trip));
  }

  function showToast(title, detail='') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const strong = toast.querySelector('strong');
    const span = toast.querySelector('span');
    if (strong) strong.textContent = title;
    if (span) span.textContent = detail;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function injectStyles() {
    if (document.getElementById('pancoon-shopping-trip-styles')) return;
    const style = document.createElement('style');
    style.id = 'pancoon-shopping-trip-styles';
    style.textContent = `
      .shopping-trip-note{margin:0 0 18px;padding:14px 16px;border:1px solid #dfd1c6;border-radius:16px;background:#fffaf3;color:var(--muted);line-height:1.45}
      .shopping-trip-note strong{color:var(--ink)}
      .shopping-department{margin:0 0 18px;border:1px solid var(--line);border-radius:20px;background:#fff;overflow:hidden;box-shadow:0 8px 22px rgba(54,42,49,.05)}
      .shopping-department-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;background:#f7efe3;border-bottom:1px solid var(--line)}
      .shopping-department-header h3{margin:0;font-family:Georgia,serif;font-size:21px}.shopping-department-header span{font-size:11px;font-weight:900;color:var(--teal);text-transform:uppercase;letter-spacing:.08em}
      .shopping-trip-item{display:grid;grid-template-columns:30px minmax(0,1fr);gap:11px;align-items:center;min-height:58px;padding:10px 16px;border-bottom:1px solid #eee5dd;cursor:pointer;background:#fff}
      .shopping-trip-item:last-child{border-bottom:0}.shopping-trip-item:hover{background:#fffcf7}
      .shopping-trip-item input{width:24px;height:24px;margin:0;accent-color:var(--teal);cursor:pointer}
      .shopping-trip-copy{display:flex;flex-direction:column;gap:2px;min-width:0}.shopping-trip-copy strong{font-size:15px;line-height:1.3}.shopping-trip-copy small{color:var(--muted);line-height:1.3}
      .shopping-in-cart{margin-top:24px}.shopping-in-cart .shopping-trip-item{opacity:.62}.shopping-in-cart .shopping-trip-copy strong{text-decoration:line-through}
      .shopping-trip-empty{padding:24px;border:1px dashed var(--line);border-radius:18px;background:#fffaf3;text-align:center;color:var(--muted);font-weight:750}
      .shopping-trip-form{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(190px,.45fr) auto;gap:10px!important;align-items:center}.shopping-trip-form select{width:100%}
      .shopping-reset-row{display:flex;justify-content:flex-end;margin-top:12px}.shopping-reset-row button{font-size:11px}
      @media(max-width:700px){
        .shopping-trip-form{grid-template-columns:1fr!important}.shopping-trip-form button{width:100%}
        .shopping-department-header{padding:13px 14px}.shopping-department-header h3{font-size:19px}
        .shopping-trip-item{grid-template-columns:32px minmax(0,1fr);min-height:62px;padding:11px 14px}.shopping-trip-item input{width:26px;height:26px}.shopping-trip-copy strong{font-size:15px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDepartmentPicker() {
    const form = document.getElementById('groceryExtraForm');
    if (!form) return;
    form.classList.add('shopping-trip-form');
    const input = form.elements.name;
    if (input) input.placeholder = 'Forgot something? Add it here…';

    if (!form.elements.department) {
      const select = document.createElement('select');
      select.name = 'department';
      select.setAttribute('aria-label', 'Grocery department');
      select.innerHTML = DEPARTMENTS.map(dept => `<option value="${esc(dept)}">${esc(dept)}</option>`).join('');
      const button = form.querySelector('button[type="submit"]');
      form.insertBefore(select, button || null);
    }

    const card = form.closest('.card');
    const hint = card?.querySelector('.hint');
    if (hint) hint.textContent = 'Pick the department so forgotten items land where you will actually find them in the store.';
  }

  function departmentBlock(department, items) {
    if (!items.length) return '';
    return `<section class="shopping-department" data-shopping-department="${esc(department)}">
      <div class="shopping-department-header"><h3>${esc(department)}</h3><span>${items.length} left</span></div>
      <div>${items.map(item => `<label class="shopping-trip-item">
        <input type="checkbox" data-shopping-check="${esc(item.id)}">
        <span class="shopping-trip-copy"><strong>${esc(item.name)}</strong>${item.detail ? `<small>${esc(item.detail)}</small>` : ''}</span>
      </label>`).join('')}</div>
    </section>`;
  }

  function checkedBlock(items) {
    if (!items.length) return '';
    return `<section class="shopping-in-cart">
      <div class="shopping-department">
        <div class="shopping-department-header"><h3>In Cart</h3><span>${items.length} grabbed</span></div>
        <div>${items.map(item => `<label class="shopping-trip-item">
          <input type="checkbox" data-shopping-check="${esc(item.id)}" checked>
          <span class="shopping-trip-copy"><strong>${esc(item.name)}</strong><small>${esc(item.department)}</small></span>
        </label>`).join('')}</div>
      </div>
      <div class="shopping-reset-row"><button type="button" class="secondary" data-reset-shopping-trip>Reset all checkmarks</button></div>
    </section>`;
  }

  function render() {
    const list = document.getElementById('groceryList');
    const summary = document.getElementById('grocerySummary');
    const completed = document.getElementById('groceryCompleted');
    if (!list || !summary || !completed) return;

    rendering = true;
    const trip = loadTrip();
    const remaining = trip.items.filter(item => !item.checked);
    const checked = trip.items.filter(item => item.checked);

    summary.innerHTML = `<span class="summary-chip">${remaining.length} left to grab</span><span class="summary-chip">${checked.length} in cart</span><span class="summary-chip">${trip.items.length} total</span>`;
    list.innerHTML = remaining.length
      ? DEPARTMENTS.map(dept => departmentBlock(dept, remaining.filter(item => item.department === dept))).join('')
      : '<div class="shopping-trip-empty">Everything is in the cart. Tiny raccoon victory. 🦝🛒</div>';
    completed.innerHTML = checkedBlock(checked);
    list.dataset.shoppingTrip = '2026-08-16';
    rendering = false;
  }

  function setChecked(id, checked) {
    const trip = loadTrip();
    const item = trip.items.find(candidate => candidate.id === id);
    if (!item) return;
    item.checked = checked;
    item.checkedAt = checked ? new Date().toISOString() : null;
    saveTrip(trip);
    render();
  }

  function addItem(name, department) {
    const trip = loadTrip();
    trip.items.push({
      id:`manual-${uid()}`,
      name,
      department: DEPARTMENTS.includes(department) ? department : 'Pantry & Canned Goods',
      detail:'Added during this shopping trip.',
      checked:false,
      addedBy:'manual'
    });
    saveTrip(trip);
    render();
  }

  function copyTrip() {
    const trip = loadTrip();
    const remaining = trip.items.filter(item => !item.checked);
    const text = DEPARTMENTS.flatMap(dept => {
      const items = remaining.filter(item => item.department === dept);
      return items.length ? [dept.toUpperCase(), ...items.map(item => `☐ ${item.name}`), ''] : [];
    }).join('\n').trim() || 'Everything is already in the cart.';

    navigator.clipboard.writeText(text)
      .then(() => showToast('Shopping list copied.', `${remaining.length} items still left to grab.`))
      .catch(() => showToast('Copy did not work.', 'The shopping list is still right here in PanCoon.'));
  }

  function resetChecks() {
    const trip = loadTrip();
    trip.items.forEach(item => { item.checked = false; item.checkedAt = null; });
    saveTrip(trip);
    render();
    showToast('Shopping trip reset.', 'All items are back on the department lists.');
  }

  function updatePageCopy() {
    const page = document.querySelector('[data-page="grocery"]');
    if (!page) return;
    const heading = page.querySelector('.grocery-heading');
    if (heading) {
      const eyebrow = heading.querySelector('.eyebrow');
      const h2 = heading.querySelector('h2');
      const p = heading.querySelector('p:not(.eyebrow)');
      if (eyebrow) eyebrow.textContent = 'Today’s grocery run';
      if (h2) h2.textContent = 'Shop the store, department by department';
      if (p) p.textContent = 'Blake runs the list. Parker runs the cart. Tap an item when it lands in the cart.';
    }

    if (!page.querySelector('.shopping-trip-note')) {
      const note = document.createElement('p');
      note.className = 'shopping-trip-note';
      note.innerHTML = '<strong>Store mode:</strong> unchecked items stay grouped by department. Checked items move to In Cart so the remaining list gets shorter as you shop.';
      const summary = document.getElementById('grocerySummary');
      summary?.parentNode?.insertBefore(note, summary);
    }
  }

  function interceptEvents() {
    document.addEventListener('change', event => {
      const checkbox = event.target.closest?.('[data-shopping-check]');
      if (!checkbox) return;
      event.stopImmediatePropagation();
      setChecked(checkbox.dataset.shoppingCheck, checkbox.checked);
    }, true);

    document.addEventListener('submit', event => {
      const form = event.target.closest?.('#groceryExtraForm');
      if (!form) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const name = form.elements.name?.value.trim();
      const department = form.elements.department?.value;
      if (!name) return;
      addItem(name, department);
      form.elements.name.value = '';
      form.elements.name.focus();
      showToast('Added to the shopping trip.', `${name} → ${department}`);
    }, true);

    document.addEventListener('click', event => {
      if (event.target.closest?.('#copyGrocery')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        copyTrip();
        return;
      }
      if (event.target.closest?.('[data-reset-shopping-trip]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        resetChecks();
      }
    }, true);
  }

  function watchForAppRerenders() {
    const list = document.getElementById('groceryList');
    if (!list || observer) return;
    observer = new MutationObserver(() => {
      if (rendering) return;
      if (list.dataset.shoppingTrip !== '2026-08-16') render();
    });
    observer.observe(list, { childList:true });
  }

  function setup() {
    injectStyles();
    ensureDepartmentPicker();
    updatePageCopy();
    render();
    interceptEvents();
    watchForAppRerenders();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once:true });
  } else {
    setup();
  }
})();
