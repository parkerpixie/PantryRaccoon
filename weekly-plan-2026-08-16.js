(() => {
  'use strict';

  // PanCoon's existing loader still requests this historical helper file.
  // Keep the stable loader path, but hand off to the current family meal week.
  if (document.querySelector('script[data-pancoon-current-week]')) return;

  const script = document.createElement('script');
  script.src = '/weekly-plan-2026-09-06.js?v=20260905-1';
  script.defer = true;
  script.dataset.pancoonCurrentWeek = 'true';
  document.head.appendChild(script);
})();
