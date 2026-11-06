import { ball, blob, costume, tube, vec } from "../costume-shapes.ts";

// Bhai Bij (Bhai Dooj), when sisters put a tilak on their brothers: a
// saffron safa with a jewelled brooch and a plume, and a red tilak.

/** One wrap of cloth round the head: a rounded square, tilted across it. */
function wrap(y: number, a: number, b: number, tilt: number) {
  const points = Array.from({ length: 29 }, (_, k) => {
    const t = (k / 28) * Math.PI * 2;
    const [c, s] = [Math.cos(t), Math.sin(t)];
    const x = a * Math.sign(c) * Math.abs(c) ** 0.5;
    return vec(x, y + (tilt * x) / a, b * Math.sign(s) * Math.abs(s) ** 0.5);
  });
  return tube(
    points,
    points.map(() => 4.4),
    6,
  );
}

const ellipse = (cx: number, cy: number, rx: number, ry: number, z: number) => [
  Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * Math.PI * 2;
    return vec(cx + rx * Math.cos(a), cy + ry * Math.sin(a), z);
  }),
];

const PLUME = [
  vec(0, -52, -45),
  vec(0.8, -59, -44.5),
  vec(2.5, -66, -42.5),
  vec(5.5, -71.5, -39.5),
  vec(9.5, -74.5, -36.5),
  vec(13, -74, -34),
];

export default costume({
  parts: { kalgi: { origin: [0, -52, -45] } },
  pieces: [
    {
      color: "#f28a1d",
      shapes: [
        ...wrap(-40.5, 42, 43, 1.5),
        ...wrap(-51, 35, 36, 1.8),
        ...blob(vec(0, -54.5, 0), 28, 8, 29, 4, 10),
      ],
    },
    { color: "#d4352b", shapes: [...wrap(-46, 39.5, 40.5, -2), ...wrap(-55.5, 29, 30, -1.5)] },
    { color: "#e8b53c", shapes: blob(vec(0, -48.5, -45.5), 4.6, 4.6, 1.8, 3, 8) },
    { color: "#c8102e", shapes: ball(vec(0, -48.5, -47.2), 2.1, 1, 3, 6) },
    { color: "#d1132b", shapes: ellipse(0, -22, 1.9, 4.2, -40.3) },
    {
      color: "#fbf6ea",
      shapes: [
        ...ellipse(-0.5, -20.4, 0.6, 1.1, -40.4),
        ...ellipse(0.6, -22.6, 0.6, 1.1, -40.4),
        ...ellipse(-0.3, -24.6, 0.6, 1.1, -40.4),
      ],
    },
    { part: "kalgi", color: "#e8b53c", shapes: ball(PLUME[0], 1.8, 1, 3, 6) },
    {
      part: "kalgi",
      color: "#f7f2e8",
      shapes: tube(PLUME, [1.3, 1.8, 2.1, 2, 1.5, 0.4], 6),
    },
  ],
});
