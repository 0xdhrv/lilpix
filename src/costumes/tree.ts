import type { Vec } from "../costume-rig.ts";
import { ball, costume, lathe, tube, vec } from "../costume-shapes.ts";

const TOP = vec(0, 0, 0);

// Three tiers of branches, each a cone that tucks under the one above.
const TIERS = [
  { r: 36, base: -43, apex: -63, baubles: 7 },
  { r: 27, base: -53, apex: -72, baubles: 5 },
  { r: 18, base: -63, apex: -81, baubles: 4 },
];
const tier = ({ r, base, apex }: (typeof TIERS)[number]): [number, number][] => [
  [0, base + 2],
  [r - 3, base + 2],
  [r, base],
  [0, apex],
];

// Baubles round the bottom of each tier, a half step round from the tier below.
const LIGHTS = ["glowA", "glowB", "glowC", "glowD"];
const COLORS = ["#ff3b3b", "#ffc93c", "#4fa8ff", "#f2f4ff"];
const baubles = TIERS.flatMap(({ r, base, apex, baubles: n }, row) =>
  Array.from({ length: n }, (_, k) => {
    const a = ((k + 0.5 * (row % 2)) / n) * Math.PI * 2 + 0.3;
    const y = base - 4;
    const at = r * ((y - apex) / (base - apex)) + 1.8;
    return ball(vec(at * Math.cos(a), y + 2.6, at * Math.sin(a)), 2.6, 1, 3, 6);
  }),
);

// A five-pointed star with some depth, standing on top.
const STAR = vec(0, -86, 0);
function star(c: Vec, outer: number, inner: number, depth: number) {
  const rim = Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const r = k % 2 ? inner : outer;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  const at = (z: number) => rim.map(([x, y]) => vec(c.x + x, c.y + y, c.z + z));
  const [front, back] = [at(-depth / 2), at(depth / 2)];
  const sides = front.map((p, k) => {
    const n = (k + 1) % front.length;
    return [p, front[n], back[n], back[k]];
  });
  // Fan each face from the centre, since the rim isn't convex.
  const fan = (ring: Vec[], z: number) =>
    ring.map((p, k) => [vec(c.x, c.y, c.z + z), p, ring[(k + 1) % ring.length]]);
  return [...fan(front, -depth / 2), ...fan(back, depth / 2), ...sides];
}

export default costume({
  parts: {
    glowStar: { origin: [STAR.x, STAR.y, STAR.z], uniform: true },
    ...Object.fromEntries(LIGHTS.map((part) => [part, {}])),
  },
  pieces: [
    {
      color: "#5b3a22",
      shapes: tube([vec(0, -40, 0), vec(0, -44, 0)], [6, 6], 8),
    },
    ...TIERS.map((t, i) => ({
      color: i % 2 ? "#2f7a46" : "#256b3c",
      shapes: lathe(tier(t), TOP, 9),
    })),
    ...LIGHTS.map((part, n) => ({
      part,
      color: COLORS[n],
      shapes: baubles.filter((_, k) => k % LIGHTS.length === n).flat(),
    })),
    { part: "glowStar", color: "#ffd24a", shapes: star(STAR, 8.5, 3.6, 3) },
  ],
});
