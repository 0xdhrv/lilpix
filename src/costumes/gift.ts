import type { Vec } from "../costume-rig.ts";
import { blob, costume, leaf, vec } from "../costume-shapes.ts";

/** An axis-aligned box between two corners. */
function box(a: Vec, b: Vec): Vec[][] {
  const p = (i: number, j: number, k: number) => vec(i ? b.x : a.x, j ? b.y : a.y, k ? b.z : a.z);
  return [
    [p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0)],
    [p(0, 0, 1), p(0, 1, 1), p(1, 1, 1), p(1, 0, 1)],
    [p(0, 0, 0), p(0, 1, 0), p(0, 1, 1), p(0, 0, 1)],
    [p(1, 0, 0), p(1, 0, 1), p(1, 1, 1), p(1, 1, 0)],
    [p(0, 0, 0), p(0, 0, 1), p(1, 0, 1), p(1, 0, 0)],
    [p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)],
  ];
}

// Ribbon wraps the head both ways, over the top, down the back and both
// sides, but leaves the face clear. The ears stick out to ±44 from y -35.4.
const W = 5;
const ribbon = [
  box(vec(-40.6, -41.3, -W), vec(40.6, -40, W)),
  box(vec(39, -41.3, -W), vec(44.2, -35.4, W)),
  box(vec(-44.2, -41.3, -W), vec(-39, -35.4, W)),
  box(vec(44, -35.4, -W), vec(45.3, 38, W)),
  box(vec(-45.3, -35.4, -W), vec(-44, 38, W)),
  box(vec(-W, -41.3, -40.6), vec(W, -40, 40.6)),
  box(vec(-W, -41.3, 40), vec(W, 38, 41.3)),
].flat();

const KNOT = vec(0, -45, 0);
const loop = (s: number) =>
  blob(vec(14 * s, -51, 0), 13.5, 8, 5, 4, 10).map((face) =>
    face.map((p) => {
      // Lean each loop out and up from the knot.
      const [dx, dy] = [p.x - KNOT.x, p.y - KNOT.y];
      const a = -0.42 * s;
      return vec(
        KNOT.x + dx * Math.cos(a) - dy * Math.sin(a),
        KNOT.y + dx * Math.sin(a) + dy * Math.cos(a),
        p.z,
      );
    }),
  );
const tail = (s: number) =>
  leaf(vec(1.5 * s, -42, -1.5), vec(0.42 * s, 0.07, -0.9), vec(0.9, 0, 0.42 * s), 22, 6.5);

export default costume({
  parts: { bow: { origin: [KNOT.x, -41.3, KNOT.z] } },
  pieces: [
    { color: "#f0c24b", shapes: ribbon },
    { part: "bow", color: "#f0c24b", shapes: [...loop(-1), ...loop(1)] },
    { part: "bow", color: "#e2ad32", shapes: [...tail(-1), ...tail(1)] },
    { part: "bow", color: "#f6d06a", shapes: blob(KNOT, 5.6, 5, 5.6, 4, 8) },
  ],
});
