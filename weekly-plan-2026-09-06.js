(() => {
  'use strict';

  const STORAGE_KEY = 'pantry-raccoon:v1';
  const SEED_FLAG = 'pancoon:week-2026-09-06:v1';

  // One-time install for the Sep 6-10 family meal plan. Only this week's
  // agreed meal slots and their matching recipe records are touched.
  if (localStorage.getItem(SEED_FLAG) === 'done') return;

  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { state = {}; }

  state.recipes = Array.isArray(state.recipes) ? state.recipes : [];
  state.plan = state.plan && typeof state.plan === 'object' ? state.plan : {};

  const now = new Date().toISOString();
  const upsertRecipe = recipe => {
    const existing = state.recipes.find(r =>
      r.id === recipe.id ||
      (recipe.url && r.url === recipe.url) ||
      (recipe.sourceImageUrl && r.sourceImageUrl === recipe.sourceImageUrl)
    );
    const merged = {
      ...(existing || {}),
      ...recipe,
      id: recipe.id,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    state.recipes = [merged, ...state.recipes.filter(r => r.id !== recipe.id && r.id !== existing?.id)];
  };

  [
    {
      id: 'sunday-snack-lunch-sep6',
      name: 'Sunday Snack Lunch',
      createdBy: 'Talbot family',
      category: 'Lunch',
      servings: '3',
      prepMinutes: 5,
      cookMinutes: 0,
      totalMinutes: 5,
      ingredients: ['Salami','Crackers','Apples','Cucumbers','Carrots','Cherry tomatoes','Dill dip'],
      instructions: ['Put everything on a board or plates and let everyone grab what sounds good.'],
      notes: 'Fast early lunch before Porter works at Culver’s. No zine needed.'
    },
    {
      id: 'akira-mediterranean-chicken-kebabs',
      name: 'Mediterranean Chicken Kebabs + Cucumber Tomato Feta Salad + Pita',
      createdBy: 'Once Upon a Chef + Erin Lives Whole + Parker',
      category: 'Dinner',
      servings: '4–6',
      prepMinutes: 30,
      cookMinutes: 12,
      totalMinutes: 42,
      url: 'https://www.onceuponachef.com/recipes/middle-eastern-chicken-kabobs.html',
      sourceImageUrl: 'assets/Mediterranean Chicken Kebabs with tomato and cucumber salad with Pita.png',
      ingredients: [
        '2.5–3 lb boneless skinless chicken breasts, cut into chunks',
        '1 cup plain Greek yogurt',
        '3 Tbsp lemon juice',
        '3 garlic cloves, minced',
        '2 tsp ground cumin',
        '1 tsp paprika',
        '1 tsp ground cinnamon',
        'Crushed red pepper flakes, optional',
        'Kosher salt and black pepper',
        '1 large red onion, cut into chunks',
        'Pita, for serving',
        'Cucumbers',
        'Cherry tomatoes',
        'Feta cheese',
        'Fresh cilantro',
        'Olive oil',
        'Red wine vinegar',
        'Lemon juice',
        'Dried oregano, optional'
      ],
      instructions: [
        'Whisk yogurt, lemon juice, garlic, cumin, paprika, cinnamon, red pepper flakes, salt, and pepper into a marinade.',
        'Add chicken breast pieces and refrigerate 30 minutes to 2 hours. Keep the marinade shorter than the original thigh version so the breasts stay tender.',
        'Thread chicken and red onion onto skewers and grill over medium-high heat, turning occasionally, until lightly charred and cooked through.',
        'For the salad, combine cucumbers, cherry tomatoes, red onion, feta, and cilantro.',
        'Whisk olive oil, red wine vinegar, lemon juice, oregano, salt, and pepper; toss with the salad and let it sit briefly.',
        'Serve the kebabs with cucumber-tomato-feta salad and warm pita.'
      ],
      notes: 'Akira-themed Blake zine. Recipe is adapted to chicken breasts because the Talbots do not do dark meat. Salad source: https://www.erinliveswhole.com/greek-cucumber-tomato-feta-salad/ . May serve up to six if Beth and Tori join before the Akira showing.'
    },
    {
      id: 'belgian-waffles-blueberry-compote',
      name: 'Belgian Waffles + Blueberry Compote + Fresh Whipped Cream',
      createdBy: 'The Salty Marshmallow + The Cookie Rookie + Parker',
      category: 'Breakfast',
      servings: 'Family breakfast',
      prepMinutes: 15,
      cookMinutes: 20,
      totalMinutes: 35,
      url: 'https://thesaltymarshmallow.com/homemade-belgian-waffle-recipe/',
      sourceImageUrl: 'assets/Belgian Waffles with Blueberry Compote and Whip Cream.png',
      ingredients: [
        'All-purpose flour','Baking powder','Granulated sugar','Salt','Ground cinnamon','Eggs','Vegetable oil','Milk','Vanilla extract',
        '2.5 cups blueberries, fresh or frozen','Sugar for compote','Lemon juice','Cornstarch','Water','Vanilla for compote','Heavy whipping cream'
      ],
      instructions: [
        'Make the Belgian waffle batter according to The Salty Marshmallow recipe and cook in the waffle maker until crisp and golden.',
        'For the compote, cook blueberries, sugar, lemon juice, a pinch of salt, and part of the water until the berries begin to burst.',
        'Make a cornstarch slurry with the remaining water, stir it into the blueberries with vanilla, and simmer until glossy and thickened.',
        'Whip the heavy cream until soft peaks form.',
        'Serve warm waffles with blueberry compote and fresh whipped cream.'
      ],
      notes: 'Parker + Clementine Monday morning zine. Compote source: https://www.thecookierookie.com/blueberry-compote/'
    },
    {
      id: 'luna-ozzy-grilled-cheese-zoup',
      name: 'Gruyère + Cheddar Grilled Cheese with Zoup! Tomato Soup',
      createdBy: 'Luna + Ozzy, allegedly',
      category: 'Lunch',
      servings: '3',
      prepMinutes: 5,
      cookMinutes: 10,
      totalMinutes: 15,
      sourceImageUrl: "assets/Luna & Ozzy's Grilled Cheese and Soup Attempt.png",
      ingredients: ['Bread','Shredded Gruyère','Shredded cheddar','Butter','Zoup! canned tomato soup','Fresh cherry tomatoes, optional for the soup'],
      instructions: [
        'Butter the bread.',
        'Fill sandwiches with shredded Gruyère and cheddar.',
        'Toast in a skillet until deeply golden and melty.',
        'Heat the Zoup! tomato soup, crushing in a few fresh cherry tomatoes if desired.',
        'Serve together while Luna and Ozzy conduct ankle-level quality control.'
      ],
      notes: 'Monday lunch. Zine directions from Luna and Ozzy are intentionally terrible; these are the human instructions.'
    },
    {
      id: 'demon-slayer-steak-night',
      name: 'Grilled Steak + Roasted Brussels Sprouts + Blistered Cherry Tomato Couscous',
      createdBy: 'Blake + Mountain Cravings + Love & Lemons',
      category: 'Dinner',
      servings: '3',
      prepMinutes: 15,
      cookMinutes: 30,
      totalMinutes: 45,
      url: 'https://mountaincravings.com/one-pot-couscous-tomatoes/',
      sourceImageUrl: 'assets/Steak, Brussel Sprouts and Cherry Tomato Cous Cous.png',
      ingredients: [
        'Steaks, enough for the family','Kosher salt','Black pepper','Olive oil',
        'Brussels sprouts, halved','Lemon, optional','Fresh thyme','Parmesan, optional',
        '2 Tbsp butter','1 pint cherry tomatoes','1 cup couscous','1 cup vegetable broth','Fresh parsley','Fresh cilantro','Onion powder','Garlic powder'
      ],
      instructions: [
        'Roast halved Brussels sprouts with olive oil, salt, and pepper at 400°F until browned and tender. Finish with lemon, Parmesan, and fresh thyme if desired.',
        'For the couscous, blister the cherry tomatoes in butter until softened and lightly charred.',
        'Add vegetable broth, onion powder, garlic powder, salt, and pepper; bring to a boil, stir in couscous, cover, remove from heat, and let stand 5 minutes.',
        'Fluff the couscous and fold in parsley and cilantro.',
        'Blake grills the steaks to preferred doneness and lets them rest before serving.',
        'Plate steak with Brussels sprouts and cherry tomato couscous.'
      ],
      notes: 'Demon Slayer-themed Blake dinner. Brussels source: https://www.loveandlemons.com/roasted-brussels-sprouts/'
    },
    {
      id: 'beef-ragu',
      name: 'Slow-Cooked Beef Ragu + Pappardelle',
      createdBy: 'RecipeTin Eats + Parker',
      category: 'Dinner',
      servings: '5–6 with pasta; sauce makes about 8',
      prepMinutes: 20,
      cookMinutes: 180,
      totalMinutes: 200,
      url: 'https://www.recipetineats.com/slow-cooked-shredded-beef-ragu-pasta/',
      sourceImageUrl: 'assets/Slow-cooker Beef Ragu and Pappadelle.png',
      ingredients: [
        '2.5 lb chuck beef, cut into 4 equal pieces','2 tsp kosher salt','1/2 tsp black pepper','3 Tbsp olive oil, divided','3 garlic cloves, minced','1 onion, diced','1 cup carrots, diced','1 cup celery, diced','28 oz crushed tomatoes','3 Tbsp tomato paste','2 beef bouillon cubes, crumbled','1 cup beef broth/stock','1.5 cups water','3/4 tsp dried thyme or fresh thyme equivalent','3 bay leaves','1 lb dried pappardelle','Freshly grated Parmesan','Fresh parsley, optional'
      ],
      instructions: [
        'Pat beef dry, season with salt and pepper, and brown aggressively in olive oil. Remove.',
        'Lower heat. Add remaining olive oil, garlic, and onion; sauté briefly. Add carrots and celery and cook slowly about 5 minutes.',
        'Add crushed tomatoes, tomato paste, bouillon, beef broth, water, thyme, and bay leaves. Return beef and juices and bring to a gentle simmer.',
        'Cover and bake at 350°F for about 2.5 hours, until the beef shreds easily.',
        'Remove beef, shred with two forks, and return it to the pot. Simmer uncovered on low about 30 minutes until thickened. Adjust seasoning.',
        'Cook pappardelle 1 minute shy of package directions and save pasta water.',
        'Toss warm ragu with drained pasta and about 1/2 cup pasta water over medium-high heat for 1–2 minutes until glossy and coated.',
        'Serve with Parmesan and parsley.'
      ],
      notes: 'Parker + Clementine company-worthy Tuesday dinner for Grizzly John. The hard part is front-loaded; once the pot goes in, dinner mostly manages itself.'
    },
    {
      id: 'ozzy-abstract-french-bread-pizzas',
      name: "Ozzy's Abstract French Bread Pizzas",
      createdBy: 'Cooking Classy + Blake + Ozzy',
      category: 'Dinner',
      servings: '3',
      prepMinutes: 10,
      cookMinutes: 15,
      totalMinutes: 25,
      url: 'https://www.cookingclassy.com/french-bread-pizza/',
      sourceImageUrl: "assets/Ozzy's Abstract French Bread Pizzas.png",
      ingredients: ['1 loaf French bread','Pizza sauce','Shredded mozzarella','Pepperoni','Small can pineapple','Green olives','Cherry tomatoes','Green pepper','Parmesan, optional','Italian seasoning, optional'],
      instructions: [
        'Split the French bread lengthwise and arrange cut-side up.',
        'Spread with pizza sauce.',
        'Top with mozzarella and build each section differently: pepperoni; pineapple + green olives for Porter; cherry tomatoes + green pepper for Blake/Parker as desired.',
        'Bake until the cheese is melted and the bread is crisp at the edges.',
        'Slice and serve while Ozzy critiques the composition.'
      ],
      notes: 'Wednesday dinner. Blake is cooking. Ozzy is the art snob and accepts no responsibility for dropped cheese.'
    },
    {
      id: 'italian-chicken-sheet-pan-supper',
      name: 'Italian Chicken Sheet Pan Supper',
      createdBy: 'Ree Drummond + Talbot adaptation',
      category: 'Dinner',
      servings: '3',
      prepMinutes: 15,
      cookMinutes: 30,
      totalMinutes: 45,
      url: 'https://www.foodnetwork.com/recipes/ree-drummond/italian-chicken-sheet-pan-supper-5271106',
      sourceImageUrl: 'assets/Italian CHicken Sheet Pan Supper.png',
      ingredients: ['3 boneless skinless chicken breasts','Green beans, trimmed','Cherry tomatoes','1 loaf ciabatta bread, torn into chunks','Minced garlic','Olive oil','Balsamic vinegar','Kosher salt','Black pepper','Fresh basil','Fresh parsley'],
      instructions: [
        'Preheat the oven to 425°F.',
        'On a large sheet pan, toss green beans and cherry tomatoes with olive oil, minced garlic, salt, and pepper.',
        'Nestle the chicken breasts onto the pan and drizzle with more olive oil and balsamic vinegar. Season lightly.',
        'Roast about 20 minutes.',
        'Add torn ciabatta around the chicken and vegetables so it can soak up the pan juices.',
        'Roast 8–10 minutes more, until the chicken is cooked through and the bread is crisp at the edges.',
        'Finish with fresh basil and parsley and serve warm.'
      ],
      notes: 'Thursday dinner. Blake is cooking. Parker + Clementine manga zine; one pan, fewer dishes.'
    }
  ].forEach(upsertRecipe);

  // Current PanCoon plan renders weekend lunches plus dinner every day.
  state.plan['2026-09-06:lunch'] = { choice: 'recipe:sunday-snack-lunch-sep6', cook: 'Nobody' };
  state.plan['2026-09-06:dinner'] = { choice: 'recipe:akira-mediterranean-chicken-kebabs', cook: 'Parker' };
  state.plan['2026-09-07:dinner'] = { choice: 'recipe:demon-slayer-steak-night', cook: 'Blake' };
  state.plan['2026-09-08:dinner'] = { choice: 'recipe:beef-ragu', cook: 'Parker' };
  state.plan['2026-09-09:dinner'] = { choice: 'recipe:ozzy-abstract-french-bread-pizzas', cook: 'Blake' };
  state.plan['2026-09-10:dinner'] = { choice: 'recipe:italian-chicken-sheet-pan-supper', cook: 'Blake' };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(SEED_FLAG, 'done');

  // app.js and stable-ui.js have already rendered. Reload once so the fresh
  // week and zines are immediately visible; the flag prevents a loop.
  location.reload();
})();
