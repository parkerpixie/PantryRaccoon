(() => {
  'use strict';

  const STORAGE_KEY = 'pantry-raccoon:v1';
  const SEED_FLAG = 'pancoon:week-2026-09-06:extra-slots:v1';
  if (localStorage.getItem(SEED_FLAG) === 'done') return;

  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { state = {}; }

  state.plan = state.plan && typeof state.plan === 'object' ? state.plan : {};

  // PanCoon's current Plan screen only renders weekend lunches and dinners,
  // but keep these meals in the canonical local plan now so future UI/MTS
  // integration does not lose the meals Parker actually planned.
  state.plan['2026-09-07:breakfast'] = {
    choice: 'recipe:belgian-waffles-blueberry-compote',
    cook: 'Parker'
  };
  state.plan['2026-09-07:lunch'] = {
    choice: 'recipe:luna-ozzy-grilled-cheese-zoup',
    cook: 'Parker'
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(SEED_FLAG, 'done');
})();
