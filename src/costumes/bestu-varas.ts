import { ball, costume, leaf, tube, vec } from "../costume-shapes.ts";

// Bestu Varas (Gujarati New Year, Nutan Varsh): a marigold toran over the
// face for the new year, and fireworks bursting overhead (see costume-motion.ts).

const FLOWERS = Array.from({ length: 15 }, (_, i) => vec(-42 + 6 * i, -41.5, -42));
// Between the LED slots, so the leaves don't hide them.
const LEAVES = [-38, -24, -10.9, 5, 19, 33];

export default costume({
  parts: { glowA: {}, glowB: {}, glowC: {} },
  pieces: [
    {
      color: "#d8c79a",
      shapes: tube(
        FLOWERS,
        FLOWERS.map(() => 0.5),
        4,
      ),
    },
    {
      color: "#3d8a2e",
      shapes: LEAVES.flatMap((x) =>
        leaf(vec(x, -40.5, -42.6), vec(0, 1, 0), vec(1, 0, 0), 11, 5.6),
      ),
    },
    {
      color: "#ff8a1c",
      shapes: FLOWERS.filter((_, i) => i % 2 === 0).flatMap((c) => ball(c, 3.5, 0.9, 4, 8)),
    },
    {
      color: "#ffc21f",
      shapes: FLOWERS.filter((_, i) => i % 2 === 1).flatMap((c) => ball(c, 3.2, 0.9, 4, 8)),
    },
    // Filled in as the fireworks go off: gold, pink and cyan.
    { part: "glowA", color: "#ffcf4a", shapes: [] },
    { part: "glowB", color: "#ff5fa2", shapes: [] },
    { part: "glowC", color: "#5ce1ff", shapes: [] },
  ],
});
