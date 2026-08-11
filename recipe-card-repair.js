(() => {
  'use strict';

  const STATE_KEY = 'pantry-raccoon:v1';
  const RELOAD_FLAG = 'pancoon:recipe-card-repaired';
  const CANONICAL_ZINE_RECIPES = [
    ['broccoli-chicken-stir-fry', 'Broccoli and Chicken Stir Fry'],
    ['celestial-french-dip', 'Celestial French Dip'],
    ['creamy-one-pan-chicken-potatoes', 'Creamy One Pan Chicken and Potatoes'],
    ['egg-roll-in-a-bowl', 'Egg Roll in a Bowl'],
    ['greek-chicken-rice-bowls', 'Greek Chicken Rice Bowls'],
    ['grilled-pizza', 'Grilled Pizza'],
    ['peachy-grilled-pizza', 'Peachy Grilled Pizza'],
    ['roasted-turkey-breast', 'Roasted Turkey Breast'],
    ['sheet-pan-gnocchi-sausage-kale', 'Sheet Pan Gnocchi with Sausage and Kale']
  ];

  let repairing = false;
  let observerTimer = null;

  function readState() {
    try {
      const state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
      state.recipes = Array.isArray(state.recipes) ? state.recipes : [];
      return state;
    } catch {
      return { recipes: [] };
    }
  }

  function writeState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function words(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/\bone[- ]pan\b/g, ' ')
      .replace(/\bcreamy\b/g, ' creamy ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(word => word && !['recipe','easy','best','the','a','an'].includes(word));
  }

  function similarName(a, b) {
    const aa = words(a);
    const bb = words(b);
    if (!aa.length || !bb.length) return false;
    const aText = aa.join(' ');
    const bText = bb.join(' ');
    if (aText === bText || aText.includes(bText) || bText.includes(aText)) return true;
    const aSet = new Set(aa);
    const bSet = new Set(bb);
    const shared = [...aSet].filter(word => bSet.has(word)).length;
    return shared / Math.min(aSet.size, bSet.size) >= 0.72;
  }

  function hasIngredients(recipe) {
    return Array.isArray(recipe?.ingredients) && recipe.ingredients.filter(Boolean).length > 0;
  }

  function copyRecipeDetails(target, source) {
    const keepImage = target.sourceImageUrl || '';
    const fields = ['url','createdBy','servings','prepMinutes','cookMinutes','totalMinutes','ingredients','instructions','notes'];
    for (const field of fields) {
      const value = source[field];
      if (Array.isArray(value)) target[field] = [...value];
      else if (value !== undefined && value !== null && value !== '') target[field] = value;
    }
    target.sourceImageUrl = keepImage || source.sourceImageUrl || '';
    target.awaitingSource = false;
    target.updatedAt = new Date().toISOString();
  }

  function mergeDuplicateRecipes(state) {
    let changed = false;
    const removeIds = new Set();

    for (const [id, canonicalName] of CANONICAL_ZINE_RECIPES) {
      const target = state.recipes.find(recipe => recipe.id === id);
      if (!target || hasIngredients(target)) {
        if (target?.awaitingSource && hasIngredients(target)) {
          target.awaitingSource = false;
          changed = true;
        }
        continue;
      }

      const donor = state.recipes.find(recipe =>
        recipe.id !== id &&
        hasIngredients(recipe) &&
        (similarName(recipe.name, target.name || canonicalName) || (target.url && recipe.url && target.url === recipe.url))
      );

      if (!donor) continue;
      copyRecipeDetails(target, donor);

      const exactName = words(donor.name).join(' ') === words(target.name || canonicalName).join(' ');
      const sameUrl = Boolean(target.url && donor.url && target.url === donor.url);
      if (exactName || sameUrl) removeIds.add(donor.id);
      changed = true;
    }

    if (removeIds.size) {
      state.recipes = state.recipes.filter(recipe => !removeIds.has(recipe.id));
    }
    return changed;
  }

  async function fillFromSavedUrl(recipe) {
    if (!recipe?.url || hasIngredients(recipe)) return false;
    let url;
    try {
      url = new URL(recipe.url);
      if (url.protocol !== 'https:') return false;
    } catch {
      return false;
    }

    const response = await fetch(`/api/recipe-context?url=${encodeURIComponent(url.href)}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return false;
    if (!Array.isArray(data.ingredients) || !data.ingredients.filter(Boolean).length) return false;

    const keepImage = recipe.sourceImageUrl || '';
    recipe.name = recipe.name || data.name || 'Saved recipe';
    recipe.prepMinutes = Number(data.prepMinutes) || recipe.prepMinutes || 0;
    recipe.cookMinutes = Number(data.cookMinutes) || recipe.cookMinutes || 0;
    recipe.totalMinutes = Number(data.totalMinutes) || recipe.totalMinutes || recipe.prepMinutes + recipe.cookMinutes;
    recipe.servings = data.servings || recipe.servings || '';
    recipe.ingredients = data.ingredients.filter(Boolean);
    recipe.instructions = Array.isArray(data.instructions) ? data.instructions.filter(Boolean) : recipe.instructions || [];
    recipe.url = data.sourceUrl || recipe.url;
    recipe.sourceImageUrl = keepImage || data.imageUrl || '';
    recipe.awaitingSource = false;
    recipe.updatedAt = new Date().toISOString();
    return true;
  }

  async function repairRecipeCards() {
    if (repairing) return;
    repairing = true;
    try {
      const state = readState();
      let changed = mergeDuplicateRecipes(state);

      for (const [id] of CANONICAL_ZINE_RECIPES) {
        const recipe = state.recipes.find(item => item.id === id);
        if (!recipe || hasIngredients(recipe) || !recipe.url) continue;
        try {
          if (await fillFromSavedUrl(recipe)) changed = true;
        } catch {
          // Some recipe sites block readers. Leave the saved URL intact so the
          // user can retry later instead of turning a failed import into data loss.
        }
      }

      if (!changed) return;
      writeState(state);
      sessionStorage.setItem(RELOAD_FLAG, '1');
      location.reload();
    } finally {
      repairing = false;
    }
  }

  function setup() {
    if (sessionStorage.getItem(RELOAD_FLAG) === '1') {
      sessionStorage.removeItem(RELOAD_FLAG);
      location.hash = 'recipes';
    }

    repairRecipeCards();

    const shelf = document.getElementById('recipeShelf');
    if (shelf) {
      const observer = new MutationObserver(() => {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(repairRecipeCards, 350);
      });
      observer.observe(shelf, { childList: true, subtree: true });
    }

    document.addEventListener('submit', event => {
      if (!event.target?.matches?.('#recipeForm,#recipeImportForm')) return;
      setTimeout(repairRecipeCards, 1200);
      setTimeout(repairRecipeCards, 4500);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();