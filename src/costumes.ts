import type { Theme } from "./backgrounds.ts";

// Each costume recolors the bot and adds a mesh from src/costumes/<name>: the
// Halloween ones are traced from Vercel's Lil Pix nav logo, which morphs into
// these heads on hover, and stored as JSON in bot units (see Costume.tsx); the
// Diwali ones, one per day of the festival, are modeled in code.
type Look = {
  /** Shell (body and ears). */
  shell: string;
  /** LED lenses while they're off. */
  leds: string;
  screen: string;
  eyes?: string;
};
type CostumeDef = Look & {
  label: string;
  /** Overrides for light mode. */
  light?: Partial<Look>;
  /** Hangs upside down, like a bat from a branch. */
  upsideDown?: boolean;
  /** Other names to search by. */
  aliases?: string[];
};

// In festival order, named as in Gujarat.
const DIWALI = {
  "vagh-baras": {
    label: "Vagh Baras",
    aliases: ["vasu baras", "govatsa dwadashi", "cow", "calf"],
    shell: "#f1ebe0",
    leds: "#8f7a62",
    screen: "#221a12",
    light: { shell: "#e4dccd" },
  },
  dhanteras: {
    label: "Dhanteras",
    aliases: ["dhantrayodashi", "dhan teras", "gold", "kalash", "coins"],
    shell: "#1f6b56",
    leds: "#0b2d23",
    screen: "#06140f",
    eyes: "#fff1c4",
  },
  "kali-chaudas": {
    label: "Kali Chaudas",
    aliases: ["narak chaturdashi", "kali chaudashi", "nimbu mirchi", "chhoti diwali"],
    shell: "#2b2638",
    leds: "#100e16",
    screen: "#0c0a12",
    eyes: "#ff6a3d",
    light: { shell: "#433c56" },
  },
  diwali: {
    label: "Diwali",
    aliases: ["deepavali", "lakshmi puja", "diya", "lights"],
    shell: "#9b2335",
    leds: "#45101a",
    screen: "#1c060b",
    eyes: "#ffd877",
  },
  "bestu-varas": {
    label: "Bestu Varas",
    aliases: ["new year", "nutan varsh", "saal mubarak", "fireworks", "toran"],
    shell: "#2f3170",
    leds: "#15163a",
    screen: "#0b0b1f",
    light: { shell: "#3d4090" },
  },
  "bhai-bij": {
    label: "Bhai Bij",
    aliases: ["bhai dooj", "bhaiya dooj", "bhau beej", "tilak", "safa", "turban"],
    shell: "#3a5bab",
    leds: "#172752",
    screen: "#0b1328",
  },
} satisfies Record<string, CostumeDef>;

const HALLOWEEN = {
  frank: {
    label: "Frank",
    shell: "#60a43c",
    leds: "#213e16",
    screen: "#101d09",
  },
  drac: {
    label: "Drac",
    shell: "#dad7e8",
    leds: "#77728f",
    screen: "#271f3a",
    light: { shell: "#c4c2d1" },
  },
  spook: {
    label: "Spook",
    shell: "#f2f2f8",
    leds: "#9a9aa6",
    screen: "#27272c",
    light: { shell: "#e2e2e6" },
  },
  patch: {
    label: "Patch",
    shell: "#e26616",
    leds: "#411c05",
    screen: "#411c05",
    eyes: "#ffd166",
    light: { leds: "#491f06", screen: "#491f06" },
  },
  slime: {
    label: "Slime",
    shell: "#68c840",
    leds: "#285a15",
    screen: "#0c1807",
  },
  kitty: {
    label: "Kitty",
    shell: "#322e3e",
    leds: "#131118",
    screen: "#161320",
    eyes: "#ffd362",
    light: { shell: "#4f4862" },
  },
  wrapped: {
    label: "Wrapped",
    shell: "#d1bf9e",
    leds: "#6c583a",
    screen: "#1a140b",
  },
  devil: {
    label: "Devil",
    shell: "#e03638",
    leds: "#6a1212",
    screen: "#1a0607",
  },
  bat: { label: "Bat", shell: "#604c80", leds: "#271c3a", screen: "#130c1d" },
  "hanging-bat": {
    label: "Hanging Bat",
    shell: "#604c80",
    leds: "#271c3a",
    screen: "#130c1d",
    upsideDown: true,
  },
  witch: {
    label: "Witch",
    shell: "#8e67ca",
    leds: "#3f2566",
    screen: "#120a1e",
    light: { shell: "#865cc6" },
  },
  skully: {
    label: "Skully",
    shell: "#f8f1dd",
    leds: "#978b6f",
    screen: "#1d1812",
    light: { shell: "#e9e2d0", leds: "#a59779", screen: "#302b1e" },
  },
  wolf: { label: "Wolf", shell: "#925430", leds: "#482613", screen: "#1c0f08" },
  spider: {
    label: "Spider",
    shell: "#302e3f",
    leds: "#14131a",
    screen: "#0e0c16",
    light: { shell: "#403e54" },
  },
  flame: {
    label: "Flame",
    shell: "#f0e5cd",
    leds: "#a6906b",
    screen: "#30291d",
    eyes: "#fff8ea",
    light: { leds: "#a9936d", screen: "#3f3525" },
  },
  alien: {
    label: "Alien",
    shell: "#9ce452",
    leds: "#3a6315",
    screen: "#0d1405",
  },
  cauldron: {
    label: "Cauldron",
    shell: "#3d4048",
    leds: "#0a0a0c",
    screen: "#0a0b11",
    eyes: "#f5fff2",
    light: { shell: "#555a64", screen: "#161922" },
  },
  potion: {
    label: "Potion",
    // The logo fills its glass head with brew; the shell takes the brew's color.
    shell: "#55d447",
    leds: "#0c0c0d",
    screen: "#101110",
    light: { leds: "#7c7e83", screen: "#2a2b2a" },
  },
} satisfies Record<string, CostumeDef>;

export const COSTUMES = { ...DIWALI, ...HALLOWEEN };

export type CostumeName = keyof typeof COSTUMES;

export const COSTUME_NAMES = Object.keys(COSTUMES) as CostumeName[];

/** cmdk item value for a costume; null is "No costume". */
export const costumeValue = (name: CostumeName | null) => `costume-${name ?? "none"}`;

/** Words the command menu finds a costume by. */
export function costumeKeywords(name: CostumeName) {
  const costume: CostumeDef = COSTUMES[name];
  return [costume.label, ...(costume.aliases ?? []), name in DIWALI ? "diwali" : "halloween"];
}

export function costumeLook(name: CostumeName, theme: Theme): Look {
  const costume: CostumeDef = COSTUMES[name];
  return theme === "light" ? { ...costume, ...costume.light } : costume;
}

export const isUpsideDown = (name: CostumeName | null) =>
  name !== null && (COSTUMES[name] as CostumeDef).upsideDown === true;
