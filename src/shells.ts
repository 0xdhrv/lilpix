export const SHELLS = {
  graphite: { label: "Graphite", body: "#2d2c2d", swatch: "#2d2c2d" },
  snow: { label: "Snow", body: "#e8e8ea", swatch: "#e8e8ea" },
  mint: { label: "Mint", body: "#7fd6b4", swatch: "#7fd6b4" },
  coral: { label: "Coral", body: "#f2735f", swatch: "#f2735f" },
  sky: { label: "Sky", body: "#6aa8f0", swatch: "#6aa8f0" },
  lilac: { label: "Lilac", body: "#a98ae8", swatch: "#a98ae8" },
  sun: { label: "Sun", body: "#f5c542", swatch: "#f5c542" },
} satisfies Record<string, { label: string; body: string; swatch: string }>;

export type ShellName = keyof typeof SHELLS;

export const SHELL_NAMES = Object.keys(SHELLS) as ShellName[];

/** cmdk item value for a shell. */
export const shellValue = (name: ShellName) => `shell-${name}`;
