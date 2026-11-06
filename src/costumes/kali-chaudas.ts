import { ball, blob, costume, rotate, tube, vec } from "../costume-shapes.ts";

// Kali Chaudas (Narak Chaturdashi), the night evil is warded off: a lime and
// seven green chillies hang from each ear, nimbu-mirchi style.

const CHILLIES = 7;

function charm(s: number) {
  const top = vec(50 * s, -36, 0);
  const lime = vec(50 * s, -18, 0);
  const chillies = Array.from({ length: CHILLIES }, (_, i) => {
    const y = -11 + 5.4 * i;
    const lean = (i % 2 ? 1 : -1) * 0.38 * s;
    const pod = tube(
      [vec(0, 0, 0), vec(0.3, 3, 0), vec(0.6, 6.5, 0), vec(1.6, 10, 0), vec(3, 12, 0)],
      [2, 2.2, 1.9, 1.2, 0.3],
      6,
    );
    const shift = vec(50 * s, y, i % 2 ? 1.2 : -1.2);
    return rotate(pod, vec(0, 0, 0), 0, 0, lean).map((face) =>
      face.map((p) => vec(p.x * s + shift.x, p.y + shift.y, p.z + shift.z)),
    );
  });
  return {
    hook: tube([vec(44 * s, -34, 0), vec(47 * s, -37.5, 0), top], [0.9, 0.9, 0.9], 5),
    thread: tube([top, vec(50 * s, -11, 0)], [0.4, 0.4], 4),
    lime: blob(lime, 6.2, 7, 6.2, 5, 9),
    nub: ball(vec(50 * s, -25.4, 0), 1.1, 1, 2, 6),
    chillies: chillies.flat(),
    stems: Array.from({ length: CHILLIES }, (_, i) =>
      ball(vec(50 * s, -11 + 5.4 * i, i % 2 ? 1.2 : -1.2), 1.6, 0.7, 2, 6),
    ).flat(),
  };
}

const [left, right] = [charm(-1), charm(1)];
const both = (key: keyof typeof left) => [
  { part: "charmL", shapes: left[key] },
  { part: "charmR", shapes: right[key] },
];

export default costume({
  parts: {
    charmL: { origin: [-50, -36, 0], uniform: true },
    charmR: { origin: [50, -36, 0], uniform: true },
  },
  pieces: [
    ...both("hook").map((p) => ({ ...p, color: "#3a3346" })),
    ...both("thread").map((p) => ({ ...p, color: "#ebe3cf" })),
    ...both("lime").map((p) => ({ ...p, color: "#c8d83c" })),
    ...both("nub").map((p) => ({ ...p, color: "#7f8f22" })),
    ...both("chillies").map((p) => ({ ...p, color: "#2f9a2a" })),
    ...both("stems").map((p) => ({ ...p, color: "#5d6b1c" })),
  ],
});
