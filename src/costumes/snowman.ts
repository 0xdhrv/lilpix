import { ball, costume, lathe, leaf, rotate, tube, vec } from "../costume-shapes.ts";

const TOP = vec(0, 0, 0);

const HAT: [number, number][] = [
  [0, -40.2],
  [33, -40.2],
  [34.6, -41.4],
  [33, -42.6],
  [21, -42.6],
  [21, -71],
  [0, -71],
];

const BAND: [number, number][] = [
  [20.8, -42.7],
  [21.8, -42.7],
  [21.8, -49.6],
  [20.8, -49.6],
];

// A sprig of holly tucked in the band, front right.
const HOLLY = vec(12, -47, -18.5);
const holly = [
  ...leaf(HOLLY, vec(0.86, -0.36, -0.36), vec(0.3, 0.93, -0.2), 11, 5.5),
  ...leaf(HOLLY, vec(0.2, -0.9, -0.4), vec(0.98, 0.2, 0), 10, 5),
];
const berries = [vec(10.5, -46, -20.2), vec(13.4, -45.2, -20), vec(11.6, -43.6, -20.4)].flatMap(
  (c) => ball(c, 1.6, 1, 3, 6),
);

const hatAt = vec(0, -40, 0);
const tilt = (shapes: ReturnType<typeof lathe>) => rotate(shapes, hatAt, 0, 0, 0.12);

const twig = (s: number) => {
  const at = (x: number, y: number) => vec(s * x, y, 0);
  return [
    ...tube([at(44, 12), at(56, 4), at(68, -8), at(74, -16)], [1.8, 1.5, 1.1, 0.6], 5),
    ...tube([at(60, 1), at(64, -10), at(63, -16)], [1.1, 0.8, 0.5], 4),
    ...tube([at(69, -9), at(78, -10)], [0.8, 0.4], 4),
  ];
};

export default costume({
  parts: {
    hat: { origin: [0, -40, 0] },
    armL: { origin: [-44, 12, 0] },
    armR: { origin: [44, 12, 0] },
    snow: {},
  },
  pieces: [
    { part: "hat", color: "#1d1d22", shapes: tilt(lathe(HAT, TOP, 16)) },
    { part: "hat", color: "#b8222b", shapes: tilt(lathe(BAND, TOP, 16)) },
    { part: "hat", color: "#2f7a3c", shapes: tilt(holly) },
    { part: "hat", color: "#d42a2a", shapes: tilt(berries) },
    {
      color: "#f07a24",
      shapes: tube([vec(0, 27, -40), vec(0.4, 27.6, -48), vec(1, 28.4, -58)], [3.4, 2.1, 0.3], 7),
    },
    { part: "armL", color: "#5b3a22", shapes: twig(-1) },
    { part: "armR", color: "#5b3a22", shapes: twig(1) },
    // Filled in by the falling-snow motion (see costume-motion.ts).
    { part: "snow", color: "#f4f8ff", shapes: [] },
  ],
});
