window.PanCoonHouseholdConfig = Object.freeze({
  // Shared households are available normally; ?safe=1 is a local-only recovery escape hatch.
  enabled: new URLSearchParams(location.search).get('safe') !== '1',
  url: 'https://oimohuupigpkrxqujmbu.supabase.co',
  publishableKey: 'sb_publishable_HjwGIRJv1doTTbNfexuIXQ_7m5tZHq2'
});
