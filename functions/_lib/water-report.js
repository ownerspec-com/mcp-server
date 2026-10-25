/**
 * Water report reader for the MCP server (read_water_report).
 *
 * The limits are parsed at request time from the tables on the EPA limits page
 * (/water/guides/epa-drinking-water-limits-table/) as it sits in /index.json, so
 * the tool and the page cannot disagree: edit the page, rebuild, and the tool
 * follows. Nothing here is a health judgement. A row is "above" or "below" the
 * number EPA prints, and the page explains which of those numbers are enforceable.
 */
import { SITE } from "./corpus.js";

export const LIMITS_PATH = "/water/guides/epa-drinking-water-limits-table/";

/* Unit -> multiplier to mg/L. pCi/L and mrem are activity units and never convert. */
const TO_MG_L = {
  "mg/l": 1, ppm: 1, "ug/l": 0.001, "µg/l": 0.001, ppb: 0.001, "ng/l": 0.000001, ppt: 0.000001,
  "pci/l": null, "mrem/year": null, "mrem/yr": null, "color units": null, ton: null, ph: null,
};

/* What people type, mapped to the row name on the page. Longest key wins. */
const ALIASES = {
  nitrate: "Nitrate (as N)", "nitrate as n": "Nitrate (as N)", nitrite: "Nitrite (as N)",
  chromium: "Chromium (total)", "total chromium": "Chromium (total)", mercury: "Mercury (inorganic)",
  cyanide: "Cyanide (free)", tds: "Total dissolved solids (TDS)", "total dissolved solids": "Total dissolved solids (TDS)",
  radium: "Combined radium-226 and radium-228", "radium 226": "Combined radium-226 and radium-228", "radium-226": "Combined radium-226 and radium-228",
  "gross alpha": "Gross alpha particle activity (excluding radon and uranium)", genx: "HFPO-DA (GenX)", "hfpo-da": "HFPO-DA (GenX)",
  "foaming agents": "Foaming agents", ph: "pH",
};

const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const stripLinks = (s) => s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
const linkOf = (s) => {
  const m = /\[[^\]]+\]\(([^)]+)\)/.exec(s);
  return m ? new URL(m[1], SITE).href : null;
};

/* First number in a cell, the way the page prints it ("TT; action level 0.015 (...)" -> 0.015). */
function firstNumber(s) {
  const m = /(\d+(?:\.\d+)?)/.exec(s.replace(/,/g, ""));
  return m ? Number(m[1]) : null;
}

/**
 * Parse the page text into rows: { name, kind: primary|radionuclide|pfas|secondary,
 * limit (number), unit, range (pH and aluminium), label (as printed), guide }.
 */
export function parseLimits(text) {
  const rows = [];
  const lines = text.split("\n");
  let header = null;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) { header = null; continue; }
    if (/^\|\s*-/.test(line.trim())) continue;
    const c = cells(line);
    if (!header) { header = c.map((h) => h.toLowerCase()); continue; }
    const name = stripLinks(c[0]);
    if (header[0] === "contaminant" && header[2] === "mcl (mg/l)") {
      const n = firstNumber(c[2]);
      if (n !== null && !/fibers/.test(c[2])) rows.push({ name, kind: /^TT/.test(c[2]) ? "action" : "primary", limit: n, unit: "mg/L", label: c[2].replace(/^TT;\s*/, ""), guide: linkOf(c[3]) });
    } else if (header[0] === "contaminant" && header[2] === "mcl (epa unit)") {
      const unit = (/(pCi\/L|mrem\/year|µg\/L)/.exec(c[2]) || [])[1];
      const n = firstNumber(c[2]);
      if (n !== null && unit) rows.push({ name, kind: "radionuclide", limit: unit === "µg/L" ? n / 1000 : n, unit: unit === "µg/L" ? "mg/L" : unit, label: c[2], guide: `${SITE}/water/guides/uranium-radon-in-well-water/` });
    } else if (header[0] === "pfas") {
      const n = firstNumber(c[1]);
      if (n !== null && /ppt/.test(header[1]) && !/hazard index/i.test(name)) rows.push({ name, kind: "pfas", limit: n / 1e6, unit: "mg/L", label: `${c[1]} ppt (${c[3]})`, guide: `${SITE}/water/guides/pfas-in-tap-water-what-filter/` });
    } else if (header[0] === "parameter" && header[1] === "secondary standard") {
      const range = /(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/.exec(c[1]);
      const unit = /mg\/L/.test(c[1]) ? "mg/L" : /color units/.test(c[1]) ? "color units" : /TON/.test(c[1]) ? "TON" : name === "pH" ? "pH" : null;
      if (range) rows.push({ name, kind: "secondary", limit: Number(range[2]), low: Number(range[1]), unit, range: true, label: c[1], guide: linkOf(c[2]) });
      else if (firstNumber(c[1]) !== null && unit) rows.push({ name, kind: "secondary", limit: firstNumber(c[1]), unit, label: c[1], guide: linkOf(c[2]) });
    }
  }
  return rows;
}

const norm = (s) => s.toLowerCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim();

function rowsFor(rows, input) {
  const q = norm(input);
  const alias = Object.keys(ALIASES).filter((k) => q === k || q.startsWith(`${k} `)).sort((a, b) => b.length - a.length)[0];
  const target = alias ? norm(ALIASES[alias]) : q;
  let hits = rows.filter((r) => norm(r.name) === target);
  if (!hits.length && target.length >= 3) hits = rows.filter((r) => norm(r.name).startsWith(target));
  return hits;
}

/* "arsenic 12 ppb, nitrate 4.1 mg/L; pH 6.2" -> [{ name, value, unit }] */
export function parseReportText(text) {
  const out = [];
  const re = /([A-Za-z][A-Za-z0-9 ()\-/.]*?)\s*[:=]?\s*(<)?\s*(\d+(?:\.\d+)?)\s*(mg\/l|ppm|ppb|ppt|µg\/l|ug\/l|ng\/l|pci\/l|color units|ton|gpg|grains per gallon)?(?=\s*(?:[,;\n]|$))/gi;
  for (const m of String(text).matchAll(re)) {
    const name = m[1].replace(/^[,;\s]+|[,;\s]+$/g, "").trim();
    if (!name) continue;
    out.push({ name, value: Number(m[3]), unit: m[4] || (/^ph$/i.test(name) ? "pH" : "mg/L"), below_detection: !!m[2] });
  }
  return out;
}

function toUnit(value, from, to) {
  const f = from.toLowerCase();
  if (f === to.toLowerCase()) return value;
  const a = TO_MG_L[f];
  const b = TO_MG_L[to.toLowerCase()];
  if (a === undefined || b === undefined || a === null || b === null) return null;
  return (value * a) / b;
}

/**
 * Compare results against the parsed limits. Returns one row per result per
 * matching limit (copper and fluoride have both a primary and a secondary row).
 */
export function compare(limits, results) {
  const rows = [];
  for (const r of results) {
    /* Hexavalent chromium has no federal MCL; matching it to "Chromium (total)" would mislead. */
    if (/hexavalent|chrom\w*[\s-]*(6|vi)\b|\bcr\s*-?\s*(6|vi)\b/i.test(r.name)) {
      rows.push({ input: r, status: "no_epa_limit", note: "Chromium-6 has no federal MCL; EPA's 0.1 mg/L limit is for total chromium. California set its own chromium-6 MCL.", guide: `${SITE}/water/guides/chromium-6-in-california-tap-water/` });
      continue;
    }
    if (/colif|e\.? ?coli|bacteria/i.test(r.name)) {
      rows.push({ input: r, status: "no_epa_limit", note: "Bacteria are reported present or absent, not against a mg/L limit; any positive result is read on the coliform guide.", guide: `${SITE}/water/guides/coliform-positive-well-water/` });
      continue;
    }
    const hits = rowsFor(limits, r.name);
    if (!hits.length) {
      rows.push({ input: r, status: "no_epa_limit", note: /hard/i.test(r.name) ? "Hardness has no EPA limit; see the hard water guide." : "No EPA primary or secondary limit on the OwnerSpec table for this name.", guide: /hard/i.test(r.name) ? `${SITE}/water/guides/hard-water-white-scale/` : null });
      continue;
    }
    for (const h of hits) {
      if (h.unit === "pH") {
        const status = r.value < h.low ? "below_range" : r.value > h.limit ? "above_range" : "within";
        rows.push({ input: r, limit: h, value_in_limit_unit: r.value, status });
        continue;
      }
      const v = toUnit(r.value, r.unit || "mg/L", h.unit);
      if (v === null) { rows.push({ input: r, limit: h, status: "unit_mismatch", note: `The page prints this limit in ${h.unit}; ${r.unit} does not convert.` }); continue; }
      const status = r.below_detection ? "below_detection" : v > h.limit ? "above" : "at_or_below";
      rows.push({ input: r, limit: h, value_in_limit_unit: +v.toPrecision(4), status });
    }
  }
  return rows;
}
