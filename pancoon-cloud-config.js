// A dedicated PanCoon Supabase project is required before private sync is enabled.
// Public browser publishable keys are expected here. NEVER include a secret/service-role key.
// Configure after the Supabase project, private bucket, and owner-only RLS are verified.
window.PanCoonCloudConfig = Object.freeze({
  enabled: false,
  url: '',
  publishableKey: ''
});
