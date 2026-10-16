export type Theme = "light" | "dark";

// Gradient stops run top → bottom (linear) or center → edge (radial).
type Palette = { base: string; stops: string[] };

type Background = {
  label: string;
  kind: "solid" | "radial" | "linear" | "grid" | "sparkles";
  light: Palette;
  dark: Palette;
};

export const BACKGROUNDS = {
  studio: {
    label: "Studio",
    kind: "solid",
    light: { base: "#e9e7e4", stops: [] },
    dark: { base: "#141416", stops: [] },
  },
  spotlight: {
    label: "Spotlight",
    kind: "radial",
    light: { base: "#d9d6d1", stops: ["#ffffff", "#e9e7e4", "#c9c5bf"] },
    dark: { base: "#08080a", stops: ["#34343c", "#141418", "#030304"] },
  },
  dusk: {
    label: "Dusk",
    kind: "linear",
    light: { base: "#f6c7c0", stops: ["#c9b6ff", "#f6c7c0", "#ffe2b8"] },
    dark: { base: "#1b1233", stops: ["#070b1f", "#1b1233", "#4a1f3d"] },
  },
  grid: {
    label: "Grid",
    kind: "grid",
    light: { base: "#efeeeb", stops: ["#d4d1cc", "#b5b1aa"] },
    dark: { base: "#0d0d10", stops: ["#26262c", "#3a3a44"] },
  },
  sparkles: {
    label: "Sparkles",
    kind: "sparkles",
    light: { base: "#e6e3f0", stops: ["#8a7fb8"] },
    dark: { base: "#07070c", stops: ["#c9d6ff"] },
  },
  aurora: {
    label: "Aurora",
    kind: "linear",
    light: { base: "#d9f5ea", stops: ["#e6dcff", "#cdeefa", "#d4f7e4"] },
    dark: { base: "#06201f", stops: ["#120b30", "#08302f", "#031012"] },
  },
  ocean: {
    label: "Ocean",
    kind: "radial",
    light: { base: "#b9dcf5", stops: ["#eef8ff", "#c4e2f7", "#8fbfe3"] },
    dark: { base: "#081a2c", stops: ["#13385a", "#0a1f35", "#020910"] },
  },
  synthwave: {
    label: "Synthwave",
    kind: "grid",
    light: { base: "#fbe6f5", stops: ["#f2b3dc", "#d566b8"] },
    dark: { base: "#12061f", stops: ["#4a1866", "#d42a9e"] },
  },
  blueprint: {
    label: "Blueprint",
    kind: "grid",
    light: { base: "#e9f0ff", stops: ["#c2d3f5", "#8aa8e4"] },
    dark: { base: "#0b1d42", stops: ["#1a3570", "#3263b3"] },
  },
} satisfies Record<string, Background>;

export type BackgroundName = keyof typeof BACKGROUNDS;

export const BACKGROUND_NAMES = Object.keys(BACKGROUNDS) as BackgroundName[];

/** cmdk item value for a background. */
export const bgValue = (name: BackgroundName) => `bg-${name}`;

export function backgroundFor(name: BackgroundName): Background {
  return BACKGROUNDS[name] as Background;
}

/** CSS approximation of a background, used for swatches in the menu. */
export function swatchCss(name: BackgroundName, theme: Theme): string {
  const bg = backgroundFor(name);
  const { base, stops } = bg[theme];
  switch (bg.kind) {
    case "radial":
      return `radial-gradient(circle at 50% 45%, ${stops.join(", ")})`;
    case "linear":
      return `linear-gradient(${stops.join(", ")})`;
    case "grid":
      return `repeating-linear-gradient(0deg, ${stops[0]} 0 1px, transparent 1px 6px), repeating-linear-gradient(90deg, ${stops[0]} 0 1px, transparent 1px 6px), ${base}`;
    case "sparkles":
      return `radial-gradient(circle at 30% 35%, ${stops[0]} 0 1.5px, transparent 2px), radial-gradient(circle at 70% 65%, ${stops[0]} 0 1.5px, transparent 2px), ${base}`;
    default:
      return base;
  }
}
