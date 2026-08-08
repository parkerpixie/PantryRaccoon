(() => {
  'use strict';

  const CONFIG = {
    plan: [
      ['Today', 'today'],
      ['Weekend', 'weekend'],
      ['Full week', 'mealPlan']
    ],
    recipes: [
      ['Import URL', 'recipeImport'],
      ['Saved recipes', 'recipeShelf']
    ],
    pantry: [
      ['Add item', 'pantryEntry'],
      ['Inventory', 'pantryList']
    ],
    fridge: [
      ['Add item', 'fridgeEntry'],
      ['Inventory', 'fridgeList']
    ],
    freezer: [
      ['Add item', 'freezerEntry'],
      ['Inventory', 'freezerList']
    ],
    grocery: [
      ['Add extra', 'groceryExtra'],
      ['To buy', 'groceryList'],
      ['Completed', 'groceryCompleted']
    ]
  };

  function activeRoute() {
    return (location.hash || '#plan').slice(1);
  }

  function assignAnchors() {
    document.querySelector('[data-page="recipes"] .import-card')?.setAttribute('id', 'recipeImport');
    document.querySelector('[data-page="pantry"] .inventory-entry')?.setAttribute('id', 'pantryEntry');
    document.querySelector('[data-page="fridge"] .inventory-entry')?.setAttribute('id', 'fridgeEntry');
    document.querySelector('[data-page="freezer"] .inventory-entry')?.setAttribute('id', 'freezerEntry');
    document.querySelector('[data-page="grocery"] .card')?.setAttribute('id', 'groceryExtra');

    const today = document.querySelector('.meal-day.today');
    if (today) today.id = 'today';

    const weekend = [...document.querySelectorAll('.meal-day')].find(card => {
      const dateText = card.querySelector('.meal-date strong')?.textContent?.trim();
      return dateText === 'Saturday' || dateText === 'Sunday';
    });
    if (weekend) weekend.id = 'weekend';
  }

  function injectDashboards() {
    for (const [route, links] of Object.entries(CONFIG)) {
      const page = document.querySelector(`.page[data-page="${route}"]`);
      if (!page || page.querySelector('.quick-dashboard')) continue;

      const bar = document.createElement('nav');
      bar.className = 'quick-dashboard';
      bar.setAttribute('aria-label', `${route} quick actions`);
      bar.innerHTML = links.map(([label,target]) =>
        `<button type="button" data-jump="${target}">${label}</button>`
      ).join('');
      page.prepend(bar);
    }
  }

  function scrollToTarget(target) {
    assignAnchors();
    const node = document.getElementById(target);
    if (!node) return;
    node.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function refresh() {
    assignAnchors();
    injectDashboards();
    document.querySelectorAll('.quick-dashboard').forEach(bar => {
      const page = bar.closest('.page');
      bar.hidden = !page?.classList.contains('active');
    });
  }

  document.addEventListener('click', event => {
    const jump = event.target.closest('[data-jump]');
    if (jump) {
      event.preventDefault();
      scrollToTarget(jump.dataset.jump);
      return;
    }
    if (event.target.closest('[data-route]')) setTimeout(refresh, 0);
  });

  window.addEventListener('hashchange', () => setTimeout(refresh, 0));

  const observer = new MutationObserver(() => assignAnchors());

  function start() {
    refresh();
    const mealPlan = document.getElementById('mealPlan');
    if (mealPlan) observer.observe(mealPlan, {childList:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();