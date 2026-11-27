import type { CostumeName } from "./costumes.ts";

// The costume for each festival day, by local date. Add each year's dates as
// they're set.
const DAYS: Record<string, CostumeName> = {
  // Diwali 2026, as the Gujarati calendar has it (Drik Panchang).
  "2026-11-05": "vagh-baras",
  "2026-11-06": "dhanteras",
  "2026-11-07": "kali-chaudas",
  "2026-11-08": "diwali",
  // Govardhan Puja; this year Gujarat's new year falls a day later.
  "2026-11-09": "diwali",
  "2026-11-10": "bestu-varas",
  "2026-11-11": "bhai-bij",
  // US Thanksgiving, the fourth Thursday of November, and its long weekend.
  "2026-11-26": "turkey",
  "2026-11-27": "turkey",
  "2026-11-28": "turkey",
  "2026-11-29": "turkey",
  // Christmas Eve and Christmas Day.
  "2026-12-24": "santa",
  "2026-12-25": "santa",
};

const KEY = "lilpix:dressed-for";

/**
 * Today's festival costume, the first time lilpix opens on a festival day.
 * After that the bot wears whatever was last picked, so changing it sticks.
 */
export function festivalCostume(now = new Date()): CostumeName | null {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const name = DAYS[day];
  if (!name) return null;
  try {
    if (localStorage.getItem(KEY) === day) return null;
    localStorage.setItem(KEY, day);
  } catch {}
  return name;
}
