import { ball, costume, lathe, tube, vec } from "../costume-shapes.ts";

const TOP = vec(0, 0, 0);

// Squared off like the head, so the cap covers its corners.
const squircle = (a: number) => (Math.abs(Math.cos(a)) ** 4 + Math.abs(Math.sin(a)) ** 4) ** -0.25;

const CAP: [number, number][] = [
  [41, -33.8],
  [45.5, -34.2],
  [47.2, -37.5],
  [46, -43],
  [41, -49.5],
  [32, -54.5],
  [18, -58],
  [0, -59.2],
];

// Rows of scales round the cap, each row offset half a scale from the last.
const ROWS = [
  { r: 46.2, y: -40, n: 22 },
  { r: 42.5, y: -47, n: 20 },
  { r: 35, y: -52.6, n: 17 },
  { r: 24.5, y: -56.4, n: 12 },
];
const scales = ROWS.flatMap(({ r, y, n }, row) =>
  Array.from({ length: n }, (_, k) => {
    const a = ((k + 0.5 * (row % 2)) / n) * Math.PI * 2;
    const s = (r + 0.4) * squircle(a);
    return ball(vec(s * Math.cos(a), y, s * Math.sin(a)), 2.8, 0.45, 3, 6);
  }).flat(),
);

const STEM = [vec(0, -58.5, 0), vec(0.6, -63, 0), vec(2.6, -67.5, 0), vec(6, -70.5, 0)];

export default costume({
  parts: { stem: { origin: [0, -58.5, 0] } },
  pieces: [
    {
      color: "#74492a",
      back: "#3e2614",
      shapes: lathe(CAP, TOP, 24, squircle),
    },
    { color: "#8c5b33", shapes: scales },
    {
      part: "stem",
      color: "#5a381d",
      shapes: tube(STEM, [2.6, 2.4, 2, 1.5], 6),
    },
    {
      color: "#a86e35",
      shapes: lathe(
        [
          [12, 39.6],
          [7, 43],
          [2.5, 46.6],
          [0, 47.6],
        ],
        TOP,
        10,
      ),
    },
  ],
});
