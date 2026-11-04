(() => {
  'use strict';

  const SETTINGS_KEY = 'pancoon:settings:v1';
  const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const LEGACY_SNAPSHOT_KEY = 'pancoon:prelaunch-safety-snapshot:v1';
  const FIRST_INSTALL = Boolean(window.PanCoonFirstInstall);
  const LEGACY_INSTALL = Boolean(window.PanCoonLegacyInstall);
  let wizardStep = 0;
  let wizardDraft = null;

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[char]));

  function safeDay(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 && number <= 6 ? number : fallback;
  }

  function normalize(value) {
    const raw = value && typeof value === 'object' ? value : {};
    const meals = Array.isArray(raw.meals) ? [...new Set(raw.meals.filter(meal => MEALS.includes(meal)))] : ['dinner', 'lunch'];
    const mealDays = {};
    if (raw.mealDays && typeof raw.mealDays === 'object') {
      DAYS.forEach((_, index) => {
        if (Array.isArray(raw.mealDays[index])) {
          mealDays[index] = [...new Set(raw.mealDays[index].filter(meal => MEALS.includes(meal)))];
        }
      });
    }
    return {
      version: 1,
      weekStart: safeDay(raw.weekStart, 0),
      planningDay: safeDay(raw.planningDay, 6),
      meals,
      mealDays,
      members: Array.isArray(raw.members)
        ? [...new Set(raw.members.filter(name => typeof name === 'string').map(name => name.trim()).filter(Boolean))]
        : [],
      setupComplete: Boolean(raw.setupComplete)
    };
  }

  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
    catch (_) { return normalize({}); }
  }

  function save(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalize({...settings, setupComplete:true})));
    window.dispatchEvent(new Event('pancoon:settings-changed'));
    renderSettings();
  }

  function toast(title, message) {
    const node = document.getElementById('toast');
    if (!node) return;
    const strong = node.querySelector('strong');
    const span = node.querySelector('span');
    if (strong) strong.textContent = title;
    if (span) span.textContent = message || '';
    node.classList.add('show');
    setTimeout(() => node.classList.remove('show'), 4000);
  }

  function weekdayOptions(selected) {
    return DAYS.map((name, index) => '<option value="' + index + '"' + (index === selected ? ' selected' : '') + '>' + name + '</option>').join('');
  }

  function mealLabel(meal) {
    return meal.charAt(0).toUpperCase() + meal.slice(1);
  }

  function mealChecks(selected, name, dayIndex) {
    return MEALS.map(meal => {
      const dayAttribute = dayIndex === undefined ? '' : ' data-day="' + dayIndex + '"';
      return '<label class="pancoon-meal-check"><input type="checkbox" name="' + name +
        '" value="' + meal + '"' + dayAttribute + (selected.includes(meal) ? ' checked' : '') +
        '> ' + mealLabel(meal) + '</label>';
    }).join('');
  }

  function dayRows(config) {
    return DAYS.map((day, dayIndex) => {
      const enabled = Array.isArray(config.mealDays[dayIndex]) ? config.mealDays[dayIndex] : config.meals;
      return '<div class="pancoon-day-row"><strong>' + day + '</strong><div class="pancoon-meal-options">' +
        mealChecks(enabled, 'dayMeals', dayIndex) + '</div></div>';
    }).join('');
  }

  function renderSettings() {
    const target = document.getElementById('settingsPage');
    if (!target) return;
    const config = load();
    target.innerHTML =
      '<div class="page-heading"><div><p class="eyebrow">Your kitchen</p><h2>Make PanCoon yours</h2>' +
      '<p>Choose your week, the meals you plan, and the people who cook. Your saved kitchen stays on this device for now.</p></div></div>' +
      '<article class="card pancoon-settings-card">' +
      '<form id="pancoonSettingsForm">' +
      '<div class="pancoon-setting-pair">' +
      '<label>My week begins<select name="weekStart">' + weekdayOptions(config.weekStart) + '</select></label>' +
      '<label>I usually meal plan on<select name="planningDay">' + weekdayOptions(config.planningDay) + '</select></label></div>' +
      '<fieldset><legend>Meals I usually plan</legend><div class="pancoon-meal-options" id="pancoonDefaultMeals">' +
      mealChecks(config.meals, 'defaultMeals') + '</div><p class="hint">Pick your usual meals, then customize any day below.</p></fieldset>' +
      '<fieldset><legend>Customize meals by day</legend><p class="hint">Uncheck a meal to hide it from that day. Existing saved meals are not deleted.</p>' +
      '<button type="button" class="secondary small-button" id="pancoonApplyMeals">Apply usual meals to every day</button>' +
      '<div class="pancoon-day-list">' + dayRows(config) + '</div></fieldset>' +
      '<label class="pancoon-members-label">People who cook <span>(optional, one per line)</span>' +
      '<textarea name="members" rows="3" placeholder="Add household names">' + escapeHtml(config.members.join('\n')) + '</textarea></label>' +
      '<div class="button-row"><button class="primary" type="submit">Save my kitchen settings</button>' +
      '<button class="secondary" type="button" id="pancoonRestartSetup">Walk through setup again</button></div>' +
      '</form></article>' +
      '<article class="card pancoon-settings-card"><h3>Keep a copy of your kitchen</h3>' +
      '<p>Your recipes, zines, meal plans, and inventory are currently saved in this browser. Export a backup before clearing browser data or moving devices.</p>' +
      '<div class="button-row"><button class="secondary" id="pancoonExportBackup" type="button">Download kitchen backup</button>' +
      '<button class="secondary" id="pancoonImportBackup" type="button">Restore a backup</button></div>' +
      '<input id="pancoonBackupFile" type="file" accept=".json,application/json" hidden>' +
      '<p class="hint">A backup is not cloud sync. Restore only files you trust. You can also use this to move your kitchen to another device.</p></article>';
  }

  function readSelected(root, selector) {
    return [...root.querySelectorAll(selector + ':checked')].map(node => node.value).filter(meal => MEALS.includes(meal));
  }

  function settingsSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const config = load();
    config.weekStart = safeDay(form.elements.weekStart.value, 0);
    config.planningDay = safeDay(form.elements.planningDay.value, 6);
    config.meals = readSelected(form, '[name="defaultMeals"]');
    if (!config.meals.length) {
      toast('Choose at least one usual meal.', 'You can still turn it off for individual days.');
      return;
    }
    config.mealDays = {};
    DAYS.forEach((_, index) => {
      const selected = [...form.querySelectorAll('[name="dayMeals"][data-day="' + index + '"]:checked')]
        .map(node => node.value).filter(meal => MEALS.includes(meal));
      if (selected.join('|') !== config.meals.join('|')) config.mealDays[index] = selected;
    });
    config.members = String(form.elements.members.value || '').split(/\r?\n/).map(name => name.trim()).filter(Boolean);
    save(config);
    toast('Your kitchen settings are saved.', 'The meal plan and grocery list now use your schedule.');
  }

  function backupStorage() {
    const storage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || (!key.startsWith('pantry-raccoon:') && !key.startsWith('pancoon:'))) continue;
      if (key === LEGACY_SNAPSHOT_KEY) continue;
      storage[key] = localStorage.getItem(key);
    }
    return storage;
  }

  function exportBackup() {
    const data = {app:'PanCoon', schemaVersion:1, exportedAt:new Date().toISOString(), storage:backupStorage()};
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pancoon-kitchen-backup-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Your kitchen backup is downloading.', 'Keep this file somewhere safe.');
  }

  async function restoreBackup(file) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('This backup is too large.');
      const data = JSON.parse(await file.text());
      if (data?.app !== 'PanCoon' || data?.schemaVersion !== 1 ||
          !data.storage || typeof data.storage !== 'object' || Array.isArray(data.storage)) {
        throw new Error('That file is not a PanCoon kitchen backup.');
      }
      const entries = Object.entries(data.storage);
      if (!entries.length || !entries.some(([key]) => key === 'pantry-raccoon:v1')) {
        throw new Error('This backup does not contain a PanCoon kitchen.');
      }
      if (!entries.every(([key, value]) =>
        (key.startsWith('pantry-raccoon:') || key.startsWith('pancoon:')) &&
        key !== LEGACY_SNAPSHOT_KEY && typeof value === 'string')) {
        throw new Error('This backup contains unexpected information.');
      }
      const kitchen = JSON.parse(data.storage['pantry-raccoon:v1']);
      if (!kitchen || typeof kitchen !== 'object' || !Array.isArray(kitchen.recipes) ||
          !kitchen.plan || typeof kitchen.plan !== 'object') {
        throw new Error('This backup has an invalid kitchen record.');
      }
      if (!confirm('Restore this backup? It will replace matching PanCoon data on this device. Download your current kitchen backup first if you want to keep it.')) return;
      entries.forEach(([key, value]) => localStorage.setItem(key, value));
      location.reload();
    } catch (error) {
      toast('Could not restore that backup.', error.message || 'Please select a valid PanCoon JSON backup.');
    }
  }

  function wizardContent() {
    if (wizardStep === 0) {
      return '<h2 id="pancoonSetupTitle">🦝 Welcome to PanCoon</h2><p>What day should your meal-planning week begin?</p>' +
        '<label>My week starts<select id="pancoonWizardWeek">' + weekdayOptions(wizardDraft.weekStart) + '</select></label>';
    }
    if (wizardStep === 1) {
      return '<h2 id="pancoonSetupTitle">When do you plan meals?</h2><p>Choose your usual planning day. We will remember it in your settings.</p>' +
        '<label>I usually plan on<select id="pancoonWizardPlanning">' + weekdayOptions(wizardDraft.planningDay) + '</select></label>';
    }
    return '<h2 id="pancoonSetupTitle">Which meals should we plan?</h2><p>Choose the meals you normally want in your week. You can customize individual days afterward.</p>' +
      '<div class="pancoon-meal-options" id="pancoonWizardMeals">' + mealChecks(wizardDraft.meals, 'wizardMeals') + '</div>' +
      '<p class="hint">Your Recipe Box, pantry, fridge, and freezer start empty. Add only what you actually use.</p>';
  }

  function renderWizard() {
    const dialog = document.getElementById('pancoonSetupDialog');
    if (!dialog) return;
    dialog.innerHTML =
      '<div class="pancoon-wizard"><p class="eyebrow">Kitchen setup · Step ' + (wizardStep + 1) + ' of 3</p>' +
      '<div class="pancoon-wizard-progress"><span style="width:' + ((wizardStep + 1) / 3 * 100) + '%"></span></div>' +
      wizardContent() +
      '<div class="pancoon-wizard-actions">' +
      '<button type="button" class="secondary" id="pancoonWizardBack" ' + (wizardStep === 0 ? 'disabled' : '') + '>Back</button>' +
      '<button type="button" class="primary" id="pancoonWizardNext">' + (wizardStep === 2 ? 'Finish setup' : 'Continue') + '</button></div>' +
      '<button type="button" id="pancoonWizardSkip" class="pancoon-wizard-skip">Use default settings for now</button></div>';
  }

  function readWizardCurrentStep() {
    const dialog = document.getElementById('pancoonSetupDialog');
    if (wizardStep === 0) wizardDraft.weekStart = safeDay(dialog.querySelector('#pancoonWizardWeek').value, 0);
    if (wizardStep === 1) wizardDraft.planningDay = safeDay(dialog.querySelector('#pancoonWizardPlanning').value, 6);
    if (wizardStep === 2) {
      const selection = readSelected(dialog, '[name="wizardMeals"]');
      if (!selection.length) { toast('Pick at least one meal.', 'You can fine-tune each day later.'); return false; }
      wizardDraft.meals = selection;
    }
    return true;
  }

  function openWizard() {
    wizardDraft = load();
    wizardStep = 0;
    renderWizard();
    document.getElementById('pancoonSetupDialog').showModal();
  }

  function finishWizard(useDefault) {
    if (useDefault) wizardDraft = normalize({weekStart:0,planningDay:6,meals:['dinner','lunch']});
    wizardDraft.mealDays = {};
    save(wizardDraft);
    document.getElementById('pancoonSetupDialog').close();
    toast('Welcome to your PanCoon kitchen!', 'Your meal plan is ready whenever you are.');
  }

  function start() {
    const dialog = document.createElement('dialog');
    dialog.id = 'pancoonSetupDialog';
    dialog.setAttribute('aria-labelledby', 'pancoonSetupTitle');
    document.body.appendChild(dialog);
    renderSettings();
    document.addEventListener('submit', event => {
      if (event.target.id === 'pancoonSettingsForm') settingsSubmit(event);
    });
    document.addEventListener('click', event => {
      const target = event.target;
      if (target.closest('#pancoonRestartSetup')) openWizard();
      if (target.closest('#pancoonApplyMeals')) {
        const form = document.getElementById('pancoonSettingsForm');
        const defaults = readSelected(form, '[name="defaultMeals"]');
        form.querySelectorAll('[name="dayMeals"]').forEach(input => { input.checked = defaults.includes(input.value); });
      }
      if (target.closest('#pancoonExportBackup')) exportBackup();
      if (target.closest('#pancoonImportBackup')) document.getElementById('pancoonBackupFile').click();
      if (target.closest('#pancoonWizardBack')) {
        if (wizardStep > 0) { wizardStep--; renderWizard(); }
      }
      if (target.closest('#pancoonWizardNext')) {
        if (!readWizardCurrentStep()) return;
        if (wizardStep === 2) finishWizard(false);
        else { wizardStep++; renderWizard(); }
      }
      if (target.closest('#pancoonWizardSkip')) finishWizard(true);
    });
    document.addEventListener('change', event => {
      if (event.target.id === 'pancoonBackupFile') {
        restoreBackup(event.target.files?.[0]);
        event.target.value = '';
      }
    });
    // This snapshot is a safety net for legacy browser users. It never overwrites a saved kitchen.
    if (LEGACY_INSTALL && !localStorage.getItem(LEGACY_SNAPSHOT_KEY)) {
      try {
        const storage = backupStorage();
        if (storage['pantry-raccoon:v1']) {
          localStorage.setItem(LEGACY_SNAPSHOT_KEY, JSON.stringify({savedAt:new Date().toISOString(),storage}));
        }
      } catch (_) {
        // Storage may be full. The existing kitchen is left untouched; use Download backup.
      }
    }
    if (FIRST_INSTALL && !localStorage.getItem(SETTINGS_KEY)) openWizard();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
