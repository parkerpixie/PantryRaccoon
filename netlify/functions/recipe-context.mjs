const MAX_BYTES = 12_000_000;
const REQUEST_TIMEOUT_MS = 15_000;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function isPrivateHostname(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(host)) return true;
  const match = host.match(/^172\.(\d{1,3})\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;
  return false;
}

function validateUrl(raw) {
  let url;
  try { url = new URL(raw); }
  catch { throw new Error("That recipe link is not a valid URL."); }
  if (url.protocol !== "https:") throw new Error("Recipe links must use HTTPS.");
  if (url.username || url.password || isPrivateHostname(url.hostname)) throw new Error("That recipe host is not allowed.");
  return url;
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function cleanText(value = "") {
  return decodeEntities(String(value)).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function durationMinutes(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  const iso = text.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i);
  if (iso) return Number(iso[1] || 0) * 1440 + Number(iso[2] || 0) * 60 + Number(iso[3] || 0);
  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i)?.[1] || 0);
  const minutes = Number(text.match(/(\d+)\s*(?:minutes?|mins?)/i)?.[1] || 0);
  return Math.round(hours * 60 + minutes);
}

function flattenJsonLd(value, output = [], seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return output;
  seen.add(value);
  if (Array.isArray(value)) { value.forEach(item => flattenJsonLd(item, output, seen)); return output; }
  output.push(value);
  Object.values(value).forEach(item => flattenJsonLd(item, output, seen));
  return output;
}

function isRecipe(node) {
  const type = node?.["@type"];
  return Array.isArray(type) ? type.some(value => String(value).toLowerCase() === "recipe") : String(type || "").toLowerCase() === "recipe";
}

function instructionLines(value, output = []) {
  if (!value) return output;
  if (Array.isArray(value)) { value.forEach(item => instructionLines(item, output)); return output; }
  if (typeof value === "string") { const text = cleanText(value); if (text) output.push(text); return output; }
  if (typeof value !== "object") return output;
  if (value.itemListElement) instructionLines(value.itemListElement, output);
  else if (value.steps) instructionLines(value.steps, output);
  else { const text = cleanText(value.text || value.name || ""); if (text) output.push(text); }
  return output;
}

function imageUrl(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return imageUrl(value[0]);
  if (typeof value === "object") return value.url || value.contentUrl || null;
  return null;
}

function parseJsonLd(raw) {
  const candidates = [];
  const cleaned = String(raw || "").replace(/^\s*<!--/, "").replace(/-->\s*$/, "")
    .replace(/^\s*\/\/<!\[CDATA\[/, "").replace(/\/\/\]\]>\s*$/, "").trim().replace(/;\s*$/, "");
  if (cleaned) candidates.push(cleaned);
  const indexes = [cleaned.indexOf("{"), cleaned.indexOf("[")].filter(index => index >= 0);
  const firstObject = indexes.length ? Math.min(...indexes) : -1;
  if (firstObject > 0) {
    const lastObject = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (lastObject > firstObject) candidates.push(cleaned.slice(firstObject, lastObject + 1));
  }
  for (const candidate of candidates) {
    for (const attempt of [candidate, decodeEntities(candidate)]) {
      try { return JSON.parse(attempt); } catch {}
    }
  }
  return null;
}

function recipeFromNode(recipe, sourceUrl) {
  const prepMinutes = durationMinutes(recipe.prepTime);
  const cookMinutes = durationMinutes(recipe.cookTime);
  const totalMinutes = durationMinutes(recipe.totalTime) || prepMinutes + cookMinutes;
  const yieldValue = Array.isArray(recipe.recipeYield) ? recipe.recipeYield.join(", ") : recipe.recipeYield;
  const ingredientSource = recipe.recipeIngredient || recipe.ingredients;
  const ingredients = Array.isArray(ingredientSource) ? ingredientSource.map(cleanText).filter(Boolean) : [];
  const instructions = instructionLines(recipe.recipeInstructions || recipe.instructions);
  return { name: cleanText(recipe.name || recipe.headline || "Saved recipe"), prepMinutes, cookMinutes, totalMinutes,
    servings: yieldValue ? cleanText(yieldValue) : null, ingredients, instructions, imageUrl: imageUrl(recipe.image), sourceUrl };
}

function sectionAfterHeading(html, heading, nextHeadings) {
  const headingMatch = new RegExp(`<h[1-4][^>]*>\\s*${heading}\\s*<\\/h[1-4]>`, "i").exec(html);
  if (!headingMatch) return "";
  const remainder = html.slice(headingMatch.index + headingMatch[0].length);
  const stop = new RegExp(`<h[1-4][^>]*>\\s*(?:${nextHeadings.join("|")})\\b`, "i").exec(remainder);
  return stop ? remainder.slice(0, stop.index) : remainder.slice(0, 250_000);
}

function listItems(section) {
  return [...String(section).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map(match => cleanText(match[1]).replace(/^\d+[.)]\s*/, "")).filter(text => text.length >= 2 && text.length <= 1200);
}

function labelMinutes(html, label) {
  const pattern = new RegExp(`${label}\\s*(?:Time)?\\s*:?[^0-9]{0,160}(\\d+)\\s*(?:mins?|minutes?|hours?|hrs?)`, "i");
  const match = pattern.exec(cleanText(html));
  if (!match) return 0;
  return durationMinutes(match[0]);
}

function extractVisibleRecipe(html, sourceUrl) {
  const name = cleanText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  const ingredientSection = sectionAfterHeading(html, "Ingredients", ["Directions", "Instructions", "Method", "Nutrition"]);
  const directionSection = sectionAfterHeading(html, "(?:Directions|Instructions|Method)", ["Nutrition", "Photos", "Reviews", "Tips"]);
  const ingredients = listItems(ingredientSection).filter(text => !/^(?:1\/2x|1x|2x)$/i.test(text)).filter(text => !/original recipe|automatically adjusted|scale perfectly/i.test(text));
  const instructions = listItems(directionSection).filter(text => text.length >= 10);
  if (!name || !ingredients.length || !instructions.length) return null;
  const prepMinutes = labelMinutes(html, "Prep");
  const cookMinutes = labelMinutes(html, "Cook");
  const totalMinutes = labelMinutes(html, "Total") || prepMinutes + cookMinutes;
  const servings = cleanText(html.match(/Servings?\s*:?[^0-9]{0,100}(\d+(?:\s*-\s*\d+)?)/i)?.[1] || "") || null;
  const image = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] || null;
  return { name, prepMinutes, cookMinutes, totalMinutes, servings, ingredients, instructions, imageUrl: image ? decodeEntities(image) : null, sourceUrl };
}

function extractRecipe(html, sourceUrl) {
  const scripts = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json(?:\s*;[^"']*)?["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const nodes = [];
  scripts.forEach(match => { const parsed = parseJsonLd(match[1]); if (parsed) flattenJsonLd(parsed, nodes); });
  const recipe = nodes.find(isRecipe);
  if (recipe) { const structured = recipeFromNode(recipe, sourceUrl); if (structured.ingredients.length || structured.instructions.length) return structured; }
  return extractVisibleRecipe(html, sourceUrl);
}

async function readTextUpTo(response, maxBytes = MAX_BYTES) {
  if (!response.body?.getReader) {
    const text = await response.text(); const bytes = new TextEncoder().encode(text);
    return { html: new TextDecoder().decode(bytes.slice(0, maxBytes)), truncated: bytes.length > maxBytes };
  }
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let html = ""; let total = 0; let truncated = false;
  while (true) {
    const { value, done } = await reader.read(); if (done) break; if (!value) continue;
    const remaining = maxBytes - total;
    if (remaining <= 0) { truncated = true; await reader.cancel().catch(() => {}); break; }
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    html += decoder.decode(chunk, { stream: true }); total += chunk.byteLength;
    if (value.byteLength > remaining) { truncated = true; await reader.cancel().catch(() => {}); break; }
  }
  html += decoder.decode(); return { html, truncated };
}

function candidateUrls(requested) {
  const urls = [requested];
  if (/(^|\.)allrecipes\.com$/i.test(requested.hostname)) {
    const printUrl = new URL(requested.href); printUrl.searchParams.set("print", "");
    if (printUrl.href !== requested.href) urls.push(printUrl);
  }
  return urls;
}

async function fetchCandidate(requested, signal) {
  const response = await fetch(requested, { redirect: "follow", signal, headers: {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "accept-language": "en-US,en;q=0.9", "cache-control": "no-cache" } });
  if (!response.ok) throw new Error(`The recipe page returned HTTP ${response.status}.`);
  const finalUrl = validateUrl(response.url || requested.href);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("The link did not lead to a recipe webpage.");
  const { html, truncated } = await readTextUpTo(response); return { html, finalUrl, truncated };
}

export async function handler(event) {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const rawUrl = event.queryStringParameters?.url;
  if (!rawUrl) return json(400, { error: "A recipe URL is required." });
  let requested;
  try { requested = validateUrl(rawUrl); } catch (error) { return json(400, { error: error.message }); }
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS); const failures = [];
  try {
    for (const candidate of candidateUrls(requested)) {
      try {
        const { html, finalUrl, truncated } = await fetchCandidate(candidate, controller.signal);
        const recipe = extractRecipe(html, finalUrl.href);
        if (recipe) return json(200, recipe);
        failures.push(truncated ? "The page was extremely large and its recipe block was not found within the safe reading limit." : "No structured or visible recipe details were found on that page.");
      } catch (error) { if (error.name === "AbortError") throw error; failures.push(error.message || "The recipe page could not be analyzed."); }
    }
    return json(422, { error: failures.at(-1) || "The recipe site did not provide readable recipe data." });
  } catch (error) {
    if (error.name === "AbortError") return json(504, { error: "The recipe page took too long to respond." });
    return json(502, { error: error.message || "The recipe page could not be analyzed." });
  } finally { clearTimeout(timeout); }
}
