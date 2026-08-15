(() => {
  'use strict';

  const STORAGE_KEY = 'pantry-raccoon:v1';
  const SEED_FLAG = 'pancoon:week-2026-08-16:v1';

  // Only run once per device. This deliberately touches only this week's
  // requested meal slots and the matching recipe records.
  if (localStorage.getItem(SEED_FLAG) === 'done') return;

  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { state = {}; }

  state.recipes = Array.isArray(state.recipes) ? state.recipes : [];
  state.plan = state.plan && typeof state.plan === 'object' ? state.plan : {};

  const now = new Date().toISOString();
  const upsertRecipe = recipe => {
    const existing = state.recipes.find(r => r.id === recipe.id);
    const merged = {
      ...(existing || {}),
      ...recipe,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    state.recipes = [merged, ...state.recipes.filter(r => r.id !== recipe.id)];
  };

  [
    {
      id: 'ians-pizza-verona',
      name: "Ian's Pizza · Verona",
      createdBy: "Ian's Pizza",
      category: 'Lunch',
      servings: 'Parker + Blake',
      prepMinutes: 0,
      cookMinutes: 0,
      totalMinutes: 0,
      ingredients: [],
      instructions: ['Go to Ian’s Pizza in Verona and pick the slices that sound good.'],
      notes: 'Reusable PanCoon meal placeholder for Ian’s Pizza. Sunday, August 16 lunch is Parker + Blake; Porter is grabbing lunch before work.'
    },
    {
      id: 'sleeping-bear-dune-steaks',
      name: 'Sleeping Bear Dune Steaks & Golden Dunes Rice Pilaf',
      createdBy: 'Blake + Talbot family recipe',
      category: 'Dinner',
      servings: '3',
      prepMinutes: 10,
      cookMinutes: 30,
      totalMinutes: 40,
      sourceImageUrl: 'assets/Sleeping Bear Dunes Steaks.png',
      ingredients: [
        'Steaks, enough for the family',
        'Kosher salt and black pepper, for the steaks',
        '1/3 box angel hair pasta',
        '1 cup Minute Rice',
        '1 can beef consommé',
        '2 Tbsp butter',
        '1 bagged vegetable side'
      ],
      instructions: [
        'Preheat the grill well so the grates are genuinely hot before the steaks go on.',
        'Pat steaks dry, season generously, and grill to your preferred doneness. Use an instant-read thermometer rather than guessing, then let the steaks rest 5 to 10 minutes before slicing.',
        'For the pilaf, break the angel hair noodles in half. Put them in a frying pan with the butter over medium heat and cook, stirring, until the noodles begin to turn golden brown.',
        'Add the can of beef consommé and 1 cup Minute Rice. Stir together.',
        'Reduce heat to low, cover, and simmer until the liquid is absorbed and the rice is tender.',
        'Heat the bagged vegetable side and serve everything together.'
      ],
      notes: 'Blake’s Sleeping Bear Dunes dinner. Steak tip: dry surface + hot grill = better browning. Resting after grilling keeps the juices in the steak instead of on the plate.'
    },
    {
      id: 'porters-fishtown-feta-freakout',
      name: "Porter's Fishtown Feta Freakout",
      createdBy: 'Cooktoria + Porter',
      category: 'Dinner',
      servings: '2',
      prepMinutes: 5,
      cookMinutes: 40,
      totalMinutes: 45,
      url: 'https://cooktoria.com/salmon-feta-pasta/',
      sourceImageUrl: "assets/Porter's Fishtown Feta Freakout.png",
      ingredients: [
        '8 oz skinless salmon',
        '4 oz block feta cheese',
        '8 oz cherry tomatoes',
        '2 Tbsp + 2 tsp extra virgin olive oil',
        'Sea salt, to taste',
        'Black pepper, to taste',
        '4 oz pasta',
        '1 garlic clove, minced',
        '2 Tbsp finely chopped basil leaves',
        '1/8 tsp red pepper flakes'
      ],
      instructions: [
        'Preheat the oven to 400°F.',
        'Put the salmon, cherry tomatoes, and feta in a baking dish. Drizzle with olive oil and season the salmon and tomatoes with salt and pepper.',
        'Bake 40 to 45 minutes, until the tomatoes are bursting and the feta is golden on top.',
        'Meanwhile, cook the pasta according to the package directions in salted water. Reserve about 1/4 cup pasta water, then drain.',
        'Use a fork to break up the feta and burst the tomatoes into a creamy sauce. Flake the salmon.',
        'Stir in basil, garlic, and red pepper flakes.',
        'Add the pasta and toss. Add a splash of reserved pasta water only if the sauce needs loosening.'
      ],
      notes: 'HALF BATCH on purpose because the full recipe made way too much food. Monday is Porter cooking for Parker + Porter only; Blake has plans.'
    },
    {
      id: 'crispy-chicken-cutlets',
      name: "Parker & Clementine's Cherry Blossom Cutlet Quest",
      createdBy: 'The Mediterranean Dish + Parker',
      category: 'Dinner',
      servings: '3–4',
      prepMinutes: 20,
      cookMinutes: 20,
      totalMinutes: 40,
      url: 'https://www.themediterraneandish.com/breaded-chicken-cutlets/',
      sourceImageUrl: 'assets/Cherry Blossom Cutlet Quest.png',
      ingredients: [
        '4 chicken cutlets or 2 boneless skinless chicken breasts, sliced horizontally into cutlets',
        'Kosher salt',
        'Black pepper',
        '1/2 cup all-purpose flour',
        '2 large eggs, beaten',
        '1 cup Panko or plain breadcrumbs',
        '1/2 cup grated Parmesan',
        '2 tsp Italian seasoning',
        'Extra virgin olive oil, for frying',
        'Lemon wedges, for serving',
        'Noodles, enough for 3 servings',
        'Butter, generously, for the noodles',
        'Lots of black pepper, for the noodles',
        'Broccoli, for serving'
      ],
      instructions: [
        'Season the chicken with salt and pepper.',
        'Set up three shallow bowls: flour in the first, beaten eggs in the second, and breadcrumbs mixed with Parmesan and Italian seasoning in the third.',
        'Coat each cutlet in flour, then egg, then the breadcrumb mixture. Let the breaded cutlets rest about 10 minutes so the coating sticks.',
        'Heat olive oil in a skillet over medium-high heat and pan-fry the cutlets until deeply golden and crisp, about 3 minutes per side, working in batches if needed.',
        'Boil the noodles until al dente and drain well.',
        'Melt plenty of butter in a frying pan, add lots of black pepper, then add the drained noodles. Fry until the noodles get crisp and golden in spots.',
        'Cook the broccoli and serve with the crispy chicken and butter-pepper noodles.'
      ],
      notes: 'Tuesday’s Traverse City cherry-blossom manga dinner with Parker + Clementine. The cherries are in the zine theme, not forced into the chicken.'
    },
    {
      id: 'boardman-river-carnitas-caper',
      name: "PanCoon's Boardman River Carnitas Caper",
      createdBy: 'Parker + the basement freezer',
      category: 'Dinner',
      servings: '2–3',
      prepMinutes: 5,
      cookMinutes: 20,
      totalMinutes: 25,
      sourceImageUrl: 'assets/Boardman River Carintas Caper.png',
      ingredients: [
        '1 package frozen carnitas',
        'Mexican rice, enough for the family'
      ],
      instructions: [
        'Heat the frozen carnitas according to the package directions. If practical, finish them in a skillet so some edges get crisp.',
        'Make the Mexican rice according to its package or usual family directions.',
        'Serve together. Tortillas, salsa, chips, avocado, shredded lettuce, or a bagged southwest salad are optional extras if they are already around.'
      ],
      notes: 'Wednesday is intentionally EASY because Parker has the in-person AA meeting and Blake may or may not eat at home before games with the guys.'
    },
    {
      id: 'beneath-building-50-haunted-brat-garden',
      name: 'Beneath Building 50: The Haunted Brat Garden',
      createdBy: 'Blake + Mani the Otter',
      category: 'Dinner',
      servings: '3',
      prepMinutes: 15,
      cookMinutes: 30,
      totalMinutes: 45,
      sourceImageUrl: 'assets/Beneath Building 50_ Haunted Garden Feast.png',
      ingredients: [
        'Brats, enough for the family',
        'Brat buns',
        'Mustard or favorite brat toppings',
        '1 bag frozen tater tots',
        '2 cucumbers, thinly sliced',
        '1/4 red onion, thinly sliced',
        '1/2 cup sour cream',
        '1 Tbsp white vinegar',
        '1 Tbsp fresh dill, chopped',
        '1/2 tsp sugar',
        'Salt, to taste',
        'Black pepper, to taste'
      ],
      instructions: [
        'For the Moonlit Garden Cucumbers, slice the cucumbers and red onion.',
        'Stir together sour cream, white vinegar, dill, sugar, salt, and black pepper.',
        'Toss the dressing with the cucumbers and onion. Chill until dinner.',
        'Bake the frozen tater tots according to package directions until extra crisp.',
        'Preheat the grill. Grill the brats, turning occasionally for even browning, until cooked through and nicely charred.',
        'Serve the Haunted Garden Brats with Tunnel Taters and the chilled Moonlit Garden Cucumbers.'
      ],
      notes: 'Thursday finale led by Mani the Otter: haunted Traverse City Commons, cool tunnels, gardens, brats, tots, and Blake’s cucumber salad.'
    }
  ].forEach(upsertRecipe);

  // Sunday, Aug 16 through Thursday, Aug 20.
  // Leave all other slots untouched.
  state.plan['2026-08-16:lunch'] = { choice: 'recipe:ians-pizza-verona', cook: 'Nobody' };
  state.plan['2026-08-16:dinner'] = { choice: 'recipe:sleeping-bear-dune-steaks', cook: 'Blake' };
  state.plan['2026-08-17:dinner'] = { choice: 'recipe:porters-fishtown-feta-freakout', cook: 'Porter' };
  state.plan['2026-08-18:dinner'] = { choice: 'recipe:crispy-chicken-cutlets', cook: 'Parker' };
  state.plan['2026-08-19:dinner'] = { choice: 'recipe:boardman-river-carnitas-caper', cook: 'Parker' };
  state.plan['2026-08-20:dinner'] = { choice: 'recipe:beneath-building-50-haunted-brat-garden', cook: 'Blake' };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(SEED_FLAG, 'done');

  // app.js has already rendered once by the time this seed runs. One reload
  // makes the newly-seeded plan and zines visible immediately. The flag above
  // prevents a reload loop.
  location.reload();
})();
