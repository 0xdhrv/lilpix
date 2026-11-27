import { costume, lathe, tube, vec } from "../costume-shapes.ts";

const TOP = vec(0, 0, 0);

const HAT: [number, number][] = [
  [0, -40.2],
  [37, -40.2],
  [38.6, -41.4],
  [37, -42.6],
  [23.5, -42.6],
  [22.6, -55],
  [21, -70],
  [19.8, -71.6],
  [0, -71.6],
];

const BAND: [number, number][] = [
  [23.3, -42.7],
  [24.2, -42.7],
  [23.6, -50.4],
  [22.7, -50.4],
];

// A square buckle on the front of the band.
const [W, H, Z] = [5.2, 4.4, -24.4];
const BUCKLE = [
  vec(-W, -46.5 - H, Z),
  vec(W, -46.5 - H, Z),
  vec(W, -46.5 + H, Z - 0.5),
  vec(-W, -46.5 + H, Z - 0.5),
];

export default costume({
  parts: { hat: { origin: [0, -40, 0] } },
  pieces: [
    { part: "hat", color: "#2c2826", shapes: lathe(HAT, TOP, 16) },
    { part: "hat", color: "#121010", shapes: lathe(BAND, TOP, 16) },
    {
      part: "hat",
      color: "#dcb24c",
      shapes: tube(
        [...BUCKLE, BUCKLE[0], BUCKLE[1]],
        Array.from({ length: 6 }, () => 0.85),
        4,
      ),
    },
  ],
});
