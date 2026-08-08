const { URL } = require('url');

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*'
    },
    body: JSON.stringify(body)
  };
}

function isPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local')) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
  return false;
}

function parseDuration(value) {
  if (!value) return null;
  if (Number.isFinite(Number(value))) return Number(value);
  const text = String(value).trim();
  const iso = text.match(/^P(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (iso) return (Number(iso[1]) || 0) * 60 + (Number(iso[2]) || 0) + Math.round((Number(iso[3]) || 0) / 60);
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  const minutes = text.match(/(\d+)\s*(?:minutes?|mins?)/i);
  if (hours || minutes) return Math.round((Number(hours?.[1]) || 0) * 60 + (Number(minutes?.[1]) || 0));
  return null;
}

function arrayify(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
}

function instructionText(value) {
  const result = [];
  const visit = item => {
    if (!item) return;
    if (typeof item === 'string') {
      const clean = item.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (clean) result.push(clean);
      return;
    }
    if (Array.isArray(item)) return item.forEach(visit);
    if (typeof item === 'object') {
      if (item.text) visit(item.text);
      if (item.itemListElement) visit(item.itemListElement);
      if (item.steps) visit(item.steps);
    }
  };
  visit(value);
  return result;
}

function findRecipe(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  const types = arrayify(value['@type']).map(type => String(type).toLowerCase());
  if (types.includes('recipe')) return value;
  if (value['@graph']) {
    const found = findRecipe(value['@graph']);
    if (found) return found;
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      const found = findRecipe(child);
      if (found) return found;
    }
  }
  return null;
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function metaContent(html, property) {
  const safe = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${safe}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${safe}["'][^>]*>`, 'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return '';
}

exports.handler = async event => {
  if (event.httpMethod && event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' });
  const rawUrl = event.queryStringParameters?.url;
  if (!rawUrl) return response(400, { error: 'A recipe URL is required.' });

  let target;
  try {
    target = new URL(rawUrl);
    if (!/^https?:$/.test(target.protocol) || isPrivateHost(target.hostname)) throw new Error('unsafe');
  } catch (_) {
    return response(400, { error: 'Use a public http or https recipe URL.' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const page = await fetch(target.href, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; PantryRaccoon/1.0)',
        'accept': 'text/html,application/xhtml+xml'
      }
    });
    if (!page.ok) return response(502, { error: `The recipe site returned ${page.status}.` });
    const html = await page.text();
    if (html.length > 5_000_000) return response(413, { error: 'That recipe page is too large to parse safely.' });

    const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    let recipe = null;
    for (const match of scripts) {
      try {
        recipe = findRecipe(JSON.parse(match[1].trim()));
        if (recipe) break;
      } catch (_) {}
    }

    if (!recipe) return response(422, { error: 'I found the page, but it did not publish a readable recipe card. Add this one manually instead.' });

    const ingredients = arrayify(recipe.recipeIngredient || recipe.ingredients)
      .map(item => decodeHtmlEntities(String(item).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
      .filter(Boolean);
    const instructions = instructionText(recipe.recipeInstructions || recipe.instructions).map(decodeHtmlEntities);
    const prepMinutes = parseDuration(recipe.prepTime);
    const cookMinutes = parseDuration(recipe.cookTime);
    const totalMinutes = parseDuration(recipe.totalTime) || ((prepMinutes || 0) + (cookMinutes || 0) || null);
    const imageValue = recipe.image;
    const imageUrl = typeof imageValue === 'string'
      ? imageValue
      : Array.isArray(imageValue)
        ? (typeof imageValue[0] === 'string' ? imageValue[0] : imageValue[0]?.url || '')
        : imageValue?.url || '';
    const servings = Array.isArray(recipe.recipeYield) ? recipe.recipeYield.join(', ') : String(recipe.recipeYield || '');

    return response(200, {
      name: decodeHtmlEntities(recipe.name || metaContent(html, 'og:title') || target.hostname),
      ingredients,
      instructions,
      prepMinutes,
      cookMinutes,
      totalMinutes,
      servings: decodeHtmlEntities(servings),
      imageUrl,
      sourceUrl: page.url || target.href
    });
  } catch (error) {
    if (error?.name === 'AbortError') return response(504, { error: 'That recipe site took too long to respond.' });
    console.error('recipe-context failed', error);
    return response(500, { error: 'PantryRaccoon could not read that recipe page.' });
  } finally {
    clearTimeout(timer);
  }
};
