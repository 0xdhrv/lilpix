import type { Vec } from "../costume-rig.ts";
import { ball, costume, lathe, tube, vec } from "../costume-shapes.ts";

const TOP = vec(0, 0, 0);

// Squared off like the head, so the fur covers its corners.
const squircle = (a: number) => (Math.abs(Math.cos(a)) ** 4 + Math.abs(Math.sin(a)) ** 4) ** -0.25;

const FUR: [number, number][] = [
  [40, -35.6],
  [44.6, -36.4],
  [46.6, -39.6],
  [46.2, -43.6],
  [43.4, -47.2],
  [37, -48.4],
  [30, -47.4],
];

// The hat rises from the fur, then flops over to the right and back.
const TIP = vec(35, -75, 10);
const SPINE = [vec(0, -42, 0), vec(0, -74, 0), vec(14, -92, 6), TIP];
const STEPS = 12;

function bezier([a, b, c, d]: Vec[], s: number) {
  const k = [(1 - s) ** 3, 3 * s * (1 - s) ** 2, 3 * s * s * (1 - s), s ** 3];
  return vec(
    k[0] * a.x + k[1] * b.x + k[2] * c.x + k[3] * d.x,
    k[0] * a.y + k[1] * b.y + k[2] * c.y + k[3] * d.y,
    k[0] * a.z + k[1] * b.z + k[2] * c.z + k[3] * d.z,
  );
}

const steps = Array.from({ length: STEPS + 1 }, (_, i) => i / STEPS);

export default costume({
  parts: { hat: {}, pompom: { origin: [TIP.x, TIP.y, TIP.z] } },
  pieces: [
    {
      part: "hat",
      color: "#d0262e",
      shapes: tube(
        steps.map((s) => bezier(SPINE, s)),
        steps.map((s) => 2 + 32 * (1 - s) ** 1.15),
        12,
      ),
    },
    { color: "#f6f1e8", shapes: lathe(FUR, TOP, 24, squircle) },
    { part: "pompom", color: "#fbf8f2", shapes: ball(TIP, 7, 1, 4, 8) },
  ],
});
