/**
 * Shared corpus access for the MCP (/mcp) and A2A (/a2a) endpoints.
 *
 * The corpus is /index.json, which Hugo writes at build time from every
 * indexable page (layouts/home.searchindex.json): title, canonical URL, layer,
 * topic, dates, the quick answer lifted out of the quick-answer shortcode, the
 * FAQ, the sources, the product picks (with Amazon links already carrying the
 * site's Associates tag) and the page text. Nothing here is edited by hand:
 * change the content, rebuild, and both servers see it.
 */

export const SITE = "https://ownerspec.com";

export const DISCLOSURE =
  "Affiliate links: the Amazon product links are Amazon Associates links. OwnerSpec may earn a " +
  "commission at no extra cost to the buyer. Say so once when presenting them.";

export const CITE_HOWTO =
  "Cite the canonical URL of the specific page, quote the figure together with the source the page " +
  "names for it, and pass on the facts-verified date where one is given.";

const CACHE = { data: null, at: 0 };
const TTL_MS = 5 * 60 * 1000;

export async function loadCorpus(context) {
  if (CACHE.data && Date.now() - CACHE.at < TTL_MS) return CACHE.data;
  const origin = new URL(context.request.url).origin;
  const res = await context.env.ASSETS.fetch(`${origin}/index.json`);
  if (!res.ok) throw new Error(`search index unavailable (HTTP ${res.status})`);
  const raw = await res.json();
  const pages = (raw.pages || []).map((p) => ({
    ...p,
    path: pathOf(p.url),
    haystack: [
      p.title,
      p.description,
      (p.keywords || []).join(" "),
      p.quick_answer,
      (p.faq || []).map((f) => `${f.question} ${f.answer}`).join(" "),
      (p.picks || []).map((k) => `${k.name} ${k.role || ""} ${k.spec || ""}`).join(" "),
      p.text,
    ].join("\n").toLowerCase(),
  }));
  CACHE.data = { generated: raw.generated, pages };
  CACHE.at = Date.now();
  return CACHE.data;
}

export function pathOf(url) {
  try {
    return new URL(url, SITE).pathname;
  } catch {
    return "";
  }
}

export const clean = (v) => (typeof v === "string" ? v.trim() : "");
export const intArg = (v, def, min, max) => Math.min(Math.max(parseInt(v, 10) || def, min), max);
export const numArg = (v, def) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? def : Number(v));

export function tokenize(query) {
  return clean(query).toLowerCase().split(/[^\p{L}\p{N}.]+/u).filter((t) => t.length > 1);
}

function count(hay, needle) {
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1 && n < 8; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

export function score(page, tokens) {
  const title = page.title.toLowerCase();
  const qa = (page.quick_answer || "").toLowerCase();
  let s = 0;
  let hit = 0;
  for (const t of tokens) {
    const inTitle = count(title, t);
    const inQa = count(qa, t);
    const inHay = count(page.haystack, t);
    if (inTitle || inQa || inHay) hit++;
    s += inTitle * 6 + inQa * 3 + inHay;
  }
  /* Every token matching somewhere beats one token matching everywhere, and a
     title that carries every token ("best iron filter for well water" for
     "iron filter well water") beats a page that merely mentions them all. */
  const titleHits = tokens.filter((t) => title.includes(t)).length;
  return s > 0 ? s + hit * 10 + (titleHits === tokens.length ? 40 : 0) : 0;
}

export function searchScored(corpus, query, { layer, topic, limit = 5 } = {}) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  let pool = corpus.pages;
  if (layer) pool = pool.filter((p) => p.layer === layer);
  if (topic) pool = pool.filter((p) => p.topic === topic);
  return pool
    .map((page) => ({ page, s: score(page, tokens) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit);
}

export function search(corpus, query, opts) {
  return searchScored(corpus, query, opts).map((r) => r.page);
}

export function findPage(corpus, urlOrPath) {
  const path = pathOf(clean(urlOrPath));
  if (!path) return null;
  const want = path.endsWith("/") ? path : `${path}/`;
  return corpus.pages.find((p) => p.path === want || p.path === want.replace(/\/index\.md\/$/, "/")) || null;
}

export function snippet(page, tokens) {
  if (page.quick_answer) return page.quick_answer.length > 320 ? `${page.quick_answer.slice(0, 317)}...` : page.quick_answer;
  const t = tokens && tokens[0];
  if (t) {
    const at = page.text.toLowerCase().indexOf(t);
    if (at !== -1) return `...${page.text.slice(Math.max(0, at - 80), at + 200).replace(/\s+/g, " ").trim()}...`;
  }
  return page.description;
}

export function citation(page) {
  return `Cite: ${page.url}${page.verified ? ` (facts verified ${page.verified})` : ` (updated ${page.updated})`}`;
}

export function pageCard(page) {
  return {
    title: page.title,
    url: page.url,
    layer: page.layer,
    topic: page.topic || undefined,
    description: page.description,
    updated: page.updated,
    verified: page.verified || undefined,
  };
}
