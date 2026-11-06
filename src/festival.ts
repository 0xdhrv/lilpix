import type { CostumeName } from "./costumes.ts";

// The costume for each day of Diwali 2026, by local date, as the Gujarati
// calendar has them (Drik Panchang). Add each year's dates as they're set.
const DAYS: Record<string, CostumeName> = {
  "2026-11-05": "vagh-baras",
  "2026-11-06": "dhanteras",
  "2026-11-07": "kali-chaudas",
  "2026-11-08": "diwali",
  // Govardhan Puja; this year Gujarat's new year falls a day later.
  "2026-11-09": "diwali",
  "2026-11-10": "bestu-varas",
  "2026-11-11": "bhai-bij",
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
  } catch {
    // Storage blocked: dress up on every visit.
  }
  return name;
}
