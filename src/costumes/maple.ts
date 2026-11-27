import { costume, mapleLeaf, tube, vec } from "../costume-shapes.ts";

const COLORS = ["#d2452b", "#ea8a26", "#e9b73a", "#9c4a23"];
const CROWN = 10;

// A ring of leaves standing up round the top of the head, leaning out.
const crown = Array.from({ length: CROWN }, (_, k) => {
  const a = (k / CROWN) * Math.PI * 2 + 0.2;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const lean = 0.55 + 0.15 * (k % 2);
  const l = Math.hypot(lean, 1);
  const up = vec((c * lean) / l, -1 / l, (s * lean) / l);
  const base = vec(31 * c, -39.5, 31 * s);
  return {
    leaf: mapleLeaf(base, up, vec(-s, 0, c), 21 - 3 * (k % 3)),
    stem: tube([vec(27 * c, -39.6, 27 * s), base], [0.6, 0.6], 4),
  };
});

export default costume({
  parts: { crown: { origin: [0, -40, 0] }, fallA: {}, fallB: {}, fallC: {} },
  pieces: [
    ...COLORS.map((color, n) => ({
      part: "crown",
      color,
      shapes: crown.filter((_, k) => k % COLORS.length === n).flatMap((c) => c.leaf),
    })),
    { part: "crown", color: "#6b3a1c", shapes: crown.flatMap((c) => c.stem) },
    // Filled in by the falling-leaves motion (see costume-motion.ts).
    { part: "fallA", color: COLORS[0], shapes: [] },
    { part: "fallB", color: COLORS[1], shapes: [] },
    { part: "fallC", color: COLORS[2], shapes: [] },
  ],
});
