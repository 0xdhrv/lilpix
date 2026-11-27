import type { Vec } from "../costume-rig.ts";
import { blob, costume, leaf, vec } from "../costume-shapes.ts";

// The tail fans out behind the head from here; costume-motion.ts spreads it.
const FAN = vec(0, -8, 46);
const FEATHERS = 13;
const SPREAD = 84 * (Math.PI / 180);

// Bands from the tips in: each layer is shorter and sits nearer the viewer.
const LAYERS = [
  { color: "#f1e2c2", length: 70, width: 17, z: 48 },
  { color: "#6b3c1d", length: 63, width: 16, z: 47.4 },
  { color: "#b8632a", length: 50, width: 13, z: 46.8 },
  { color: "#d23f2a", length: 34, width: 10, z: 46.2 },
];

/** A flat feather in the fan's plane: narrow at the root, round at the tip. */
function feather(base: Vec, angle: number, length: number, width: number) {
  const [s, c] = [Math.sin(angle), Math.cos(angle)];
  const half = (u: number) =>
    (width / 2) *
    (u < 0.6 ? Math.sin((u / 0.6) * (Math.PI / 2)) ** 0.7 : Math.sqrt(1 - ((u - 0.6) / 0.4) ** 2));
  const at = (u: number, w: number) =>
    vec(base.x + s * u * length + c * w, base.y - c * u * length + s * w, base.z);
  const steps = Array.from({ length: 11 }, (_, i) => i / 10);
  return [
    [...steps.map((u) => at(u, half(u))), ...[...steps].reverse().map((u) => at(u, -half(u)))],
  ];
}

const tail = LAYERS.map(({ color, length, width, z }) => ({
  part: "tail",
  color,
  shapes: Array.from({ length: FEATHERS }, (_, i) => {
    const a = -SPREAD + (2 * SPREAD * i) / (FEATHERS - 1);
    // Neighbours overlap at the root; stagger them so they don't z-fight.
    const base = vec(FAN.x + 6 * Math.sin(a), FAN.y - 6 * Math.cos(a), z + (i % 2) * 0.15);
    return feather(base, a, length, width);
  }).flat(),
}));

const wing = (s: number) =>
  leaf(vec(45.5 * s, -18, -6), vec(0.25 * s, 0.75, 0.61), vec(0, 0.62, -0.78), 34, 17, 6);

export default costume({
  parts: {
    tail: { origin: [FAN.x, FAN.y, FAN.z] },
    wattle: { origin: [9, 39, -40] },
    wingL: { origin: [-44, -18, -6] },
    wingR: { origin: [44, -18, -6] },
  },
  pieces: [
    ...tail,
    { part: "wingL", color: "#7a4522", shapes: wing(-1) },
    { part: "wingR", color: "#7a4522", shapes: wing(1) },
    {
      part: "wattle",
      color: "#d8312a",
      shapes: [
        ...blob(vec(9, 45, -40.5), 3.6, 6.4, 3.2, 4, 8),
        ...blob(vec(12.5, 43, -40), 2.6, 4.2, 2.4, 3, 7),
      ],
    },
  ],
});
