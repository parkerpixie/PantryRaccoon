(() => {
  'use strict';

  const FORM_ID = 'recipeForm';

  function showToast(title, detail = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const strong = toast.querySelector('strong');
    const span = toast.querySelector('span');
    if (strong) strong.textContent = title;
    if (span) span.textContent = detail;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 3600);
  }

  function cleanLines(value) {
    return String(value || '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  }

  function validRecipeUrl(raw) {
    try {
      const url = new URL(String(raw || '').trim());
      return url.protocol === 'https:' ? url : null;
    } catch {
      return null;
    }
  }

  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? 'Reading recipe…' : 'Save recipe';
  }

  function addUrlHint(form) {
    const input = form.elements.url;
    const label = input?.closest('label');
    if (!label || label.querySelector('.recipe-url-save-hint')) return;
    const hint = document.createElement('small');
    hint.className = 'recipe-url-save-hint';
    hint.style.cssText = 'display:block;margin-top:6px;color:var(--muted);font-weight:600;line-height:1.4';
    hint.textContent = 'Paste a recipe link and hit Save. PanCoon will pull the recipe name, ingredients, directions, times, and servings for you.';
    label.appendChild(hint);
  }

  function requireManualFields(form) {
    const name = form.elements.name;
    const ingredients = form.elements.ingredients;

    name.setCustomValidity('');
    ingredients.setCustomValidity('');

    if (!name.value.trim()) {
      name.setCustomValidity('Add a recipe name, or paste a Source URL so PanCoon can find it.');
      name.reportValidity();
      name.focus();
      return false;
    }

    if (!cleanLines(ingredients.value).length) {
      ingredients.setCustomValidity('Add at least one ingredient, or paste a Source URL so PanCoon can fill this in.');
      ingredients.reportValidity();
      ingredients.focus();
      return false;
    }

    return true;
  }

  async function fillFromUrl(form, url) {
    const response = await fetch(`/api/recipe-context?url=${encodeURIComponent(url.href)}`, {
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'PanCoon could not read that recipe page.');

    const ingredients = Array.isArray(data.ingredients) ? data.ingredients.filter(Boolean) : [];
    if (!ingredients.length) throw new Error('I found the page, but could not find a readable ingredient list.');

    if (!form.elements.name.value.trim()) {
      form.elements.name.value = data.name || url.hostname.replace(/^www\./, '');
    }
    if (!cleanLines(form.elements.ingredients.value).length) {
      form.elements.ingredients.value = ingredients.join('\n');
    }
    if (!cleanLines(form.elements.instructions.value).length && Array.isArray(data.instructions)) {
      form.elements.instructions.value = data.instructions.filter(Boolean).join('\n');
    }
    if (!Number(form.elements.prepMinutes.value) && Number(data.prepMinutes)) {
      form.elements.prepMinutes.value = Number(data.prepMinutes);
    }
    if (!Number(form.elements.cookMinutes.value) && Number(data.cookMinutes)) {
      form.elements.cookMinutes.value = Number(data.cookMinutes);
    }
    if (!form.elements.servings.value.trim() && data.servings) {
      form.elements.servings.value = data.servings;
    }
    if (data.sourceUrl) {
      form.elements.url.value = data.sourceUrl;
    }

    return data;
  }

  async function captureRecipeSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;

    const rawUrl = form.elements.url.value.trim();
    const needsImport = Boolean(rawUrl) && (
      !form.elements.name.value.trim() ||
      !cleanLines(form.elements.ingredients.value).length
    );

    if (!needsImport) {
      if (!requireManualFields(form)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const url = validRecipeUrl(rawUrl);
    if (!url) {
      form.elements.url.setCustomValidity('Paste a full HTTPS recipe link.');
      form.elements.url.reportValidity();
      form.elements.url.focus();
      return;
    }
    form.elements.url.setCustomValidity('');

    setBusy(form, true);
    showToast('Reading the recipe link…', 'The raccoon is rummaging through the ingredient list.');

    try {
      const data = await fillFromUrl(form, url);
      showToast('Recipe details found.', `${data.ingredients.length} ingredients pulled in. Saving now…`);
      setBusy(form, false);
      form.requestSubmit(form.querySelector('button[type="submit"]'));
    } catch (error) {
      setBusy(form, false);
      showToast('Recipe import failed.', error.message || 'That site would not give PanCoon a readable recipe card.');
    }
  }

  function loadRepairHelper() {
    if (document.querySelector('script[data-pancoon-recipe-repair]')) return;
    const script = document.createElement('script');
    script.src = '/recipe-card-repair.js?v=20260811-0612';
    script.defer = true;
    script.dataset.pancoonRecipeRepair = 'true';
    document.head.appendChild(script);
  }

  function setup() {
    const form = document.getElementById(FORM_ID);
    if (!form) return;

    // Native required-field validation used to stop the submit before PanCoon
    // had a chance to read the URL. We validate manually so URL-only saves work.
    form.noValidate = true;
    addUrlHint(form);
    loadRepairHelper();

    form.elements.name?.addEventListener('input', () => form.elements.name.setCustomValidity(''));
    form.elements.ingredients?.addEventListener('input', () => form.elements.ingredients.setCustomValidity(''));
    form.elements.url?.addEventListener('input', () => form.elements.url.setCustomValidity(''));

    document.addEventListener('submit', captureRecipeSubmit, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();

// One-time loader for the finalized Aug 16–20 family meal week. The seed file
// guards itself with a localStorage flag, so future visits do not overwrite
// any changes Parker makes after the week is installed.
(() => {
  if (document.querySelector('script[data-pancoon-aug16-week]')) return;
  const script = document.createElement('script');
  script.src = '/weekly-plan-2026-08-16.js?v=20260815-1';
  script.defer = true;
  script.dataset.pancoonAug16Week = 'true';
  document.head.appendChild(script);
})();

// Department-based store mode for the Aug 16 grocery run. This is separate
// from recipe-derived grocery suggestions so Parker and Blake can work from
// the exact curated list they agreed on for today's trip.
(() => {
  if (document.querySelector('script[data-pancoon-shopping-trip]')) return;
  const script = document.createElement('script');
  script.src = '/shopping-list-2026-08-16.js?v=20260816-1';
  script.defer = true;
  script.dataset.pancoonShoppingTrip = 'true';
  document.head.appendChild(script);
})();

// Automation-ready inventory contract. This intentionally stays separate from
// PanCoon's legacy local state so the richer schema can evolve safely before a
// future Supabase/n8n integration becomes the source of truth.
(() => {
  if (document.querySelector('script[data-pancoon-inventory-contract]')) return;
  const script = document.createElement('script');
  script.src = '/inventory-contract-v2.js?v=20260830-1';
  script.defer = true;
  script.dataset.pancoonInventoryContract = 'true';
  document.head.appendChild(script);
})();