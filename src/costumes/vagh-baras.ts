import { ball, blob, costume, lathe, rotate, tube, vec } from "../costume-shapes.ts";

const horns = [-1, 1].map((s) => [
  vec(22 * s, -39, 4),
  vec(27 * s, -47, 5),
  vec(33 * s, -54, 6),
  vec(35 * s, -60, 6),
  vec(33 * s, -66, 5),
]);

const ear = (s: number) => {
  const root = vec(43 * s, -27, 6);
  return {
    outer: rotate(blob(vec(53 * s, -25, 6), 11, 4.5, 3.2, 4, 8), root, 0, 0, 0.45 * s),
    inner: rotate(blob(vec(53.5 * s, -25, 4.2), 7.5, 2.6, 1.8, 3, 8), root, 0, 0, 0.45 * s),
  };
};

const patch = (c: [number, number], r: number, seed: number, top = false) => [
  Array.from({ length: 9 }, (_, k) => {
    const a = (k / 9) * Math.PI * 2;
    const w = r * (0.8 + 0.25 * Math.sin(3 * a + seed) + 0.1 * Math.cos(5 * a));
    const [u, v] = [c[0] + w * Math.cos(a), c[1] + w * Math.sin(a)];
    return top ? vec(u, -40.25, v) : vec(u, v, -40.25);
  }),
];

const BELL = vec(0, 44, -30);

export default costume({
  parts: {
    earL: { origin: [-43, -27, 6] },
    earR: { origin: [43, -27, 6] },
    bell: { origin: [0, 40, -30] },
  },
  pieces: [
    {
      color: "#d9542c",
      shapes: horns.flatMap((h) => tube(h.slice(0, 4), [3.8, 3.4, 2.8, 2.1], 7)),
    },
    {
      color: "#f2c14e",
      shapes: horns.flatMap((h) => [
        ...tube(h.slice(3), [2.1, 0.5], 7),
        ...ball(h[4], 0.6, 1, 2, 6),
      ]),
    },
    { color: "#8a5a33", shapes: [...patch([27, -28], 8, 1), ...patch([-12, 14], 9, 4, true)] },
    { part: "earL", color: "#a8703f", shapes: ear(-1).outer },
    { part: "earR", color: "#a8703f", shapes: ear(1).outer },
    { part: "earL", color: "#e9a3a0", shapes: ear(-1).inner },
    { part: "earR", color: "#e9a3a0", shapes: ear(1).inner },
    { part: "bell", color: "#c0322b", shapes: tube([vec(0, 39, -30), BELL], [1, 1], 6) },
    {
      part: "bell",
      color: "#dca337",
      shapes: lathe(
        [
          [0, 0],
          [2.2, 0.5],
          [3.2, 2.5],
          [3.8, 5.5],
          [5.4, 8.5],
          [5.6, 9.5],
          [0, 9.5],
        ],
        BELL,
        10,
      ),
    },
    { part: "bell", color: "#6e4a16", shapes: ball(vec(0, 54.6, -30), 1.4, 1, 3, 6) },
  ],
});
