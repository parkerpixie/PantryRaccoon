# PanCoon Phase 2: Shared Household Cloud (design and launch checklist)

Status: architecture prepared, NOT enabled. Do not represent browser-local zines as synced. Do not enable existing `pancoon-cloud-config.js` against another application's Supabase project. Its existing schema is owner-only and cannot support shared households.

## Product contract

- One user belongs to one household by default (future multi-household support possible).
- Each person signs in as an individual. Creating a household yields a long, one-time expiring invite code/link. Members must sign in before they can join, and cannot choose a household merely by guessing its identifier.
- In one household, all members see the same recipes, zines, plan, inventory, grocery list, and household preferences. Changes become visible to the other signed-in devices without manual reload.
- Other households cannot read or modify any household records or images, including through guessed URLs or UUIDs.
- Users may leave a household; the owner can revoke membership and invitation links.
- Personal browsers can preserve a read-only offline cache plus queued mutations, with clear pending/synced/error UI. Never silently clobber data from other devices.

## UI

Settings → Household:
- Status: “Local only” vs “Syncing Talbot Kitchen” vs “Offline, changes pending”
- “Create a kitchen”, “Join with invite link”, “Invite another member”, “Members”, “Leave household”
- One-time safe “Import the recipes and lists on this device into this household” wizard with backup and duplicate review
- Per person display name/avatar (not required for use)
- No repeated sign-ins while an existing session is valid

Recipes:
- The new “Upload a zine from your device” input remains; it must publish image bytes to a PRIVATE per-household storage path once authenticated and household membership has been verified.
- Uploaded image is immediately previewed on the card and recipe detail. Other members see it after sync.
- Replace/remove operations are versioned; never replace image files at a shared immutable path (so cache does not hide updates).
- Do NOT put a data URL or a public GitHub asset path in the shared data store as the only representation of a user's uploaded file.
- Respect 15 MB max before upload, detect true image signature, use private signed retrieval or authenticated downloads.
- Keep the source recipe image separate from the optional personal zine.

## Suggested backend (dedicated Supabase project)

Auth: individual signed-in users, email OTP/passwordless or passkeys, with production email delivery configured. Existing owner-only `public.pancoon_kitchens` should not be activated as a multi-user kitchen.

Tables (per-entity to avoid whole-kitchen last-writer-wins):
- households (id uuid, owner_id uuid, name text, created_at)
- household_members (household_id uuid, user_id uuid, role enum owner/member, joined_at)
- household_invites (id uuid, household_id uuid, token_hash, created_by, expires_at, uses_remaining, revoked_at)
- household_recipes (id uuid, household_id uuid, fields jsonb, zine_path text, updated_at, revision integer, updated_by)
- household_meal_slots (household_id uuid, day date, kind text, recipe_id uuid nullable, special text nullable, cook text, revision)
- household_inventory_items (id uuid, household_id uuid, area text, fields jsonb, revision)
- household_grocery_extras (id uuid, household_id uuid, fields jsonb, revision)
- household_grocery_checks (household_id uuid, item_key text, checked boolean, revision)
- household_settings (household_id uuid primary key, data jsonb, revision)

Access: RLS membership validation on every table and storage object, with owner-only access for creating/revoking invitations and removing members. Invite-token hash, short expiry, bounded uses, and unguessable 128-bit+ tokens. Reject anonymous access. Never rely on user_metadata as authorization. Private image bucket path begins with household ID and is authorized from member table. User role must not be client writable.

Sync: per-row CRUD and Realtime subscriptions filtered to household id, initial fetch on sign-in/tab return, a persistent local cache for offline read, and explicit version checks on writes. Merge independent updates; flag genuine same-entity conflicts. Show last synced / pending / failure state. No whole snapshot overwrites during routine sync.

## Migration

1. Back up legacy browser kitchen and all zines, including IndexedDB images.
2. Create dedicated Supabase project under user-approved organization and review charges.
3. Configure auth provider, redirect URLs, email sender, and private bucket.
4. Apply reviewed schema with RLS and confirm in isolated A/B test accounts; run security advisors.
5. Implement and test typed client, invitation lifecycle, per-entity data sync, zine image upload/download.
6. Owner creates household and explicitly imports browser-local data once. Preserve existing recipe IDs, map legacy image references, upload only owner-approved assets.
7. Sign in on Blake’s and Porter’s phones, join via invitation, and verify no duplicate import.
8. Test add/edit/delete + two-device simultaneous edits, offline changes, images, previews, print/download, restart, sign-out, cross-household isolation.
9. Only then enable sync and retire owner-only snapshot code. Do not silently migrate or delete any local data.

## Acceptance testing

- Parker creates recipe on desktop → Blake sees it on phone.
- Blake changes the meal plan → Parker/Porter see the change.
- Porter checks groceries → all show the checkmark.
- Parker uploads manga Blake zine → preview opens and prints on each joined device.
- User from another household cannot fetch recipe or image by ID/path.
- Offline phone can view cache; edits queue and report failures. Concurrent non-overlapping edits survive.
- Legacy browser kitchen and attachments remain intact until verified backup and opt-in migration.
