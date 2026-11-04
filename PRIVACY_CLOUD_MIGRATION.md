# PanCoon private kitchen migration

## Implemented in this branch

- A private cloud connection is prepared, but DISABLED until a dedicated PanCoon Supabase project is connected.
- Owner-only RLS schema: supabase/pancoon_private_kitchens.sql.
- A private image bucket with user UUID folder restrictions and email sign-in support.
- Opt-in migration: copies local recipes, meal plan, inventory, settings, and zine associations into the signed-in user's cloud kitchen.
- Legacy asset image bytes are uploaded and downloaded back for verification before the cloud kitchen snapshot is written.
- The original local kitchen and public asset files are NOT changed by the migration.
- Restore on another device is explicit and requires confirmation; signed-in images use authenticated downloads and temporary Blob URLs.
- Settings offers Download kitchen + artwork ZIP. It includes available image bytes, the kitchen JSON, and an artwork manifest recording missing images.

## Required steps before activation

1. Create a new dedicated Supabase project in the organization's chosen account, with review of any project cost. Never reuse an unrelated application's project.
2. Apply and verify the SQL from supabase/pancoon_private_kitchens.sql.
3. Run the Supabase Security Advisors. Test that user A cannot read or write user B's kitchen rows or images and anonymous image access fails.
4. Set Authentication Site URL and allowed redirect URLs to https://pantryraccoon.netlify.app.
5. Configure a production-grade email provider before inviting people outside the Supabase project team. Supabase's default email sender is limited to preauthorized test recipients.
6. Populate pancoon-cloud-config.js with only the project URL and publishable key; enable the feature after successful security testing. Never expose secret/service-role keys.
7. On the browser containing the actual kitchen, download both JSON and artwork ZIP backups. Inspect artwork-manifest.json for missing items.
8. Sign in and run Copy this kitchen privately. Wait for private upload verification.
9. In a separate clean browser sign in and restore the private kitchen. Check every image, zine view, and print operation.
10. Only after owner approval and verification may personal assets be removed from CURRENT public Netlify output. Existing Git history, previous Netlify deploys, and external caches remain separate exposure concerns.

## Deliberate limitations

- Cloud copying/restoring is manual. It is NOT automatic two-way synchronization.
- Browser-local records are not yet account-scoped: do NOT treat multiple users sharing a browser profile as private from one another.
- A cloud restore replaces the local kitchen by explicit confirmation; make a JSON or artwork ZIP backup first.
- The ZIP retains art bytes for preservation, but its contents are not yet restored automatically. Extract kitchen-backup.json for the existing JSON restore and keep the image files until migration succeeds.
- Some old remote or external image URLs cannot be copied privately. The migration stops rather than falsely claiming they are secured.
- Before App Store release, add data conflict resolution, user deletion/account lifecycle, offline rules, real-device tests, complete public-asset retirement and full two-user RLS validation.
