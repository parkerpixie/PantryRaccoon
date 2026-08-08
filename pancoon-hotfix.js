(() => {
  'use strict';

  const STORAGE_KEY = 'pantry-raccoon:v1';
  const BACKUP_KEY = 'pantry-raccoon:v1:backup';

  if (!window.__panCoonBackupInstalled) {
    window.__panCoonBackupInstalled = true;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (this === localStorage && key === STORAGE_KEY) {
        try {
          const previous = originalSetItem === Storage.prototype.setItem ? null : localStorage.getItem(STORAGE_KEY);
          const current = localStorage.getItem(STORAGE_KEY);
          if (current && current !== value) originalSetItem.call(localStorage, BACKUP_KEY, current);
        } catch (_) {}
      }
      return originalSetItem.call(this, key, value);
    };
  }

  const style = document.createElement('style');
  style.id = 'pancoon-hotfix-styles';
  style.textContent = `
    .planned-meal.has-zine{
      grid-template-columns:66px minmax(0,1fr)!important;
      align-items:start!important;
    }
    .planned-meal.has-zine > div:not(.meal-actions){
      display:grid!important;
      gap:3px!important;
      min-width:0!important;
    }
    .planned-meal.has-zine strong{
      overflow-wrap:anywhere;
    }
    .planned-meal.has-zine .meal-actions{
      grid-column:1 / -1!important;
      display:flex!important;
      flex-direction:row!important;
      flex-wrap:wrap!important;
      gap:7px!important;
      margin-top:7px!important;
      align-self:start!important;
    }
    .planned-meal.has-zine .meal-actions button{
      flex:0 0 auto;
    }
    @media(max-width:760px){
      .planned-meal.has-zine{
        grid-template-columns:58px minmax(0,1fr)!important;
      }
      .planned-meal.has-zine .meal-actions{
        grid-column:1 / -1!important;
        flex-direction:row!important;
      }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('error', event => {
    try {
      sessionStorage.setItem('pancoon:last-error', JSON.stringify({
        message: event.message || 'Unknown error',
        source: event.filename || '',
        line: event.lineno || 0,
        time: new Date().toISOString()
      }));
    } catch (_) {}
  });

  window.addEventListener('unhandledrejection', event => {
    try {
      sessionStorage.setItem('pancoon:last-error', JSON.stringify({
        message: String(event.reason?.message || event.reason || 'Unhandled promise rejection'),
        source: 'promise',
        time: new Date().toISOString()
      }));
    } catch (_) {}
  });
})();