import { ball, blob, costume, lathe, leaf, rotate, tube, vec } from "../costume-shapes.ts";

// Dhanteras (Dhantrayodashi), the day to buy gold: a brass kalash topped with
// mango leaves and a coconut, gold coins circling it.

const TOP = vec(0, 0, 0);
const KALASH: [number, number][] = [
  [0, -40],
  [8, -40],
  [11, -41.5],
  [15, -45],
  [16.5, -49],
  [15.5, -53],
  [11.5, -56.5],
  [8, -58],
  [7, -59.5],
  [8, -61],
  [10.5, -62],
  [10.5, -63],
  [0, -63],
];

const thread = Array.from({ length: 13 }, (_, k) => {
  const a = (k / 12) * Math.PI * 2;
  return vec(8.4 * Math.cos(a), -58, 8.4 * Math.sin(a));
});

const leaves = Array.from({ length: 7 }, (_, k) => {
  const a = (k / 7) * Math.PI * 2 + 0.3;
  // Fanned out round the coconut, tips up and out.
  const out = vec(Math.cos(a) * 0.75, -0.65, Math.sin(a) * 0.75);
  const l = Math.hypot(out.x, out.y, out.z);
  return leaf(
    vec(8 * Math.cos(a), -62, 8 * Math.sin(a)),
    vec(out.x / l, out.y / l, out.z / l),
    vec(-Math.sin(a), 0, Math.cos(a)),
    21,
    7.5,
  );
}).flat();

/** A coin standing on edge, facing along `angle` around the ring. */
const coin = (angle: number, tilt: number) => {
  const c = vec(34 * Math.cos(angle), -47, 34 * Math.sin(angle));
  const flat = lathe(
    [
      [0, -0.6],
      [5, -0.6],
      [5, 0.6],
      [0, 0.6],
    ],
    c,
    12,
  );
  return rotate(flat, c, Math.PI / 2, -angle + tilt, 0);
};

export default costume({
  parts: { coins: { origin: [0, -47, 0], uniform: true } },
  pieces: [
    { color: "#d39a2e", shapes: lathe(KALASH, TOP, 14) },
    {
      color: "#c4302b",
      shapes: tube(
        thread,
        thread.map(() => 0.9),
        5,
      ),
    },
    { color: "#3f8f3a", shapes: leaves },
    { color: "#8a5a2b", shapes: blob(vec(0, -70, 0), 6.8, 8.2, 6.8, 5, 9) },
    { color: "#b88a52", shapes: ball(vec(0, -78.4, 0), 1.6, 1, 2, 6) },
    {
      part: "coins",
      color: "#f3c94a",
      shapes: Array.from({ length: 7 }, (_, k) =>
        coin((k / 7) * Math.PI * 2, 0.5 + 0.4 * k),
      ).flat(),
    },
  ],
});
