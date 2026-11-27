import type { Vec } from "../costume-rig.ts";
import { ball, costume, leaf, tube, vec } from "../costume-shapes.ts";

const unit = (x: number, y: number, z: number) => {
  const l = Math.hypot(x, y, z);
  return vec(x / l, y / l, z / l);
};

/** One antler, for the side `s`: a beam curving up and out, with tines off its front. */
function antler(s: number) {
  const at = (x: number, y: number, z: number) => vec(s * x, y, z);
  const beam = [at(20, -39, 6), at(23, -50, 6), at(29, -62, 8), at(35, -73, 7), at(36, -84, 4)];
  const tines: Vec[][] = [
    [at(26, -56, 7), at(19, -66, 4), at(17, -74, 2)],
    [at(32, -68, 7.5), at(40, -76, 5), at(47, -79, 4)],
    [at(35.5, -79, 6), at(30, -88, 4)],
  ];
  return [
    ...tube(beam, [3.2, 2.9, 2.5, 2, 1.3], 6),
    ...tines.flatMap((tine) => tube(tine, [2, 1.6, 1].slice(-tine.length), 5)),
  ];
}

const ear = (s: number) =>
  leaf(vec(42 * s, -30, -12), unit(0.85 * s, -0.42, 0.18), unit(0.42 * s, 0.85, 0), 22, 11, 6);

export default costume({
  parts: {
    earL: { origin: [-42, -30, -12] },
    earR: { origin: [42, -30, -12] },
    glowNose: { origin: [0, 36, -45] },
  },
  pieces: [
    { color: "#8a6440", shapes: [...antler(-1), ...antler(1)] },
    { part: "earL", color: "#7b5032", shapes: ear(-1) },
    { part: "earR", color: "#7b5032", shapes: ear(1) },
    {
      part: "glowNose",
      color: "#ff3b30",
      shapes: ball(vec(0, 36, -45), 6, 0.9, 4, 8),
    },
  ],
});
