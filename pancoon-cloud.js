(() => {
  'use strict';

  const CONFIG = window.PanCoonCloudConfig || {};
  const ENABLED = CONFIG.enabled === true && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.url || '') &&
    /^(sb_publishable_|eyJ)/.test(CONFIG.publishableKey || '');
  const BUCKET = 'pancoon-private-media';
  const PREFIX = 'pancoon-private://';
  const KITCHEN_KEYS = [
    'pantry-raccoon:v1',
    'pantry-raccoon:recipe-zines:v1',
    'pantry-raccoon:inventory-notes:v1',
    'pantry-raccoon:inventory-meta:v2',
    'pancoon:settings:v1'
  ];

  let clientPromise = null;
  let signedInUser = null;
  let working = false;
  let imageObserver = null;
  const imageUrls = new Map();
  const inflight = new Map();

  function html(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g,
      char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function message(text, isError = false) {
    const note = document.getElementById('pancoonCloudStatus');
    if (!note) return;
    note.textContent = text;
    note.setAttribute('role', isError ? 'alert' : 'status');
  }

  async function sdk() {
    if (!ENABLED) throw new Error('A dedicated PanCoon cloud project is not configured yet.');
    if (!clientPromise) {
      clientPromise = new Promise((resolve, reject) => {
        if (window.supabase?.createClient) return resolve(window.supabase);
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js';
        script.async = true;
        script.onload = () => window.supabase?.createClient
          ? resolve(window.supabase)
          : reject(new Error('The account library was not available.'));
        script.onerror = () => reject(new Error('The account library could not be loaded.'));
        document.head.appendChild(script);
      }).then(library => {
        const c = library.createClient(CONFIG.url, CONFIG.publishableKey, {
          auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}
        });
        c.auth.onAuthStateChange((_event, session) => {
          const nextUser = session?.user || null;
          if (signedInUser?.id && signedInUser.id !== nextUser?.id) wipeImageUrls();
          signedInUser = nextUser;
          setTimeout(() => { render(); hydrateImages(); }, 0);
        });
        return c;
      }).catch(error => {
        clientPromise = null;
        throw error;
      });
    }
    return clientPromise;
  }

  async function user() {
    const c = await sdk();
    const {data, error} = await c.auth.getUser();
    if (error || !data.user) throw new Error('Sign in to your private kitchen first.');
    signedInUser = data.user;
    return data.user;
  }

  function localSnapshot() {
    const storage = {};
    for (const key of KITCHEN_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) storage[key] = value;
    }
    if (!storage['pantry-raccoon:v1']) throw new Error('No local kitchen was found to back up.');
    return storage;
  }

  function parseJson(text, fallback) {
    try { return JSON.parse(text || '') || fallback; }
    catch (_) { return fallback; }
  }

  function mediaSource(raw) {
    const source = String(raw || '').trim();
    if (!source || source.startsWith(PREFIX)) return null;
    if (source.startsWith('data:image/')) return source;
    try {
      const url = new URL(source, location.origin);
      if (url.origin !== location.origin || !url.pathname.startsWith('/assets/')) return null;
      return url.href;
    } catch (_) {
      return null;
    }
  }

  function mediaType(bytes, declared) {
    const b = bytes;
    if (b.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)) return ['image/png','png'];
    if (b.length >= 3 && b[0]===255 && b[1]===216 && b[2]===255) return ['image/jpeg','jpg'];
    if (b.length >= 12 && String.fromCharCode(...b.slice(0,4))==='RIFF' &&
        String.fromCharCode(...b.slice(8,12))==='WEBP') return ['image/webp','webp'];
    if (b.length >= 6 && String.fromCharCode(...b.slice(0,3))==='GIF') return ['image/gif','gif'];
    throw new Error('An artwork file is not a supported PNG, JPEG, WebP, or GIF image.');
  }

  async function imageBlob(raw) {
    let response;
    try { response = await fetch(raw, {cache:'no-store', credentials:'same-origin'}); }
    catch (_) { throw new Error('Could not read a saved artwork file. The original was not changed.'); }
    if (!response.ok) throw new Error('Could not read a saved artwork file (' + response.status + ').');
    const blob = await response.blob();
    if (!blob.size || blob.size > 15 * 1024 * 1024) throw new Error('Artwork is empty or larger than 15 MB.');
    const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    const [type, extension] = mediaType(bytes, blob.type);
    return {blob:new Blob([blob], {type}), type, extension};
  }

  function privatePath(value) {
    if (!String(value || '').startsWith(PREFIX)) return null;
    const path = value.slice(PREFIX.length);
    if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.test(path)) return null;
    return path;
  }

  async function resolve(value) {
    const path = privatePath(value);
    if (!path) return value;
    const owner = await user();
    if (path.split('/')[0] !== owner.id) throw new Error('That image belongs to another kitchen.');
    if (imageUrls.has(path)) return imageUrls.get(path);
    if (inflight.has(path)) return inflight.get(path);
    const task = (async () => {
      const c = await sdk();
      const {data, error} = await c.storage.from(BUCKET).download(path);
      if (error || !data) throw new Error('Private artwork could not be downloaded.');
      const url = URL.createObjectURL(data);
      imageUrls.set(path, url);
      return url;
    })();
    inflight.set(path, task);
    try { return await task; }
    finally { inflight.delete(path); }
  }

  function hydrateImages() {
    if (!ENABLED || !signedInUser) return;
    document.querySelectorAll('img').forEach(image => {
      const original = image.dataset.pancoonPrivateSource ||
        (String(image.getAttribute('src')||'').startsWith(PREFIX) ? image.getAttribute('src') : '');
      if (!privatePath(original)) return;
      if (image.dataset.pancoonResolved === original) return;
      image.dataset.pancoonPrivateSource = original;
      image.dataset.pancoonResolved = original;
      resolve(original).then(blobUrl => {
        if (image.isConnected && image.dataset.pancoonPrivateSource === original) image.src = blobUrl;
      }).catch(() => {
        image.dataset.pancoonResolved = '';
        image.removeAttribute('src');
        image.alt = 'Sign in to load private artwork';
      });
    });
  }

  function wipeImageUrls() {
    for (const url of imageUrls.values()) URL.revokeObjectURL(url);
    imageUrls.clear();
    document.querySelectorAll('img[data-pancoon-private-source]').forEach(image => {
      image.removeAttribute('src');
      delete image.dataset.pancoonResolved;
    });
  }

  async function uploadKitchen() {
    if (working) return;
    working = true;
    const createdPaths = [];
    let savedRemote = false;
    try {
      const owner = await user();
      const c = await sdk();
      const old = await c.from('pancoon_kitchens').select('updated_at').eq('user_id', owner.id).maybeSingle();
      if (old.error) throw old.error;
      if (old.data && !confirm('This account already has a saved private kitchen. Replace its cloud copy with the current kitchen on this device?')) return;
      const storage = localSnapshot();
      const kitchen = parseJson(storage['pantry-raccoon:v1'], null);
      if (!kitchen || !Array.isArray(kitchen.recipes) || !kitchen.plan || !kitchen.inventories) {
        throw new Error('The existing kitchen does not have the expected recipe and inventory data.');
      }
      const zines = parseJson(storage['pantry-raccoon:recipe-zines:v1'], {});
      const sources = new Map();
      for (const source of Object.values(zines)) {
        const read = mediaSource(source);
        if (read) sources.set(read, null);
        else if (source && !privatePath(source)) throw new Error('A zine uses an unsupported image URL. Keep a local backup and review it before private migration.');
      }
      for (const recipe of kitchen.recipes) {
        const read = mediaSource(recipe.sourceImageUrl);
        if (read) sources.set(read, null);
      }
      message('Preparing ' + sources.size + ' artwork file(s) for private storage…');
      let uploaded = 0;
      for (const source of sources.keys()) {
        const media = await imageBlob(source);
        const path = owner.id + '/' + crypto.randomUUID() + '.' + media.extension;
        const result = await c.storage.from(BUCKET).upload(path, media.blob, {
          contentType: media.type, upsert:false, cacheControl:'3600'
        });
        if (result.error) throw result.error;
        createdPaths.push(path);
        const check = await c.storage.from(BUCKET).download(path);
        if (check.error || !check.data || check.data.size !== media.blob.size) {
          throw new Error('Private artwork verification failed. Your original kitchen is unchanged.');
        }
        sources.set(source, PREFIX + path);
        uploaded++;
        message('Private artwork verified: ' + uploaded + ' of ' + sources.size + '…');
      }
      for (const [id, source] of Object.entries(zines)) {
        const read = mediaSource(source);
        if (read) zines[id] = sources.get(read);
      }
      for (const recipe of kitchen.recipes) {
        const read = mediaSource(recipe.sourceImageUrl);
        if (read) recipe.sourceImageUrl = sources.get(read);
      }
      storage['pantry-raccoon:v1'] = JSON.stringify(kitchen);
      storage['pantry-raccoon:recipe-zines:v1'] = JSON.stringify(zines);
      const snapshot = {schema:'pancoon.private-kitchen', version:1, userId:owner.id,
        transferredAt:new Date().toISOString(), storage, artworkCount:uploaded};
      const write = await c.from('pancoon_kitchens').upsert({
        user_id:owner.id, snapshot, updated_at:new Date().toISOString()
      }, {onConflict:'user_id'}).select('snapshot').single();
      if (write.error) throw write.error;
      savedRemote = true;
      if (write.data?.snapshot?.userId !== owner.id ||
          write.data.snapshot.artworkCount !== uploaded) throw new Error('Could not verify the private kitchen copy.');
      message('Private cloud copy verified: ' + kitchen.recipes.length + ' recipes and ' +
        uploaded + ' artwork files. Your existing device data has not been replaced.');
    } catch (error) {
      message('Private migration stopped: ' + (error.message || 'Unknown problem') +
        '. Your local kitchen was not changed.', true);
      if (createdPaths.length && !savedRemote) {
        try { await (await sdk()).storage.from(BUCKET).remove(createdPaths); } catch (_) {}
      }
    } finally {
      working = false;
    }
  }

  async function restoreKitchen() {
    if (working) return;
    working = true;
    try {
      const owner = await user();
      const c = await sdk();
      const result = await c.from('pancoon_kitchens').select('snapshot').eq('user_id', owner.id).single();
      if (result.error) throw result.error;
      const snap = result.data?.snapshot;
      if (!snap || snap.schema !== 'pancoon.private-kitchen' || snap.version !== 1 || snap.userId !== owner.id ||
          !snap.storage || typeof snap.storage !== 'object') throw new Error('That private kitchen copy is invalid.');
      const entries = Object.entries(snap.storage);
      if (!entries.some(([key])=>key==='pantry-raccoon:v1') ||
          !entries.every(([key,val])=>KITCHEN_KEYS.includes(key) && typeof val === 'string')) {
        throw new Error('The private kitchen contains an unexpected data format.');
      }
      const kitchen = parseJson(snap.storage['pantry-raccoon:v1'], null);
      if (!kitchen || !Array.isArray(kitchen.recipes) || !kitchen.plan || !kitchen.inventories) {
        throw new Error('The private kitchen data is incomplete.');
      }
      if (!confirm('Restore this private kitchen on this device? This replaces the local recipes, plan, and inventory. Download a local backup first.')) return;
      const previous = {};
      for (const key of KITCHEN_KEYS) previous[key] = localStorage.getItem(key);
      try {
        entries.forEach(([key,val]) => localStorage.setItem(key,val));
        localStorage.setItem('pancoon:install-kind:v1','legacy');
        location.reload();
      } catch (error) {
        for (const [key,val] of Object.entries(previous)) {
          if (val === null) localStorage.removeItem(key);
          else localStorage.setItem(key,val);
        }
        throw error;
      }
    } catch (error) {
      message('Could not restore private kitchen: ' + (error.message || 'Unknown problem'), true);
    } finally {
      working = false;
    }
  }

  function render() {
    const settings = document.getElementById('settingsPage');
    if (!settings) return;
    let card = document.getElementById('pancoonCloudCard');
    if (!card) {
      card = document.createElement('article');
      card.id = 'pancoonCloudCard';
      card.className = 'card pancoon-settings-card';
      settings.appendChild(card);
    }
    if (!ENABLED) {
      card.innerHTML = '<h3>🔐 Private kitchen storage</h3>' +
        '<p>A dedicated private account service has not been connected yet. Your recipes and artwork are still saved locally, and existing artwork links may remain public.</p>' +
        '<p class="hint">We will only enable migration after verifying owner-only access and image backups. Nothing has been moved or deleted.</p>';
      return;
    }
    card.innerHTML = '<h3>🔐 Private kitchen storage</h3>' +
      (signedInUser
        ? '<p>Signed in as <strong>' + html(signedInUser.email || 'account owner') + '</strong>. Your private cloud copy is separate from this device’s local data.</p>' +
          '<div class="button-row"><button class="primary" type="button" id="pancoonCloudUpload">Copy this kitchen privately</button>' +
          '<button class="secondary" type="button" id="pancoonCloudRestore">Restore my private kitchen</button>' +
          '<button class="secondary" type="button" id="pancoonCloudSignout">Sign out</button></div>'
        : '<p>Sign in to copy your recipes, plan, inventory, and artwork into your own private account. This does not delete local data.</p>' +
          '<form id="pancoonCloudLogin" class="pancoon-cloud-login">' +
          '<label>Email address<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>' +
          '<button class="primary" type="submit">Email me a sign-in link</button></form>') +
      '<p id="pancoonCloudStatus" role="status" class="hint">Private storage works only when you are signed in. Do not use a shared browser for private kitchens yet.</p>';
  }

  async function start() {
    render();
    window.PanCoonPrivateMedia = Object.freeze({resolve, isPrivate:value=>Boolean(privatePath(value))});
    window.addEventListener('pancoon:settings-changed', () => setTimeout(render,0));
    document.addEventListener('submit', async event => {
      if (event.target.id !== 'pancoonCloudLogin') return;
      event.preventDefault();
      try {
        const email = event.target.elements.email.value.trim();
        const c = await sdk();
        const {error} = await c.auth.signInWithOtp({
          email, options:{emailRedirectTo:location.origin + location.pathname}
        });
        if (error) throw error;
        message('Check your email for a sign-in link. Return here after opening it.');
      } catch (error) { message(error.message || 'Could not send the email.', true); }
    });
    document.addEventListener('click', async event => {
      if (event.target.closest('#pancoonCloudUpload')) await uploadKitchen();
      if (event.target.closest('#pancoonCloudRestore')) await restoreKitchen();
      if (event.target.closest('#pancoonCloudSignout')) {
        const c=await sdk();
        await c.auth.signOut();
        signedInUser=null;
        wipeImageUrls();
        render();
      }
    });
    if (!ENABLED) return;
    try {
      const c = await sdk();
      const {data} = await c.auth.getUser();
      signedInUser = data.user || null;
      render();
      if (!imageObserver) {
        imageObserver = new MutationObserver(() => hydrateImages());
        imageObserver.observe(document.body, {subtree:true, childList:true});
      }
      hydrateImages();
    } catch (error) { message('Private account service is unavailable: ' + error.message, true); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
