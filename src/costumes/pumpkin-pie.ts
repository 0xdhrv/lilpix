import type { Vec } from "../costume-rig.ts";
import { costume, lathe, rotate, tube, vec } from "../costume-shapes.ts";

// A slice with its tip toward the viewer and the crust at the back, propped
// up so its top faces the camera.
const TIP = vec(0, 0, -32);
const RADIUS = 60;
const HALF = 25 * (Math.PI / 180);
const ARC = 8;
const TILT = 0.3;
const TURN = 0.3;

const [BOTTOM, CRUST, FILLING] = [-40.2, -42.4, -50.5];

const arc = (y: number, r = RADIUS) =>
  Array.from({ length: ARC + 1 }, (_, i) => {
    const a = -HALF + (2 * HALF * i) / ARC;
    return vec(TIP.x + r * Math.sin(a), y, TIP.z + r * Math.cos(a));
  });
const at = (y: number) => vec(TIP.x, y, TIP.z);

/** The slice's sides between two heights: both cuts, and the outer wall if asked. */
function sides(lo: number, hi: number, wall: boolean) {
  const [a, b] = [arc(lo), arc(hi)];
  const faces: Vec[][] = [
    [at(lo), a[0], b[0], at(hi)],
    [at(lo), at(hi), b[ARC], a[ARC]],
  ];
  if (wall) for (let i = 0; i < ARC; i++) faces.push([a[i], a[i + 1], b[i + 1], b[i]]);
  return faces;
}

const place = (shapes: Vec[][]) =>
  rotate(rotate(shapes, at(BOTTOM), TILT), vec(0, 0, 0), 0, TURN, 0);

// A little nutmeg dusted over the filling.
const dust = Array.from({ length: 9 }, (_, k) => {
  const r = 14 + ((k * 37) % 30);
  const a = -HALF * 0.7 + ((k * 0.61) % 1) * 1.4 * HALF;
  const c = vec(TIP.x + r * Math.sin(a), FILLING - 0.1, TIP.z + r * Math.cos(a));
  return Array.from({ length: 5 }, (_, j) => {
    const b = (j / 5) * Math.PI * 2;
    return vec(c.x + 0.9 * Math.cos(b), c.y, c.z + 0.9 * Math.sin(b));
  });
});

const CREAM = vec(0, FILLING, 0);
const [[cream]] = place([[CREAM]]);
const ridges = (a: number) => 1 + 0.14 * Math.cos(8 * a);

export default costume({
  parts: { cream: { origin: [cream.x, cream.y, cream.z] } },
  pieces: [
    {
      color: "#d98a3d",
      shapes: place([
        [at(BOTTOM), ...arc(BOTTOM)],
        ...sides(BOTTOM, CRUST, true),
        ...sides(CRUST, FILLING, true).slice(2),
        ...tube(arc(FILLING - 0.6, RADIUS - 1.6), Array(ARC + 1).fill(3), 7),
      ]),
    },
    {
      color: "#d0691f",
      shapes: place([[at(FILLING), ...arc(FILLING)], ...sides(CRUST, FILLING, false)]),
    },
    { color: "#7c3f17", shapes: place(dust) },
    {
      part: "cream",
      color: "#fbf5ea",
      shapes: place(
        lathe(
          [
            [0, -0.2],
            [10, -0.2],
            [10.5, -2.8],
            [7.8, -5.2],
            [8.5, -7],
            [5.5, -9.8],
            [5.8, -11.2],
            [2.5, -14],
            [0, -16.8],
          ],
          CREAM,
          16,
          ridges,
        ),
      ),
    },
  ],
});
