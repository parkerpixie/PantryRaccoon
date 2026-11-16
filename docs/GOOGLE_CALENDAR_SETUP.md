# PanCoon ↔ Google Calendar setup

PanCoon can publish the selected week's scheduled **lunch** and **dinner** to a Google Calendar that the authorizing Google account can edit. The recipe stays in PanCoon; Google Calendar only receives a descriptive event and an app link.

## One-time Google setup

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) using the Google account that can edit the shared Family Calendar.
2. Create or select a Google Cloud project. Enable the **Google Calendar API** in **APIs & Services → Library**.
3. In **Google Auth Platform**, set up OAuth consent/branding for an **External** app (or other suitable audience). While the app is in Testing, add the Google account you will use to publish under **Test users**.
4. Under **Clients**, create an OAuth client of type **Web application**. Under **Authorized JavaScript origins**, add the exact origin `https://pantryraccoon.netlify.app`. No redirect URI or client secret is needed for the JavaScript token flow used here.
5. Copy the **OAuth Client ID** (ends with `.apps.googleusercontent.com`).
6. Open [PanCoon](https://pantryraccoon.netlify.app), sign into the household kitchen, and open **Meal Plan → Put dinner on the calendar → Google setup and meal times**.
7. Paste the OAuth Client ID, plus the **Calendar ID** of the shared Family Calendar (Google Calendar → Settings → select calendar → Integrate calendar → Calendar ID). The Google account that authorizes the app must have permission to edit that calendar.
8. Save settings. Click **Connect Google**, approve the requested Google Calendar events permission, and **Publish this week**.

## What happens

- Each planned lunch gets a 30-minute event beginning at **11:00 AM**.
- Each planned dinner gets a 30-minute event beginning at **5:00 PM**.
- These are defaults; the two start times can be adjusted in PanCoon (whole-hour times).
- Empty or undecided meal slots do not receive events.
- Re-publishing the same week creates no duplicates. Changed meals update their existing events, and removed meals delete only their own PanCoon-managed events.
- Event descriptions include cook assignment, the PanCoon recipe link, and a zine link when attached.
- Events are marked *free* and have no reminders or attendees.
- You can opt into auto-update during an **open, connected browser session**. Google access expires and must be reauthorized periodically.
- Other household members do not need to authorize Google merely to see the meals on the shared family calendar.

## Security and limitations

- Google OAuth is performed through Google Identity Services in the browser, using the `calendar.events` scope.
- The Google access token remains only in browser memory. It is never placed in PanCoon's shared household records, localStorage, or source repository.
- The OAuth Client ID is public identification, not a secret. Never paste a Google client secret into PanCoon.
- Calendar settings (Client ID, Calendar ID, and hours) are stored **on the current device** only.
- This is **one-way** from PanCoon to Google Calendar; do not edit the meal details in Google Calendar.
- This does **not** provide automatic scheduled background synchronization while all browsers are closed. Publishing is required unless an authorized PanCoon tab is open with auto-update enabled.
- The Google OAuth project may need Google verification if expanded beyond a small test-user audience.

## Troubleshooting

- **Calendar not found / 404:** Verify the Calendar ID and that the authorizing Google account can edit that calendar.
- **Access denied / 403:** Verify the Google Calendar API is enabled, OAuth scope approved, and test-user access configured.
- **Origin mismatch:** Add the exact site origin `https://pantryraccoon.netlify.app` to the OAuth Web client. Do not use a preview URL unless that exact origin is added.
- **Expired token:** Click Connect Google again and publish once more.
- **Cannot open recipe or zine:** Sign in to the shared household kitchen and check that the recipe or zine is synced to that household.

