import { ball, blob, costume, lathe, tube, vec } from "../costume-shapes.ts";
import type { Vec } from "../costume-rig.ts";

// The diya's bowl, pinched to a spout along +x.
const spout = (a: number) => 1 + 0.5 * Math.max(0, Math.cos(a)) ** 6;
const BOWL: [number, number][] = [
  [0, -40],
  [7, -40],
  [11, -41.5],
  [15.5, -45],
  [19, -49.5],
  [20.5, -52.5],
  [18.5, -52.5],
  [15, -49.5],
];
const TOP = vec(0, 0, 0);

const dots = Array.from({ length: 11 }, (_, k) => {
  const a = ((k + 0.5) / 11) * Math.PI * 2;
  const r = 17.6 * spout(a);
  return ball(vec(r * Math.cos(a), -47, r * Math.sin(a)), 1.1, 1, 2, 6);
}).flat();

// The candle's flame outline, shrunk to a diya's.
const FLAME_OUTLINE =
  "M-0.6 -31.3C-0.2 -22.7 7.9 -18.1 8.1 -8.3C8.3 -1.0 4.7 2.3 0.0 2.3C-4.7 2.3 -8.4 -1.0 -8.6 -8.3C-8.8 -18.1 -1.5 -22.7 -0.6 -31.3Z";
const flamePath = FLAME_OUTLINE.replace(/-?\d+(\.\d+)?/g, (n) => (Number(n) * 0.62).toFixed(2));

// Along the sides the string drops to the tops of the ears (which stick out to
// ±44, from y -35.4), clear of them, so no bulb sinks into the shell.
const SAGS = 26;
const HOOKS = [
  vec(-40, -41, -42.5),
  vec(40, -41, -42.5),
  vec(46.5, -36.5, -38),
  vec(46.5, -36.5, 38),
  vec(40, -41, 42.5),
  vec(-40, -41, 42.5),
  vec(-46.5, -36.5, 38),
  vec(-46.5, -36.5, -38),
];
const SPANS = HOOKS.map((a, i) => {
  const b = HOOKS[(i + 1) % HOOKS.length];
  return { a, b, length: Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) };
});
const PERIMETER = SPANS.reduce((sum, s) => sum + s.length, 0);

/** The point `d` along the string, starting at the front-left corner. */
function along(d: number): Vec {
  d = ((d % PERIMETER) + PERIMETER) % PERIMETER;
  for (const { a, b, length } of SPANS) {
    if (d <= length) {
      const f = d / length;
      return vec(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f);
    }
    d -= length;
  }
  return vec(HOOKS[0].x, HOOKS[0].y, HOOKS[0].z);
}

const sagAt = (d: number) => {
  const p = along(d);
  p.y += 3 * Math.sin((Math.PI * (d % (PERIMETER / SAGS))) / (PERIMETER / SAGS));
  return p;
};

const wire = Array.from({ length: SAGS * 4 + 1 }, (_, i) => sagAt((i / (SAGS * 4)) * PERIMETER));

// Bulbs take turns round four colors; each color twinkles as one part.
const BULBS = ["glowA", "glowB", "glowC", "glowD"];
const BULB_COLORS = ["#ffc23a", "#ff4f86", "#53e07a", "#4fa8ff"];

const bulbs = BULBS.map((part, n) => ({
  part,
  color: BULB_COLORS[n],
  shapes: Array.from({ length: SAGS / 4 + 1 }, (_, k) => 4 * k + n)
    .filter((i) => i < SAGS)
    .flatMap((i) => {
      const p = sagAt(((i + 0.5) / SAGS) * PERIMETER);
      return blob(vec(p.x, p.y + 2.4, p.z), 2, 2.6, 2, 3, 6);
    }),
}));

export default costume({
  parts: {
    flame: { origin: [29, -54.2, 0] },
    ...Object.fromEntries(BULBS.map((b) => [b, {}])),
  },
  pieces: [
    { color: "#c0602e", shapes: lathe(BOWL, TOP, 18, spout) },
    {
      color: "#e2a23b",
      shapes: lathe(
        [
          [15, -49.6],
          [0, -49.6],
        ],
        TOP,
        18,
        spout,
      ),
    },
    { color: "#f4d35e", shapes: dots },
    {
      color: "#efe3c8",
      shapes: tube([vec(18, -49.8, 0), vec(28.5, -53.2, 0)], [0.9, 0.7], 5),
    },
    {
      color: "#2b2523",
      shapes: tube(
        wire,
        wire.map(() => 0.35),
        4,
      ),
    },
    ...bulbs,
  ],
  sprites: [{ path: flamePath, color: "#ff8422", at: [0, 0, 0], part: "flame" }],
});
