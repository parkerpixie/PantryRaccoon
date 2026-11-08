# PanCoon shared household setup (November 8, 2026)

## Current status

A dedicated PanCoon Supabase project is provisioned. The database has row-level security, authenticated household membership, expiring invitation tokens, version-checked per-item records, Realtime change subscriptions and a private image bucket. The app has a household sync client and an explicit import flow. This has been statically checked and deployed, **but a full end-to-end authenticated Mac/iPhone test has NOT yet been completed**. Do not describe full syncing as verified until two devices pass the tests below.

## Required one-time Authentication URL setup

The connected Supabase tool can create schemas and retrieve public keys but does not expose GoTrue Auth URL configuration. Do this manually in the Supabase Dashboard:

1. Open https://supabase.com/dashboard/project/oimohuupigpkrxqujmbu/auth/url-configuration .
2. Set **Site URL** to `https://pantryraccoon.netlify.app`.
3. Add redirect URL `https://pantryraccoon.netlify.app/**` (also use the exact origin if needed).
4. Save.

The app requests email sign-in links with PKCE. Open each emailed sign-in link **in the same browser/device** that requested it. On iPhone, use Safari rather than relying on links to jump from email into a separately sandboxed Home Screen PWA. This initial constraint is a reason to add an email-code sign-in alternative before wide rollout. Supabase's default email sender has low limits; configure a production-grade sender before inviting outsiders.

## Your Mac (existing kitchen)

1. Open https://pantryraccoon.netlify.app/#settings in your usual Mac browser/profile.
2. Under **Keep a copy of your kitchen**, select **Download kitchen + artwork ZIP**. Confirm the archive includes `kitchen-backup.json`, `artwork-manifest.json`, and expected zine image files. Keep it safe.
3. In the new **Your shared PanCoon kitchen** card, sign in with your email.
4. Choose **Create kitchen** (suggested name **Talbot Kitchen**).
5. Choose **Import this device** to copy the existing recipes, plan, inventory, zines, and metadata. The app verifies uploaded image bytes.
6. Check that the import reports successful verification, then refresh and confirm Bolognese, Arayes, ramen, and the other zines still render.
7. Never delete the original local data or archive before verifying cloud and a second device.

## iPhone

1. Open https://pantryraccoon.netlify.app/#settings in Safari.
2. Sign in with the **same email** used on the Mac, using a link opened in that same Safari context.
3. Select the existing household, then choose **Use household cloud here**. On a fresh phone, that loads the Mac collection.
4. Check a recipe image, tonight's dinner zine, and grocery items before adding to the Home Screen.
5. If using the installed Home Screen app, it may have separate browser storage and require its own sign-in. Test in Safari first.

## Blake and Porter

1. Sign in as separate users using their own email addresses.
2. On the Mac, as household owner, select **Invite a household member**. Each code is one-use and valid for seven days.
3. Share the code privately; the new member enters it under **Join another kitchen**.
4. After joining, their device loads the same household recipes, plans, grocery list, and zines. These are SHARED family records, not separate personal collections.

## Important limitations

- A user must opt into importing their local browser kitchen. Remote data must **never** overwrite a device's unsynced changes without a comparison.
- The RLS rules keep cloud households apart, but an existing browser's cached recipes can remain visible after sign-out. Do not share browser profiles across households yet.
- This is a version-checked item sync with Realtime and 30-second polling fallback, not full offline-first conflict resolution. Simultaneous edits to the *same record* can pause sync and need human review.
- A record imported with an external picture URL may remain dependent on that public site; user-uploaded local PNG/JPEG/WebP zines are copied to private storage.
- Sign-in may fail until the Authentication URL configuration above is completed. Do not tell anyone it is fully ready before confirming that setting.
- Security Advisor may flag `public.pancoon_join_household` as an authenticated SECURITY DEFINER function; this function is deliberately callable by authenticated invite holders, validates login plus a high-entropy expiring invite token, and grants only membership. Review its behavior before production expansion.
- Supabase cost was quoted at $0/month for creating this project; usage limits and later upgrades may incur costs.

## Acceptance tests

- Mac: import full collection and attached image files; backup ZIP contains images.
- iPhone Safari: sign in, load same zines, display tonight's dinner image.
- Edit grocery checkbox on iPhone; Mac updates without manual export.
- Replace a zine on Mac; iPhone receives newest file (immutable new cloud path).
- Two devices edit different recipes concurrently; both changes survive.
- Two devices edit the same recipe concurrently; show a conflict rather than overwriting without warning.
- Other authenticated household members cannot read a non-member household's records or image paths; anonymous access denied.
- Local kitchen still exists after a failed import; no silent deletion.
