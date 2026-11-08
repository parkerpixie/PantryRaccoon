(() => {
  'use strict';

  const ZINES_KEY = 'pantry-raccoon:recipe-zines:v1';
  const KITCHEN_KEY = 'pantry-raccoon:v1';
  const MAX_ARCHIVE_BYTES = 120 * 1024 * 1024;

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (_) { return fallback; }
  }

  function status(text) {
    const note = document.getElementById('pancoonArtworkArchiveStatus');
    if (note) note.textContent = text;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function writeHeader(size, entries) {
    const buffer = new Uint8Array(size);
    const view = new DataView(buffer.buffer);
    for (const [offset, value, bytes] of entries) {
      if (bytes === 2) view.setUint16(offset, value, true);
      else view.setUint32(offset, value, true);
    }
    return buffer;
  }

  function makeZip(files) {
    const encoder = new TextEncoder();
    const parts = [], central = [];
    let offset = 0, centralBytes = 0;
    for (const file of files) {
      const data = file.bytes, name = encoder.encode(file.name), sum = crc32(data);
      if (name.length > 65535 || data.length > 0xffffffff) throw new Error('An archive file is too large.');
      const local = writeHeader(30, [
        [0,0x04034b50,4],[4,20,2],[6,0,2],[8,0,2],[10,0,2],[12,0,2],
        [14,sum,4],[18,data.length,4],[22,data.length,4],[26,name.length,2],[28,0,2]
      ]);
      parts.push(local,name,data);
      const dir = writeHeader(46, [
        [0,0x02014b50,4],[4,20,2],[6,20,2],[8,0,2],[10,0,2],
        [12,0,2],[14,0,2],[16,sum,4],[20,data.length,4],[24,data.length,4],
        [28,name.length,2],[30,0,2],[32,0,2],[34,0,2],[36,0,2],
        [38,0,4],[42,offset,4]
      ]);
      central.push(dir,name);
      centralBytes += dir.length + name.length;
      offset += local.length + name.length + data.length;
    }
    if (files.length > 65535 || offset + centralBytes > 0xffffffff) throw new Error('Archive is too large.');
    const footer = writeHeader(22, [
      [0,0x06054b50,4],[4,0,2],[6,0,2],[8,files.length,2],[10,files.length,2],
      [12,centralBytes,4],[16,offset,4],[20,0,2]
    ]);
    return new Blob([...parts,...central,footer], {type:'application/zip'});
  }

  function sourceUrl(raw) {
    const source = String(raw || '').trim();
    if (!source) return null;
    if (source.startsWith('pancoon-private://') || source.startsWith('pancoon-local-zine://')) return source;
    if (source.startsWith('data:image/')) return source;
    try {
      const url = new URL(source, location.origin);
      return url.origin === location.origin && url.pathname.startsWith('/assets/') ? url.href : null;
    } catch (_) {
      return null;
    }
  }

  function extension(bytes) {
    if ([137,80,78,71].every((x,i)=>bytes[i]===x)) return 'png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
    if (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' &&
        String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return 'webp';
    if (String.fromCharCode(...bytes.slice(0,3)) === 'GIF') return 'gif';
    throw new Error('This file was not a recognized image.');
  }

  function localKeys() {
    const storage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('pancoon:') || key.startsWith('pantry-raccoon:')) &&
          key !== 'pancoon:prelaunch-safety-snapshot:v1') {
        storage[key] = localStorage.getItem(key);
      }
    }
    return storage;
  }

  async function downloadArtworkArchive() {
    const button = document.getElementById('pancoonArtArchive');
    if (button) button.disabled = true;
    try {
      const zines = read(ZINES_KEY, {});
      const kitchen = read(KITCHEN_KEY, {});
      const sources = new Set(Object.values(zines).filter(Boolean));
      for (const recipe of kitchen.recipes || []) {
        if (sourceUrl(recipe.sourceImageUrl)) sources.add(recipe.sourceImageUrl);
      }
      const files = [], manifest = [], missing = [];
      let total = 0, number = 0;
      for (const raw of sources) {
        const url = sourceUrl(raw);
        if (!url) { missing.push({source:raw,reason:'External image reference'}); continue; }
        try {
          const finalUrl = url.startsWith('pancoon-private://')
            ? await window.PanCoonPrivateMedia.resolve(url)
            : url.startsWith('pancoon-local-zine://')
            ? await window.PanCoonZineStore.resolve(url)
            : url;
          const response = await fetch(finalUrl, {credentials:'same-origin',cache:'no-store'});
          if (!response.ok) throw new Error('HTTP ' + response.status);
          const bytes = new Uint8Array(await response.arrayBuffer());
          const ext = extension(bytes);
          total += bytes.length;
          if (total > MAX_ARCHIVE_BYTES) throw new Error('Artwork exceeds the 120 MB archive safety limit.');
          const path = 'artwork/' + String(++number).padStart(3, '0') + '.' + ext;
          files.push({name:path,bytes});
          manifest.push({originalReference:raw,archivePath:path,bytes:bytes.length});
          status('Collected ' + number + ' of ' + sources.size + ' image references…');
        } catch (error) {
          if (String(error.message).includes('safety limit')) throw error;
          missing.push({source:raw,reason:error.message || 'Could not download'});
        }
      }
      const encoder = new TextEncoder();
      const backup = {app:'PanCoon',schemaVersion:1,exportedAt:new Date().toISOString(),storage:localKeys()};
      files.push({name:'kitchen-backup.json',bytes:encoder.encode(JSON.stringify(backup,null,2))});
      files.push({name:'artwork-manifest.json',bytes:encoder.encode(JSON.stringify({
        app:'PanCoon',createdAt:backup.exportedAt,images:manifest,missing,
        note:'The matching original references are stored in kitchen-backup.json.'
      },null,2))});
      const blob = makeZip(files), objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'pancoon-kitchen-and-artwork-' + new Date().toISOString().slice(0,10) + '.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      status('Archive prepared with ' + manifest.length + ' images' +
        (missing.length ? ' and ' + missing.length + ' missing reference(s). Check artwork-manifest.json.' : '. No image references were missing.'));
    } catch (error) {
      status('Could not complete the artwork archive: ' + (error.message || 'Unknown problem') + '. No files were changed.');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function start() {
    document.addEventListener('click', event => {
      if (event.target.closest('#pancoonArtArchive')) downloadArtworkArchive();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
