window.PanCoonHouseholdConfig = Object.freeze({
  // Emergency recovery: avoid starting household syncing on every page load.
  // A user may opt into cloud mode with ?cloud=1; local and remote data stay unchanged.
  enabled: new URLSearchParams(location.search).get('cloud') === '1',
  url: 'https://oimohuupigpkrxqujmbu.supabase.co',
  publishableKey: 'sb_publishable_HjwGIRJv1doTTbNfexuIXQ_7m5tZHq2'
});
