(() => {
  'use strict';

  // Images stay in this browser's private origin storage, not in the public app bundle.
  // PanCoon accounts/cloud sync are not enabled yet, so this is device-local storage.
  const PREFIX = 'pancoon-local-zine://';
  const DB_NAME = 'pancoon-recipe-artwork-v1';
  const STORE = 'recipe-zines';
  const LIMIT = 15 * 1024 * 1024;
  let databasePromise;
  const cache = new Map();
  const pending = new Map();

  function isLocal(value) { return String(value || '').startsWith(PREFIX); }
  function recipeId(value) {
    if (!isLocal(value)) return '';
    try { return decodeURIComponent(String(value).slice(PREFIX.length)); }
    catch (_) { return ''; }
  }
  function reference(id) { return PREFIX + encodeURIComponent(String(id)); }

  function database() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('This browser does not support local image storage.'));
    if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE, {keyPath:'recipeId'});
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open image storage.'));
      request.onblocked = () => reject(new Error('Another PanCoon tab is blocking image storage.'));
    }).catch(error => { databasePromise = null; throw error; });
    return databasePromise;
  }

  async function read(id) {
    if (!id) return null;
    const db = await database();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not read this zine.'));
    });
  }

  async function write(id, record) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      if (record) tx.objectStore(STORE).put(record);
      else tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save this zine.'));
      tx.onabort = () => reject(tx.error || new Error('Image storage was interrupted.'));
    });
  }

  async function detectType(file) {
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)) return 'image/png';
    if (bytes.length >= 3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
    if (bytes.length >= 12 &&
        String.fromCharCode(...bytes.slice(0,4))==='RIFF' &&
        String.fromCharCode(...bytes.slice(8,12))==='WEBP') return 'image/webp';
    throw new Error('Choose a PNG, JPEG, or WebP image.');
  }

  function invalidate(id) {
    if (cache.has(id)) URL.revokeObjectURL(cache.get(id));
    cache.delete(id);
    pending.delete(id);
  }

  async function put(id, file) {
    if (!id) throw new Error('Save the recipe first, then attach its zine.');
    if (!file || !file.size || file.size > LIMIT)
      throw new Error('Choose an image smaller than 15 MB.');
    const type = await detectType(file);
    const blob = new Blob([file], {type});
    await write(id, {recipeId:id, blob, name:file.name || 'recipe-zine.png', type, updatedAt:new Date().toISOString()});
    const verified = await read(id);
    if (!verified?.blob || verified.blob.size !== blob.size)
      throw new Error('Could not verify the saved image. Please retry.');
    invalidate(id);
    window.dispatchEvent(new CustomEvent('pancoon:zine-changed', {detail:{recipeId:id}}));
    return reference(id);
  }

  async function remove(id) {
    await write(id, null);
    invalidate(id);
    window.dispatchEvent(new CustomEvent('pancoon:zine-changed', {detail:{recipeId:id}}));
  }

  async function resolve(value) {
    if (!isLocal(value)) return value;
    const id = recipeId(value);
    if (!id) throw new Error('Invalid local zine reference.');
    if (cache.has(id)) return cache.get(id);
    if (pending.has(id)) return pending.get(id);
    const task = (async () => {
      const row = await read(id);
      if (!row?.blob) throw new Error('This zine is not saved in this browser.');
      const url = URL.createObjectURL(row.blob);
      cache.set(id, url);
      return url;
    })();
    pending.set(id, task);
    try { return await task; }
    finally { pending.delete(id); }
  }

  async function download(value, fallbackName) {
    const url = await resolve(value);
    const row = isLocal(value) ? await read(recipeId(value)) : null;
    const a = document.createElement('a');
    a.href = url;
    a.download = row?.name || (fallbackName || 'PanCoon-recipe-zine.png');
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function hydrate(image) {
    const raw = image.getAttribute('src') || '';
    if (!isLocal(raw) || image.dataset.pancoonLocalLoading === raw) return;
    image.dataset.pancoonLocalLoading = raw;
    resolve(raw).then(url => {
      if (image.getAttribute('src') === raw) image.setAttribute('src', url);
    }).catch(() => {
      if (image.getAttribute('src') === raw) {
        image.removeAttribute('src');
        image.alt = 'Zine image unavailable in this browser';
      }
    }).finally(() => { delete image.dataset.pancoonLocalLoading; });
  }

  function hydrateInside(root) {
    if (root.nodeType !== 1) return;
    if (root.matches?.('img')) hydrate(root);
    root.querySelectorAll?.('img').forEach(hydrate);
  }

  function start() {
    hydrateInside(document.body);
    new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === 'attributes') hydrate(record.target);
        else record.addedNodes.forEach(hydrateInside);
      });
    }).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['src']});
  }

  window.PanCoonZineStore = Object.freeze({isLocal, reference, put, remove, resolve, download, read});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
