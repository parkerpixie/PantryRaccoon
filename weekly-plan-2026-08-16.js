(() => {
  'use strict';

  // PanCoon's existing loader still requests this historical helper file.
  // Keep the stable loader path, but hand off to the current family meal week.
  const load = (src, datasetKey) => {
    if (document.querySelector(`script[data-${datasetKey}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute(`data-${datasetKey}`, 'true');
    document.head.appendChild(script);
  };

  load('/weekly-plan-2026-09-06.js?v=20260905-2', 'pancoon-current-week');
  load('/weekly-plan-2026-09-06-extra-slots.js?v=20260905-1', 'pancoon-current-week-extra-slots');
})();
