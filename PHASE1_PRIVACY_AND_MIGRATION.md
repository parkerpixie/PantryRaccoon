# PanCoon Phase 1: clean kitchens and legacy preservation

## Status

The public app must not automatically seed any person's recipes, zines, weekly plans, grocery trip, or receipt into a fresh browser.

- `app.js` creates a **blank** kitchen on a fresh install and retains the prior `pantry-raccoon:v1` storage key.
- `pancoon:install-kind:v1` identifies the installation as `new` or `legacy` before any empty state is written. An unfinished first-run setup reopens after a reload.
- `pancoon:settings:v1` stores a configurable week start, planning day, default meals, and per-weekday meal slots.
- Defaults: Sunday week start; Saturday planning day; Dinner and Lunch.
- Existing kitchen data is not reset or overwritten on app startup. Older recipes and saved zine references remain in local storage.
- A legacy-only safety snapshot is stored under `pancoon:prelaunch-safety-snapshot:v1` when storage capacity permits.
- Settings includes a JSON backup download and restore path.
- Historical shopping-trip and meal-plan scripts, recovered-recipe seed routines, and a sample receipt file are removed from this version. No historical shopping-trip script may replace the current calculated grocery list.

## Important privacy limitations

This is **separation of new users' data**, not private hosted file storage. The app is still local-browser storage without accounts or synchronization. Image assets remaining in `/assets` on a public Netlify deployment can be fetched using their URLs, and content present in previous public Git commits/deploys is not erased by removing files in this commit. Do not claim full household privacy or App Store readiness until user-owned images are migrated to authenticated storage, historical exposure is reviewed, and the publishing model is revisited.

## Phase 1 smoke-test scenarios

1. Fresh browser: empty recipes, plan, and inventories; guided setup opens; seven-day Sunday-through-Saturday plan; Lunch and Dinner on every day unless changed.
2. Refresh before finishing setup: wizard still opens for a `new` installation.
3. Legacy browser: pre-existing recipes, dates, inventory, and zine keys remain untouched; wizard does not interrupt startup; safety snapshot saved when possible.
4. Choose a different week-start day and per-day meal slots: planner and derived recipe list respect the same preference.
5. Grocery screen must come from the current plan and inventory instead of the historical one-time shopping trip.
6. Download a complete backup before clearing app data or testing restore.

## Future work

- Migrate public personal image assets and remove them from production delivery after arranging a safe home for the owner's zines.
- Address legacy public Git history and historical deployment snapshots if full privacy is required.
- Add authenticated per-household persistence and cross-device sync.
- Improve quantity-based grocery calculation and add a replayable spotlight walkthrough.
