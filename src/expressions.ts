// Each eye is a pixel grid drawn on the screen: "#" lights a pixel.
// `right` defaults to the mirror image of `left`.
// `leds` drives the three RGB LEDs on top: one color per LED plus an animation.
export type LedMode = "steady" | "breathe" | "blink" | "chase" | "rainbow";
export type Leds = { colors: [string, string, string]; mode: LedMode; speed: number };
type Expression = { left: string[]; right?: string[]; leds: Leds };

const RED = "#ff2a2a";
const GREEN = "#2aff4a";
const BLUE = "#2a6bff";

export const EXPRESSIONS = {
  neutral: {
    left: ["##", "##", "##", "##", "##", "##"],
    leds: { colors: [RED, GREEN, BLUE], mode: "breathe", speed: 0.25 },
  },
  happy: {
    left: [".##.", "#..#", "#..#"],
    leds: { colors: ["#ffd400", "#7dff3a", "#ffd400"], mode: "chase", speed: 6 },
  },
  surprised: {
    left: ["####", "#..#", "#..#", "#..#", "####"],
    leds: { colors: ["#00e5ff", "#ffffff", "#00e5ff"], mode: "blink", speed: 4 },
  },
  sleepy: {
    left: ["....", "....", "....", "####"],
    leds: { colors: ["#7a5cff", "#7a5cff", "#7a5cff"], mode: "breathe", speed: 0.2 },
  },
  angry: {
    left: ["##...", "###..", "####.", "####."],
    leds: { colors: [RED, RED, RED], mode: "blink", speed: 5 },
  },
  sad: {
    left: ["...##", "..###", ".####", ".####"],
    leds: { colors: [BLUE, BLUE, BLUE], mode: "breathe", speed: 0.35 },
  },
  love: {
    left: [".#.#.", "#####", "#####", ".###.", "..#.."],
    leds: { colors: ["#ff3fa4", "#ff7ac0", "#ff3fa4"], mode: "breathe", speed: 1.2 },
  },
  dizzy: {
    left: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    leds: { colors: [RED, GREEN, BLUE], mode: "rainbow", speed: 0.8 },
  },
  wink: {
    left: ["##", "##", "##", "##", "##", "##"],
    right: ["....", "....", "####", "...."],
    leds: { colors: [GREEN, GREEN, "#00e5ff"], mode: "chase", speed: 3 },
  },
  laughing: {
    left: ["#....", ".##..", "...#.", ".##..", "#...."],
    leds: { colors: ["#ffd400", "#ff8a00", "#ffd400"], mode: "chase", speed: 9 },
  },
  excited: {
    left: ["..#..", "..#..", "#####", ".###.", ".#.#.", "#...#"],
    leds: { colors: [RED, GREEN, BLUE], mode: "rainbow", speed: 2.5 },
  },
  crying: {
    left: [".##", ".##", ".##", ".##", "...", "#..", "#.."],
    leds: { colors: [BLUE, "#00e5ff", BLUE], mode: "breathe", speed: 0.6 },
  },
  cool: {
    left: ["######", "######", ".####."],
    leds: { colors: ["#00e5ff", "#ff3fa4", "#00e5ff"], mode: "steady", speed: 0 },
  },
  confused: {
    left: ["####", "#..#", "#..#", "####"],
    right: ["##", "##"],
    leds: { colors: ["#ff8a00", "#ff8a00", "#ff8a00"], mode: "chase", speed: 2 },
  },
  skeptical: {
    left: ["####"],
    right: ["##", "##", "##", "##"],
    leds: { colors: ["#ffb000", "#ffb000", "#ffb000"], mode: "breathe", speed: 0.5 },
  },
} satisfies Record<string, Expression>;

export type ExpressionName = keyof typeof EXPRESSIONS;

export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS) as ExpressionName[];

const mirror = (rows: string[]) => rows.map((row) => row.split("").reverse().join(""));

export function eyeGrids(name: ExpressionName): [string[], string[]] {
  const { left, right } = EXPRESSIONS[name] as Expression;
  return [left, right ?? mirror(left)];
}

export function ledsFor(name: ExpressionName): Leds {
  return EXPRESSIONS[name].leds;
}
