(() => {
  'use strict';

  const STATE_KEY = 'pantry-raccoon:v1';
  const LEGACY_NOTES_KEY = 'pantry-raccoon:inventory-notes:v1';
  const META_KEY = 'pantry-raccoon:inventory-meta:v2';
  const SCHEMA_VERSION = 2;
  const INVENTORY_KINDS = ['pantry', 'fridge', 'freezer'];
  const DEFAULT_LOCATIONS = { pantry: 'Pantry', fridge: 'Fridge', freezer: 'Upstairs' };
  const UNIT_OPTIONS = [
    ['', 'Unit'],
    ['item', 'item(s)'],
    ['can', 'can(s)'],
    ['jar', 'jar(s)'],
    ['box', 'box(es)'],
    ['bag', 'bag(s)'],
    ['bottle', 'bottle(s)'],
    ['package', 'package(s)'],
    ['tub', 'tub(s)'],
    ['carton', 'carton(s)'],
    ['container', 'container(s)'],
    ['portion', 'portion(s)'],
    ['lb', 'lb'],
    ['oz', 'oz'],
    ['cup', 'cup(s)'],
    ['gallon', 'gallon(s)'],
    ['other', 'other']
  ];

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function nowIso() { return new Date().toISOString(); }
  function todayKey() { return nowIso().slice(0, 10); }

  function readState() {
    const state = readJson(STATE_KEY, {});
    state.inventories = state.inventories && typeof state.inventories === 'object'
      ? state.inventories
      : {};
    for (const kind of INVENTORY_KINDS) {
      state.inventories[kind] = Array.isArray(state.inventories[kind])
        ? state.inventories[kind]
        : [];
    }
    return state;
  }

  function readMeta() {
    const raw = readJson(META_KEY, {});
    return {
      schemaVersion: SCHEMA_VERSION,
      items: raw.items && typeof raw.items === 'object' ? raw.items : {},
      migratedAt: raw.migratedAt || ''
    };
  }

  function canonicalUnit(raw) {
    const value = String(raw || '').trim().toLowerCase().replace(/\./g, '');
    const aliases = {
      items:'item', item:'item',
      cans:'can', can:'can',
      jars:'jar', jar:'jar',
      boxes:'box', box:'box',
      bags:'bag', bag:'bag',
      bottles:'bottle', bottle:'bottle',
      packages:'package', package:'package', pkg:'package', pkgs:'package',
      tubs:'tub', tub:'tub',
      cartons:'carton', carton:'carton',
      containers:'container', container:'container',
      portions:'portion', portion:'portion',
      pounds:'lb', pound:'lb', lbs:'lb', lb:'lb',
      ounces:'oz', ounce:'oz', oz:'oz',
      cups:'cup', cup:'cup',
      gallons:'gallon', gallon:'gallon'
    };
    return aliases[value] || (UNIT_OPTIONS.some(([unit]) => unit === value) ? value : '');
  }

  function fractionValue(raw) {
    const text = String(raw || '').trim().toLowerCase();
    if (!text) return null;
    if (/^(half|1\/2)$/.test(text)) return 0.5;
    if (/^(quarter|1\/4)$/.test(text)) return 0.25;
    if (/^(three quarters|3\/4)$/.test(text)) return 0.75;
    if (/^\d+\s+\d+\/\d+$/.test(text)) {
      const [whole, frac] = text.split(/\s+/);
      const [n, d] = frac.split('/').map(Number);
      return d ? Number(whole) + n / d : null;
    }
    if (/^\d+\/\d+$/.test(text)) {
      const [n, d] = text.split('/').map(Number);
      return d ? n / d : null;
    }
    const number = Number(text.replace(/,/g, ''));
    return Number.isFinite(number) ? number : null;
  }

  function parseLegacyQuantity(raw) {
    const text = String(raw || '').trim();
    if (!text) return { quantityValue: null, unit: '' };

    const lower = text.toLowerCase()
      .replace(/^about\s+/, '')
      .replace(/^approx(?:imately)?\s+/, '')
      .replace(/^almost\s+/, '');

    const unitMatch = lower.match(/\b(items?|cans?|jars?|boxes?|bags?|bottles?|packages?|pkg|pkgs|tubs?|cartons?|containers?|portions?|pounds?|lbs?|lb|ounces?|oz|cups?|gallons?)\b/);
    const unit = canonicalUnit(unitMatch?.[1] || '');

    const quantityMatch = lower.match(/^(half|quarter|three quarters|\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/);
    return {
      quantityValue: fractionValue(quantityMatch?.[1] || ''),
      unit
    };
  }

  function formatQuantity(value, unit, fallback = '') {
    const hasValue = value !== null && value !== undefined && value !== '';
    if (!hasValue && !unit) return fallback || 'Quantity not set';
    const number = hasValue ? String(value) : '';
    if (!unit) return number || fallback || 'Quantity not set';
    const label = unit === 'item'
      ? (Number(value) === 1 ? 'item' : 'items')
      : unit;
    return `${number} ${label}`.trim();
  }

  function ensureMetaForItem(meta, kind, item, legacyNotes, migratedAt) {
    const existing = meta.items[item.id] || {};
    const parsed = parseLegacyQuantity(item.quantity);
    const notes = existing.notes || legacyNotes[item.id] || item.notes || '';

    meta.items[item.id] = {
      schemaVersion: SCHEMA_VERSION,
      kind,
      quantityValue: existing.quantityValue ?? parsed.quantityValue,
      unit: existing.unit || parsed.unit || '',
      expirationDate: existing.expirationDate || item.expirationDate || '',
      bestByDate: existing.bestByDate || item.bestByDate || '',
      dateAdded: existing.dateAdded || item.dateAdded || '',
      notes,
      source: existing.source || item.source || 'legacy-manual',
      createdAt: existing.createdAt || item.createdAt || null,
      updatedAt: existing.updatedAt || item.updatedAt || null,
      migratedAt: existing.migratedAt || migratedAt
    };
  }

  function migrateExistingInventory() {
    const state = readState();
    const legacyNotes = readJson(LEGACY_NOTES_KEY, {});
    const meta = readMeta();
    const migratedAt = meta.migratedAt || nowIso();
    const liveIds = new Set();

    for (const kind of INVENTORY_KINDS) {
      for (const item of state.inventories[kind]) {
        if (!item?.id) continue;
        liveIds.add(item.id);
        ensureMetaForItem(meta, kind, item, legacyNotes, migratedAt);
      }
    }

    for (const id of Object.keys(meta.items)) {
      if (!liveIds.has(id)) delete meta.items[id];
    }

    meta.schemaVersion = SCHEMA_VERSION;
    meta.migratedAt = migratedAt;
    writeJson(META_KEY, meta);
    return meta;
  }

  function selectMarkup() {
    return UNIT_OPTIONS.map(([value, label]) =>
      `<option value="${value}">${label}</option>`
    ).join('');
  }

  function addFieldAfter(reference, field) {
    reference.insertAdjacentElement('afterend', field);
    return field;
  }

  function enhanceForm(form) {
    if (form.dataset.inventoryContractReady === 'true') return;
    const kind = form.dataset.inventoryForm;
    if (!INVENTORY_KINDS.includes(kind)) return;

    const quantity = form.elements.quantity;
    if (quantity) {
      quantity.placeholder = '2 / 1/2 / 3';
      quantity.inputMode = 'decimal';
      quantity.setAttribute('aria-label', 'Quantity');

      const unit = document.createElement('select');
      unit.name = 'inventoryUnit';
      unit.setAttribute('aria-label', 'Quantity unit');
      unit.innerHTML = selectMarkup();
      addFieldAfter(quantity, unit);
    }

    const existingNotes = form.elements.notes;
    let anchor = existingNotes || form.elements.status || form.elements.location || form.elements.category;

    const date = document.createElement('input');
    date.type = 'date';
    date.name = 'inventoryDate';
    date.className = 'inventory-contract-date';
    date.setAttribute(
      'aria-label',
      kind === 'fridge' ? 'Expiration date' : 'Best-by date'
    );
    date.title = kind === 'fridge' ? 'Expiration date' : 'Best-by date';
    addFieldAfter(anchor, date);
    anchor = date;

    if (existingNotes) {
      existingNotes.placeholder = 'Notes: opened Tuesday, use first…';
      existingNotes.setAttribute('aria-label', 'Inventory notes');
    } else {
      const notes = document.createElement('input');
      notes.type = 'text';
      notes.name = 'notes';
      notes.className = 'inventory-note-input';
      notes.autocomplete = 'off';
      notes.placeholder = 'Notes: backup jar, use first…';
      notes.setAttribute('aria-label', 'Inventory notes');
      addFieldAfter(anchor, notes);
    }

    form.dataset.inventoryContractReady = 'true';
  }

  function enhanceForms() {
    document.querySelectorAll('[data-inventory-form]').forEach(enhanceForm);
  }

  const pendingSubmissions = new WeakMap();

  function captureInventorySubmit(event) {
    const form = event.target.closest?.('[data-inventory-form]');
    if (!form) return;

    const kind = form.dataset.inventoryForm;
    const state = readState();
    const beforeIds = new Set((state.inventories[kind] || []).map(item => item.id));
    const quantityRaw = form.elements.quantity?.value.trim() || '';
    const parsed = parseLegacyQuantity(quantityRaw);
    const unit = form.elements.inventoryUnit?.value || parsed.unit || '';
    const date = form.elements.inventoryDate?.value || '';
    const notes = form.elements.notes?.value.trim() || '';
    const capturedAt = nowIso();

    pendingSubmissions.set(form, {
      kind,
      beforeIds,
      quantityValue: parsed.quantityValue,
      unit,
      date,
      notes,
      capturedAt
    });

    setTimeout(() => finalizeInventorySubmit(form), 0);
  }

  function finalizeInventorySubmit(form) {
    const pending = pendingSubmissions.get(form);
    pendingSubmissions.delete(form);
    if (!pending) return;

    const state = readState();
    const list = state.inventories[pending.kind] || [];
    const item = list.find(candidate => candidate?.id && !pending.beforeIds.has(candidate.id));
    if (!item) return;

    const meta = readMeta();
    meta.items[item.id] = {
      schemaVersion: SCHEMA_VERSION,
      kind: pending.kind,
      quantityValue: pending.quantityValue,
      unit: pending.unit,
      expirationDate: pending.kind === 'fridge' ? pending.date : '',
      bestByDate: pending.kind === 'fridge' ? '' : pending.date,
      dateAdded: todayKey(),
      notes: pending.notes,
      source: 'manual',
      createdAt: pending.capturedAt,
      updatedAt: pending.capturedAt,
      migratedAt: pending.capturedAt
    };
    writeJson(META_KEY, meta);
    decorateInventory(pending.kind);
  }

  function captureStatusChange(event) {
    const button = event.target.closest?.('[data-inventory-status]');
    if (!button) return;
    const id = button.dataset.inventoryStatus;
    const kind = button.dataset.inventoryKind;
    setTimeout(() => {
      const meta = readMeta();
      const current = meta.items[id] || {
        schemaVersion: SCHEMA_VERSION,
        kind,
        source: 'legacy-manual',
        createdAt: null,
        migratedAt: nowIso()
      };
      current.updatedAt = nowIso();
      meta.items[id] = current;
      writeJson(META_KEY, meta);
    }, 0);
  }

  function dateLabel(kind, itemMeta) {
    if (kind === 'fridge' && itemMeta.expirationDate) {
      return `Expires ${itemMeta.expirationDate}`;
    }
    if (kind !== 'fridge' && itemMeta.bestByDate) {
      return `Best by ${itemMeta.bestByDate}`;
    }
    return '';
  }

  function inventoryItemId(card) {
    return card.querySelector('[data-inventory-status]')?.dataset.inventoryStatus || '';
  }

  function decorateInventory(kind) {
    const target = document.getElementById(`${kind}List`);
    if (!target) return;

    const state = readState();
    const meta = readMeta();
    const byId = new Map((state.inventories[kind] || []).map(item => [item.id, item]));

    target.querySelectorAll('.inventory-item').forEach(card => {
      const id = inventoryItemId(card);
      const item = byId.get(id);
      const itemMeta = meta.items[id];
      if (!item || !itemMeta) return;

      const quantityLine = card.querySelector('div:first-child > small');
      if (quantityLine) {
        const quantity = formatQuantity(itemMeta.quantityValue, itemMeta.unit, item.quantity);
        const location = kind === 'freezer' ? ` · ${item.location || DEFAULT_LOCATIONS.freezer}` : '';
        quantityLine.textContent = `${quantity}${location}`;
      }

      card.querySelector('.inventory-contract-meta')?.remove();
      const pieces = [dateLabel(kind, itemMeta)];
      if (kind === 'pantry' && itemMeta.notes) pieces.push(itemMeta.notes);
      const text = pieces.filter(Boolean).join(' · ');
      if (text) {
        const line = document.createElement('small');
        line.className = 'inventory-contract-meta';
        line.textContent = text;
        card.querySelector('div:first-child')?.appendChild(line);
      }
    });
  }

  function decorateAllInventory() {
    INVENTORY_KINDS.forEach(decorateInventory);
  }

  function observeInventoryRenders() {
    for (const kind of INVENTORY_KINDS) {
      const target = document.getElementById(`${kind}List`);
      if (!target) continue;
      new MutationObserver(() => decorateInventory(kind))
        .observe(target, { childList: true, subtree: true });
    }
  }

  function mergedItems() {
    const state = readState();
    const meta = readMeta();
    const items = [];

    for (const kind of INVENTORY_KINDS) {
      for (const item of state.inventories[kind]) {
        const details = meta.items[item.id] || {};
        items.push({
          id: item.id,
          name: item.name || '',
          kind,
          quantity: item.quantity || '',
          quantityValue: details.quantityValue ?? null,
          unit: details.unit || '',
          status: item.status || 'plenty',
          category: item.category || 'Other',
          location: item.location || DEFAULT_LOCATIONS[kind],
          expirationDate: details.expirationDate || '',
          bestByDate: details.bestByDate || '',
          dateAdded: details.dateAdded || '',
          notes: details.notes || '',
          source: details.source || 'legacy-manual',
          createdAt: details.createdAt || null,
          updatedAt: details.updatedAt || null
        });
      }
    }

    return items;
  }

  function exportPayload() {
    return {
      schema: 'pancoon.inventory',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIso(),
      items: mergedItems()
    };
  }

  function installBridge() {
    window.PanCoonInventoryBridge = Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      getAll: mergedItems,
      exportPayload
    });
  }

  function installStyles() {
    if (document.getElementById('pancoon-inventory-contract-styles')) return;
    const style = document.createElement('style');
    style.id = 'pancoon-inventory-contract-styles';
    style.textContent = `
      .inventory-contract-date{min-width:142px}
      .inventory-contract-meta{margin-top:6px!important;color:var(--teal,#4f8077)!important;font-weight:700;line-height:1.35}
      @media(max-width:1150px){.inventory-form,.freezer-form{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:760px){.inventory-form,.freezer-form{grid-template-columns:1fr 1fr}.inventory-form .primary,.freezer-form .primary,.inventory-note-input{grid-column:1/-1}}
    `;
    document.head.appendChild(style);
  }

  function start() {
    migrateExistingInventory();
    installStyles();
    enhanceForms();
    installBridge();
    observeInventoryRenders();
    decorateAllInventory();

    document.addEventListener('submit', captureInventorySubmit, true);
    document.addEventListener('click', captureStatusChange, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
