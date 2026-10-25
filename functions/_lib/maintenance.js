/**
 * Home maintenance planner for the MCP server (plan_home_maintenance).
 *
 * Every interval below is one an OwnerSpec page prints, with the maker or body
 * it quotes. `evidence` is a phrase that must stay on that page:
 * scripts/verify-build.mjs fails the build when a page loses it, so the planner
 * cannot keep quoting an interval the page no longer states.
 */
import { SITE } from "./corpus.js";

export const TASKS = [
  {
    id: "furnace-filter-1in",
    equipment: "furnace",
    label: "Furnace filter, 1-inch",
    task: "Check monthly; change at least every 3 months",
    months: 3,
    basis: "ENERGY STAR: check every month, change at least every 3 months. Change sooner with pets, construction dust or a constantly running fan.",
    page: "/air/guides/how-often-change-furnace-filter/",
    evidence: "change it at least every 3 months",
  },
  {
    id: "furnace-filter-media",
    equipment: "furnace-media",
    label: "Furnace media filter, 3 to 5 inch",
    task: "Change every 6 months, at least once a year",
    months: 6,
    basis: "Carrier: every six to nine months; Honeywell: every six months and at least once a year.",
    page: "/air/guides/how-often-change-furnace-filter/",
    evidence: "Honeywell's media air cleaner guide says every six months",
  },
  {
    id: "smoke-alarm",
    equipment: "smoke-alarm",
    label: "Smoke alarms",
    task: "Replace 10 years after the manufacture date on the back",
    months: 120,
    from: "manufacture",
    basis: "NFPA: replace every smoke alarm when it is 10 years old from the manufacture date.",
    page: "/air/guides/smoke-detector-chirping-low-battery-end-of-life/",
    evidence: "replace every smoke alarm when it is 10 years old",
  },
  {
    id: "washer-hoses",
    equipment: "washing-machine",
    label: "Washing machine supply hoses",
    task: "Replace every 3 to 5 years; inspect regularly",
    months: 36,
    basis: "IBHS: replace washing machine hoses every 3 to 5 years and upgrade to braided stainless steel.",
    page: "/plumbing/guides/washing-machine-hose-burst-replacement-interval/",
    evidence: "replace washing machine hoses every 3 to 5 years",
  },
  {
    id: "tank-heater-flush",
    equipment: "tank-water-heater",
    label: "Tank water heater flush",
    task: "Drain and flush once a year; every 6 months with hard water",
    months: 12,
    hardMonths: 6,
    basis: "A.O. Smith: at least once per year, more often with hard water. Rheem: once a year, or every 6 months with hard water.",
    page: "/plumbing/guides/water-heater-popping-noise-sediment-flush/",
    evidence: "or every 6 months with hard water",
  },
  {
    id: "tankless-flush",
    equipment: "tankless-water-heater",
    label: "Tankless water heater descale",
    task: "Flush the heat exchanger; the interval depends on your hardness",
    months: 12,
    basis: "Makers tie the interval to hardness; work out yours with the descale interval calculator before relying on the yearly default.",
    page: "/plumbing/calculators/tankless-water-heater-descale-interval-by-hardness/",
    evidence: null,
  },
  {
    id: "fridge-filter",
    equipment: "refrigerator",
    label: "Refrigerator water filter",
    task: "Replace every 6 months, or at the cartridge's rated gallons",
    months: 6,
    basis: "Frigidaire EPTWFU01: replaced every 6 months. Check the interval printed for your own cartridge.",
    page: "/water/reviews/best-refrigerator-water-filter/",
    evidence: "replaced every 6 months",
  },
  {
    id: "purifier-filter",
    equipment: "air-purifier",
    label: "Air purifier HEPA filter",
    task: "Replace on the model's interval, usually 6 to 12 months",
    months: 6,
    basis: "Levoit Core 300: 6 to 8 months; Coway AP-1512HH and Winix 5500-2: about 12 months. Shorten for smoke, pets or 24-hour running.",
    page: "/air/guides/how-often-replace-air-purifier-filter/",
    evidence: "Levoit's Core 300 filter page says every 6 to 8 months",
  },
  {
    id: "humidifier-wick",
    equipment: "portable-humidifier",
    label: "Portable humidifier wick filter",
    task: "Replace every 30 to 60 days in season",
    months: 2,
    basis: "Honeywell Filter A and Filter T: every 30 to 60 days.",
    page: "/air/parts/humidifier-filter-by-model/",
    evidence: "replaced every 30 to 60 days",
  },
  {
    id: "humidifier-panel",
    equipment: "whole-house-humidifier",
    label: "Whole-house humidifier water panel",
    task: "Replace once a year",
    months: 12,
    basis: "Aprilaire Water Panel 35: once a year; the Aprilaire 400 takes Panel 45 twice per heating season.",
    page: "/air/parts/humidifier-filter-by-model/",
    evidence: "replaced once a year",
  },
];

export const EQUIPMENT = [...new Set(TASKS.map((t) => t.equipment))];

const addMonths = (d, m) => {
  const x = new Date(d.getTime());
  x.setUTCMonth(x.getUTCMonth() + m);
  return x;
};
const iso = (d) => d.toISOString().slice(0, 10);

/**
 * equipment: list of EQUIPMENT keys. last_done: { taskOrEquipmentId: "YYYY-MM-DD" }.
 * Returns tasks sorted by due date, with overdue flagged.
 */
export function plan({ equipment, last_done = {}, hard_water = false, today = new Date() }) {
  const want = new Set(equipment && equipment.length ? equipment : EQUIPMENT);
  const now = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const rows = [];
  for (const t of TASKS.filter((x) => want.has(x.equipment))) {
    const months = hard_water && t.hardMonths ? t.hardMonths : t.months;
    const lastRaw = last_done[t.id] || last_done[t.equipment];
    const last = lastRaw && !Number.isNaN(Date.parse(lastRaw)) ? new Date(Date.parse(lastRaw)) : null;
    const due = last ? addMonths(last, months) : now;
    rows.push({
      id: t.id, equipment: t.equipment, label: t.label, task: t.task, every_months: months,
      last_done: last ? iso(last) : null, due: iso(due), overdue: !!last && due < now, unknown_last: !last,
      basis: t.basis, page: `${SITE}${t.page}`,
    });
  }
  rows.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  return rows;
}
