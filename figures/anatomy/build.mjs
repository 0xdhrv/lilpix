// lilpix, opened: an isometric teardown figure built with the Anatomy kit.
// node figures/anatomy/build.mjs [--light]   → public/anatomy/index.html
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as G from "./kit/lathe.mjs";
import { EXPRESSIONS } from "../../src/expressions.ts";
import { SHELLS } from "../../src/shells.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const theme = process.argv.includes("--light")
  ? "light"
  : process.argv.includes("--dark")
    ? "dark"
    : "auto";

const WIDTH = 640;
const HEIGHT = 470;

// World units: 6 per Bot.tsx unit, so the body's 15.8 × 15.8 × 12 is 94.8 × 94.8 × 72.
const S = 6;
const HX = (15.8 * S) / 2;
const BODY_H = 15.8 * S;
const Y_BACK = -36;
const SPLIT = 33;
const FRONT = 36;
const EAR = { hx: (17.7 * S) / 2, z0: 0.9 * S, z1: 14.9 * S, y0: -33, y1: 33 };

const PLATE = { x: -82, y: -64, w: 164, d: 338, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const RAIL_H = 3;
const SLED_H = 5;
const Z0 = RAIL_H + SLED_H;
const RAILS = [-30, 30];
const RAIL_Y = [-54, 264];
const RULER = { x: 60, y: -40, w: 9, d: 292, r: 1 };

// Inside, back to front.
const OPEN = { x0: -HX + 3, x1: HX - 3, z0: Z0 + 3, z1: Z0 + BODY_H - 3 };
const BOARD = { x0: -40, x1: 40, z0: Z0 + 7, z1: Z0 + 87, y0: 14, y1: 16.4 };
const MATRIX = { x0: -43, x1: 43, z0: Z0 + 4, z1: Z0 + 91, y0: 27, y1: 29 };
const PANEL_Y = 31;
const SCREEN = {
  x0: -7.1 * S,
  x1: 7.1 * S,
  z0: Z0 + 47.4 - 1.4 * S - 4.9 * S,
  z1: Z0 + 47.4 - 1.4 * S + 4.9 * S,
};
const LED_X = [-6.16, -3.5, -0.88].map((x) => x * S);
const LED_Z = Z0 + 47.4 + 6.2 * S;
const PITCH = 0.43 * S;
const EYE_Z = Z0 + 47.4 - 0.95 * S;
const EYE_HX = [-6, 6];
const MAX_PIXELS = 96;

// One spring per assembly: 0 assembled, 1 apart. The outside leaves first.
const PIECES = {
  cover: { move: 214, sled: { y: 31, d: 9 } },
  display: { move: 142, sled: { y: 23, d: 8 } },
  board: { move: 72, sled: { y: 12, d: 11 } },
};
const STAGGER = ["cover", "display", "board"];
const SPRING = { stagger: 0.06, stiffness: 64, damping: 14.2, substeps: 4 };
const REAR_SLED = { y: -40, d: 52 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-EAR.hx, Y_BACK, Z0 + BODY_H],
    [HX, Y_BACK, Z0 + BODY_H],
    [-HX, FRONT + 214, Z0 + BODY_H],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);

const at = (point) => k.iso(point, P);
const Sd = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const flat = (x0, z0, x1, z1, r, steps = 6) =>
  k.pathOf(
    k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]),
    true,
  );
const ALONG_Y = (x = 0, z = 0) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
// A box standing out of a vertical face, from y0 to y1.
const boxY = (x0, x1, z0, z1, y0, y1, r = 0.6, steps = 3) =>
  G.prismOf(
    ALONG_Y(),
    k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps),
    y0,
    y1,
    P,
  );
const rodY = (x, z, r, y0, y1) => G.disc(y0, y1, r, ALONG_Y(x, z), P);
const faceRing = (x, z, r, y) => G.circleOf(ALONG_Y(x, z), y, r, P);
const onFace = (y, inner) => `<g transform="${planeOf(y)}">${inner}</g>`;
const byDepth = (list, point) =>
  [...list].sort((a, b) => k.depthOf(point(a), P) - k.depthOf(point(b), P));

let clips = 0;
// A recess in a vertical face at y: inner walls, a back plane, and content clipped to the opening.
function recess({ x0, x1, z0, z1, r, depth }, y, back = "", backClass = "lp-well", inside = "") {
  const id = `lp-clip-${clips++}`;
  const ring = k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 6);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const { sinA } = k.cameraOf(P);
  const tops = [];
  const sides = [[], [], [], []];
  ring.forEach(([ax, az], index) => {
    const [bx, bz] = ring[(index + 1) % ring.length];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    let [nx, nz] = [(bz - az) / length, -(bx - ax) / length];
    if (nx * (cx - (ax + bx) / 2) + nz * (cz - (az + bz) / 2) < 0) [nx, nz] = [-nx, -nz];
    if (nx <= 0 && nz <= 0) return;
    const quad = k.pathOf(
      [at([ax, y, az]), at([bx, y, bz]), at([bx, y - depth, bz]), at([ax, y - depth, az])],
      true,
    );
    if (nz >= nx) tops.push(quad);
    else sides[Math.min(3, Math.max(0, Math.floor(((nx * -sinA + 1) / 2) * 4)))].push(quad);
  });
  const shape = flat(x0, z0, x1, z1, r);
  return [
    `<clipPath id="${id}"><path transform="${planeOf(y)}" d="${shape}"/></clipPath>`,
    `<g clip-path="url(#${id})">`,
    `<path class="iso-top" d="${tops.join("")}"/>`,
    ...sides.map((d, shade) =>
      d.length ? `<path class="iso-shade" data-shade="${shade}" d="${d.join("")}"/>` : "",
    ),
    `<g transform="${planeOf(y - depth)}"><path class="${backClass}" d="${shape}"/>${back}<path class="iso-line" data-tone="faint" d="${shape}"/></g>`,
    inside,
    `</g>`,
    `<g transform="${planeOf(y)}"><path class="iso-line" data-tone="lo" d="${shape}"/></g>`,
  ].join("");
}

// The opening of the rear shell, projected: what sits inside is only seen through it.
const OPENING = k.pathOf(
  k
    .roundedPlan(
      {
        x: OPEN.x0,
        y: OPEN.z0,
        w: OPEN.x1 - OPEN.x0,
        d: OPEN.z1 - OPEN.z0,
        r: 2,
      },
      6,
    )
    .map(([x, z]) => at([x, SPLIT, z])),
  true,
);

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  const feet = byDepth(k.corners(PLATE, 22), ([x, y]) => [x, y, 0]);
  for (const [x, y] of feet) {
    out.push(Sd(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(
      Sd(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), {
        tone: "mid",
      }),
    );
  }
  out.push(
    Sd(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), {
      tone: "mid",
      inner: L(k.sideSeam(PLATE, -PLATE_H / 2, P, 8), { tone: "faint" }),
    }),
  );
  const groove = k.insetPlan(PLATE, 5);
  out.push(L(k.planOutline(groove, 0, P), { tone: "lo" }));
  // The Ship grid: a dot every 12 units inside the groove.
  const grid = [];
  for (let x = PLATE.x + 11; x <= PLATE.x + PLATE.w - 11; x += 12)
    for (let y = PLATE.y + 11; y <= PLATE.y + PLATE.d - 11; y += 12) grid.push(at([x, y, 0]));
  out.push(D(grid, { size: 0.42, tone: "lo" }));
  // An engraved ▲ between the rails, pointing back at lilpix.
  const tri = (s, cy) =>
    k.onTop(
      [
        [0, cy - s * 0.58],
        [s / 2, cy + s * 0.29],
        [-s / 2, cy + s * 0.29],
      ],
      0,
      P,
      true,
    );
  out.push(
    `<path class="lp-inlay" d="${tri(40, 176)}"/>`,
    L(tri(40, 176), { tone: "mid" }),
    L(tri(34, 176), { tone: "faint" }),
  );
  const screws = k.corners(PLATE, 10);
  out.push(
    L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), {
      tone: "lo",
    }),
  );
  out.push(
    D(
      screws.map(([x, y]) => at([x, y, 0])),
      { size: 0.5 },
    ),
  );
  // Ruler under the sled pointers: a tick every 4 units, a major every 20.
  out.push(Sd(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(
    RULER.y + 4,
    RULER.y + RULER.d - 4,
    4,
    5,
    RULER.x + 0.8,
    0.6,
    [2.2, 4.2],
    P,
    "y",
  );
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(
    D(
      [
        at([RULER.x + RULER.w / 2, RULER.y + 2, 0.6]),
        at([RULER.x + RULER.w / 2, RULER.y + RULER.d - 2, 0.6]),
      ],
      { size: 0.45 },
    ),
  );
  // Label plate: the one engraved label, and a ▲.
  const label = { x: -76, y: 236, w: 38, d: 16, r: 1.4 };
  out.push(Sd(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 3), { tone: "faint" }));
  out.push(
    `<path class="lp-mark" d="${k.onTop(
      [
        [label.x + 6, label.y + 4],
        [label.x + 9.5, label.y + 10],
        [label.x + 2.5, label.y + 10],
      ],
      0.8,
      P,
      true,
    )}"/>`,
  );
  out.push(
    k.faceTextSvg(k.topMatrix([label.x + 13, label.y + 9.6], 0.8, P, "x"), "SHIP 26", {
      size: 4.4,
      tone: "mid",
    }),
  );
  out.push(
    L(
      [18, 12]
        .map((w, i) =>
          k.lineOnTop(
            [label.x + 13, label.y + 12.4 + i * 1.6],
            [label.x + 13 + w, label.y + 12.4 + i * 1.6],
            0.8,
            P,
          ),
        )
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  return out.join("");
}

function rails() {
  const out = [];
  for (const x of RAILS) {
    out.push(
      Sd(
        k.slabOf(
          { x: x - 3, y: RAIL_Y[0], w: 6, d: RAIL_Y[1] - RAIL_Y[0], r: 1 },
          0,
          RAIL_H,
          P,
          3,
          0.4,
        ),
        { tone: "mid" },
      ),
    );
    const dots = [];
    for (let y = RAIL_Y[0] + 8; y < RAIL_Y[1]; y += 36) dots.push(at([x, y, RAIL_H]));
    out.push(D(dots, { size: 0.4 }));
  }
  for (const y of [RAIL_Y[0] - 6, RAIL_Y[1]]) {
    out.push(
      Sd(k.slabOf({ x: -38, y, w: 76, d: 6, r: 1.2 }, 0, 8, P, 3, 0.5), {
        tone: "mid",
      }),
    );
    out.push(D([at([-30, y + 3, 8]), at([30, y + 3, 8])], { size: 0.45 }));
  }
  return out.join("");
}

// A sled on the two rails, with an index arm over the ruler.
function sled({ y, d }, name) {
  const plan = { x: -50, y, w: 100, d, r: 1.5 };
  const out = [
    `<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 2), RAIL_H, 0.1, P)}" style="filter:blur(4px)"/>`,
  ];
  out.push(Sd(k.slabOf(plan, RAIL_H, SLED_H, P, 3, 0.5), { tone: "mid" }));
  const yc = y + d / 2;
  out.push(
    D(
      [-42, 42].map((x) => at([x, yc, Z0])),
      { size: 0.45 },
    ),
  );
  const arm = { x: 50, y: yc - 1.6, w: 18, d: 3.2, r: 0.8 };
  out.push(Sd(k.slabOf(arm, Z0 - 2, 2, P, 2), { tone: "mid", crease: "none" }));
  out.push(
    L(k.planOutline({ x: RULER.x + 1, y: yc - 0.5, w: 6, d: 1, r: 0.5 }, Z0, P, 3), { tone: "hi" }),
  );
  return `<g data-sled="${name}">${out.join("")}</g>`;
}

function ear(sign) {
  const plan = {
    x: sign < 0 ? -EAR.hx : HX,
    y: EAR.y0,
    w: EAR.hx - HX,
    d: EAR.y1 - EAR.y0,
    r: 1.2,
  };
  const z0 = Z0 + EAR.z0;
  const out = [
    Sd(k.slabOf(plan, z0, EAR.z1 - EAR.z0, P, 4, 0.6), {
      tone: "hi",
      inner: L(k.sideSeam(plan, z0 + 6, P, 4), { tone: "faint" }),
    }),
  ];
  if (sign > 0) {
    // Vent slots on the outer face, as on the 3D bot: 11 black slots, 6.7 tall, centred on the body.
    const slot = (y) =>
      k.pathOf(
        k
          .roundedPlan({ x: y - 0.9, y: Z0 + BODY_H / 2 - 20.1, w: 1.8, d: 40.2, r: 0.9 }, 4)
          .map(([u, z]) => at([EAR.hx, u, z])),
        true,
      );
    const vents = [];
    for (let i = -5; i <= 5; i++) vents.push(slot(i * 0.73 * S));
    out.push(`<path class="lp-vent" d="${vents.join("")}"/>`, L(vents.join(""), { tone: "lo" }));
    out.push(
      D([at([EAR.hx, -26, Z0 + 80]), at([EAR.hx, 26, Z0 + 80])], {
        size: 0.45,
      }),
    );
  }
  return out.join("");
}

function rearShell() {
  const plan = { x: -HX, y: Y_BACK, w: HX * 2, d: SPLIT - Y_BACK, r: 1.5 };
  const out = [
    `<path class="iso-halo" d="${k.haloOf({ x: -EAR.hx, y: Y_BACK, w: EAR.hx * 2, d: FRONT - Y_BACK, r: 4 }, Z0, 8, P)}"/>`,
  ];
  out.push(ear(-1));
  out.push(Sd(k.slabOf(plan, Z0, BODY_H, P, 4, 0.8), { tone: "hi" }));
  out.push(
    D(
      [
        [-36, -28],
        [36, -28],
        [-36, 26],
        [36, 26],
      ].map(([x, y]) => at([x, y, Z0 + BODY_H])),
      { size: 0.45 },
    ),
  );
  // Inside: molded ribs on the back wall, a sticker, and four standoffs for the board.
  const backZ = (z) => -z;
  const ribs = [];
  for (let x = -36; x <= 36; x += 12)
    ribs.push(
      `M${x - 0.8} ${backZ(OPEN.z0)}V${backZ(OPEN.z1)}M${x + 0.8} ${backZ(OPEN.z0)}V${backZ(OPEN.z1)}`,
    );
  const sticker = flat(-16, Z0 + 60, 16, Z0 + 76, 1.2);
  const back = [
    L(ribs.join(""), { tone: "faint" }),
    `<path class="lp-sticker" d="${sticker}"/>`,
    L(sticker, { tone: "lo" }),
    L([22, 16, 26].map((w, i) => `M-12 ${-(Z0 + 72 - i * 4)}h${w}`).join(""), {
      tone: "lo",
      free: true,
    }),
  ].join("");
  const holes = [
    [-34, BOARD.z0 + 6],
    [34, BOARD.z0 + 6],
    [-34, BOARD.z1 - 6],
    [34, BOARD.z1 - 6],
  ];
  const posts = `<g class="lp-brass">${byDepth(holes, ([x, z]) => [x, 0, z])
    .map(([x, z]) => Sd(rodY(x, z, 2.6, -33, BOARD.y0), { tone: "hi" }))
    .join("")}</g>`;
  out.push(
    recess(
      {
        x0: OPEN.x0,
        x1: OPEN.x1,
        z0: OPEN.z0,
        z1: OPEN.z1,
        r: 2,
        depth: SPLIT + 33,
      },
      SPLIT,
      back,
      "lp-cavity",
      posts,
    ),
  );
  out.push(
    D(
      [
        [-HX + 1.5, Z0 + 1.5],
        [HX - 1.5, Z0 + 1.5],
        [-HX + 1.5, Z0 + BODY_H - 1.5],
        [HX - 1.5, Z0 + BODY_H - 1.5],
      ].map(([x, z]) => at([x, SPLIT, z])),
      { size: 0.4 },
    ),
  );
  out.push(ear(1));
  return `<g data-part="rear" class="lp-shell">${out.join("")}</g>`;
}

function board() {
  const { x0, x1, z0, z1, y0, y1 } = BOARD;
  const z = (v) => Z0 + v;
  const out = [Sd(boxY(x0, x1, z0, z1, y0, y1, 3, 5), { tone: "hi" })];
  const face = [];
  face.push(L(flat(x0 + 2.4, z0 + 2.4, x1 - 2.4, z1 - 2.4, 1.6), { tone: "faint" }));
  // Copper traces between the parts: each starts and ends on a part's edge.
  face.push(
    L(
      [
        `M6 ${-z(60)}H14`,
        `M6 ${-z(46)}H10L13 ${-z(43)}V${-z(40)}H16`,
        `M-14 ${-z(48)}H-25`,
        `M-9 ${-z(42)}V${-z(33)}`,
        `M0 ${-z(62)}V${-z(70)}L8 ${-z(78)}H20`,
        `M-14 ${-z(58)}H-17L-20 ${-z(61)}V${-z(72)}H-24`,
        `M-26 ${-z(44)}V${-z(33)}`,
        `M22 ${-z(56)}V${-z(43)}`,
      ].join(""),
      { tone: "lo" },
    ),
  );
  face.push(`<path class="lp-mark" d="M28 ${-z(23)}L31.5 ${-z(17)}H24.5Z"/>`);
  out.push(onFace(y1, face.join("")));
  const parts = [
    [-14, 6, z(42), z(62), 1.6, "lp-chip"],
    [14, 30, z(56), z(64), 1.4, "lp-chip"],
    [16, 23, z(36.5), z(43.5), 1, "lp-chip"],
    [-32, -25, z(44), z(51), 1, "lp-chip"],
    [20, 34, z(76), z(80), 2.4, ""],
    [-32, -24, z(68), z(76), 3, ""],
  ];
  for (const [a, b, c, d, h, cls] of parts)
    out.push(
      Sd(boxY(a, b, c, d, y1, y1 + h, 0.5), {
        tone: "hi",
        className: cls || undefined,
      }),
    );
  out.push(Sd(boxY(-14, -4, z(28), z(33), y1, y1 + 2.6, 2.4, 5), { tone: "hi" }));
  for (const [a, c] of [
    [9, z(48)],
    [9, z(52)],
    [-4, z(66)],
    [12, z(68)],
    [-20, z(40)],
    [32, z(46)],
  ])
    out.push(Sd(boxY(a, a + 3, c, c + 1.6, y1, y1 + 1, 0.2, 2), { tone: "mid" }));
  // Pin 1 dots and the QFN's pads.
  out.push(
    D([at([-12.4, y1 + 1.6, z(60.4)]), at([15.4, y1 + 1.4, z(62.6)])], {
      size: 0.4,
      tone: "hi",
    }),
  );
  const pads = [];
  for (let i = 0; i < 6; i++)
    pads.push(at([-11.5 + i * 3.4, y1, z(41)]), at([7, y1, z(44.5 + i * 3.2)]));
  out.push(D(pads, { size: 0.35, tone: "mid" }));
  // The buzzer that plays each face's chiptune.
  out.push(Sd(rodY(-26, z(24), 9, y1, y1 + 5), { tone: "hi" }));
  out.push(
    L(faceRing(-26, z(24), 6.4, y1 + 5) + faceRing(-26, z(24), 1.4, y1 + 5), {
      tone: "lo",
    }),
  );
  // The click switch: press it and lilpix changes face.
  out.push(Sd(rodY(-28, z(72), 2.4, y1 + 3, y1 + 5.2), { tone: "hi", lit: true }));
  // Screws into the standoffs.
  for (const [x, c] of [
    [-34, z0 + 6],
    [34, z0 + 6],
    [-34, z1 - 6],
    [34, z1 - 6],
  ]) {
    out.push(Sd(rodY(x, c, 2.4, y1, y1 + 1.2), { tone: "mid" }));
    out.push(
      L(
        `M${k.iso([x - 1.2, y1 + 1.2, c], P).join(" ")}L${k.iso([x + 1.2, y1 + 1.2, c], P).join(" ")}`,
        { tone: "lo", free: true },
      ),
    );
  }
  return out.join("");
}

function display() {
  const { x0, x1, z0, z1, y0, y1 } = MATRIX;
  const out = [Sd(boxY(x0, x1, z0, z1, y0, y1, 2.4, 5), { tone: "hi" })];
  out.push(onFace(y1, L(flat(x0 + 2.4, z0 + 2.4, x1 - 2.4, z1 - 2.4, 1.2), { tone: "faint" })));
  out.push(
    Sd(boxY(SCREEN.x0 + 1, SCREEN.x1 - 1, SCREEN.z0 + 1, SCREEN.z1 - 1, y1, PANEL_Y, 1, 4), {
      tone: "mid",
      className: "lp-dark",
    }),
  );
  // The matrix: 32 × 22 LEDs at half the face pixel's pitch; a face pixel lights a 2 × 2 block.
  const grid = [];
  for (let j = -16; j < 16; j++)
    for (let i = -12; i < 10; i++) grid.push([(j + 0.5) * PITCH, -(EYE_Z + (i + 0.5) * PITCH)]);
  out.push(
    onFace(
      PANEL_Y,
      `<g class="lp-unlit">${grid.map(([x, y]) => `<rect x="${(x - 0.7).toFixed(2)}" y="${(y - 0.7).toFixed(2)}" width="1.4" height="1.4"/>`).join("")}</g><g class="lp-pixels" data-part="matrix"></g>`,
    ),
  );
  // Three RGB LEDs and their driver.
  LED_X.forEach((x, i) => {
    out.push(
      Sd(boxY(x - 3.3, x + 3.3, LED_Z - 3.3, LED_Z + 3.3, y1, y1 + 2.4, 0.4, 2), { tone: "hi" }),
    );
    out.push(
      onFace(
        y1 + 2.4,
        `<circle class="lp-emitter" data-emitter="${i}" cx="${x}" cy="${-LED_Z}" r="2.2"/><circle class="iso-line" data-tone="lo" cx="${x}" cy="${-LED_Z}" r="2.2"/>`,
      ),
    );
  });
  out.push(onFace(y1, L(`M${LED_X[2] + 3.3} ${-LED_Z}H18`, { tone: "lo" })));
  out.push(
    Sd(boxY(16, 30, LED_Z - 4, LED_Z + 4, y1, y1 + 1.2, 0.5), {
      tone: "hi",
      className: "lp-chip",
    }),
  );
  out.push(
    D(
      [
        [x0 + 4, z0 + 4],
        [x1 - 4, z0 + 4],
        [x0 + 4, z1 - 4],
        [x1 - 4, z1 - 4],
      ].map(([x, c]) => at([x, y1, c])),
      { size: 0.45 },
    ),
  );
  return out.join("");
}

function cover() {
  const plan = { x: -HX, y: SPLIT, w: HX * 2, d: FRONT - SPLIT, r: 1.5 };
  const out = [Sd(k.slabOf(plan, Z0, BODY_H, P, 4, 0.6), { tone: "hi" })];
  const glass = {
    x0: SCREEN.x0,
    x1: SCREEN.x1,
    z0: SCREEN.z0,
    z1: SCREEN.z1,
    r: 1,
    depth: 1.2,
  };
  const shine = `<path class="iso-line" data-tone="mid" data-free="" d="M${SCREEN.x0 + 5} ${-(SCREEN.z1 - 14)}Q${SCREEN.x0 + 6} ${-(SCREEN.z1 - 5)} ${SCREEN.x0 + 15} ${-(SCREEN.z1 - 4)}" style="opacity:.5"/>`;
  out.push(
    recess(glass, FRONT, `<g class="lp-glass-pixels" data-part="glass"></g>${shine}`, "lp-glass"),
  );
  LED_X.forEach((x, i) => {
    const slot = {
      x0: x - 5.25,
      x1: x + 5.25,
      z0: LED_Z - 5.25,
      z1: LED_Z + 5.25,
      r: 0.6,
      depth: 1,
    };
    out.push(
      recess(
        slot,
        FRONT,
        `<path class="lp-lens" data-lens="${i}" d="${flat(x - 3.3, LED_Z - 3.3, x + 3.3, LED_Z + 3.3, 0.4, 2)}"/>`,
        "lp-glass",
      ),
    );
  });
  return out.join("");
}

const mirror = (rows) => rows.map((row) => [...row].reverse().join(""));
const FACES = Object.entries(EXPRESSIONS).map(([name, e]) => ({
  name,
  left: e.left,
  right: e.right ?? mirror(e.left),
  leds: e.leds,
}));
const litOf = (face) => [...face.left, ...face.right].join("").split("#").length - 1;
const RIBBON = {
  x0: 22,
  x1: 32,
  z: Z0 + 78,
  from: BOARD.y1 + 2.4,
  to: MATRIX.y0,
};

const moving = (name, inner, clip) =>
  `<g data-piece="${name}"${clip ? ` clip-path="url(#lp-in-${name})"` : ""}>${inner}</g>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "lilpix, the cube robot with a pixel face, taken apart on a teardown bench. Its rear shell with side ears stays on the rails; the mainboard with its chip, flash, motion sensor, buzzer and click switch, the LED matrix with three RGB LEDs, and the front cover with its screen glass each slide forward on their own sled. A flex ribbon joins the board to the matrix.",
  body: [
    `<defs>${["board", "display"].map((n) => `<clipPath id="lp-in-${n}"><path data-hold d="${OPENING}"/></clipPath>`).join("")}<clipPath id="lp-in-ribbon"><path d="${OPENING}"/></clipPath></defs>`,
    plate(),
    rails(),
    sled(REAR_SLED, "rear"),
    ...["board", "display", "cover"].map((n) => moving(n, sled(PIECES[n].sled, n))),
    rearShell(),
    moving("board", board(), true),
    `<g data-part="ribbon"></g>`,
    moving("display", display(), true),
    moving("cover", `<g class="lp-shell">${cover()}</g>`),
  ],
});

const DATA = {
  P,
  FACES,
  PIECES,
  STAGGER,
  SPRING,
  RIBBON,
  SPLIT,
  PITCH,
  EYE_Z,
  EYE_HX,
  MAX_PIXELS,
  BACKS: { board: BOARD.y0, display: MATRIX.y0 },
  PANEL_Y,
  GLASS_Y: FRONT - 1.2,
};

const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const kitSource = readFileSync(join(HERE, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");

// torph ships CommonJS; wrap it so the standalone page can use it without a bundler.
const torphSource = `const torph=(()=>{const exports={};${readFileSync(join(ROOT, "node_modules", "torph", "dist", "index.js"), "utf8")}\nreturn exports})();`;

// One palette per shell in src/shells.ts, so the figure wears the same shell as the 3D bot.
// Tones are the graphite figure's own steps, measured as mixes of the body colour.
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (c, to, t) =>
  `#${hex(c)
    .map((v, i) =>
      Math.round(v + (hex(to)[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
const shellVars = (body) => {
  const [r, g, b] = hex(body);
  const pale = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5;
  // Lines go light on a dark shell and dark on a pale one.
  const ink = pale ? "#000000" : "#ffffff";
  const vars = {
    paper: body,
    top: mix(body, "#ffffff", pale ? 0.35 : 0.067),
    "shade-0": mix(body, "#000000", 0.22),
    "shade-1": mix(body, "#000000", 0.13),
    "shade-2": mix(body, "#000000", 0.044),
    "shade-3": mix(body, "#ffffff", 0.014),
    mid: mix(body, ink, pale ? 0.42 : 0.305),
    lo: mix(body, ink, pale ? 0.3 : 0.2),
    faint: mix(body, ink, pale ? 0.17 : 0.114),
    dot: mix(body, ink, pale ? 0.75 : 0.686),
  };
  if (pale) vars.hi = mix(body, "#000000", 0.82);
  return (
    Object.entries(vars)
      .map(([name, value]) => `--anatomy-${name}:${value}`)
      .join(";") + `;--lp-cavity:${mix(body, "#000000", 0.55)}`
  );
};
const shellCss = Object.entries(SHELLS)
  .map(
    ([name, { body }]) =>
      `${name === "graphite" ? ".lp-shell," : ""}.iso[data-shell="${name}"] .lp-shell{${shellVars(body)}}`,
  )
  .join("\n");

const css = `<style>
.lp-cavity{fill:var(--anatomy-shade-0)}
.lp-well{fill:var(--anatomy-shade-1)}
.lp-glass{fill:var(--lp-glass)}
.lp-lens{fill:var(--lp-glass);transition:fill .2s}
.lp-sticker{fill:var(--anatomy-shade-3)}
.lp-inlay{fill:var(--anatomy-shade-1)}
.lp-mark{fill:var(--anatomy-mid)}
.lp-dark>.iso-fill,.lp-dark>.iso-top,.lp-dark>.iso-shade{fill:var(--lp-glass)}
.lp-chip>.iso-top{fill:var(--lp-chip-top)}.lp-chip>.iso-shade,.lp-chip>.iso-fill{fill:var(--lp-chip)}
.lp-unlit rect{fill:var(--lp-unlit)}
.lp-pixels rect,.lp-glass-pixels rect{fill:var(--lp-eye)}
.lp-ribbon{fill:var(--lp-flex);stroke:none}
.iso{--lp-glass:#050506;--lp-eye:#f2f2f2;--lp-unlit:#ffffff1c;--lp-chip:#0d0d0e;--lp-chip-top:#161617;--lp-flex:#3a2a12}
.iso[data-theme="light"]{--lp-glass:#141416;--lp-unlit:#ffffff22;--lp-chip:#2a2a2c;--lp-chip-top:#3a3a3d;--lp-flex:#d9a54a}
.iso[data-theme="light"] .lp-shell{--anatomy-hi:#111112}
${shellCss}
.lp-shell .lp-cavity{fill:var(--lp-cavity)}.lp-shell .lp-sticker{fill:var(--anatomy-top)}
.lp-vent{fill:#000;stroke:none}
.lp-glass-pixels{filter:drop-shadow(0 0 1.6px rgb(255 255 255 / .55))}
.lp-brass{--anatomy-paper:#c7b78c;--anatomy-top:#dccd9f;--anatomy-shade-0:#a1915f;--anatomy-shade-1:#ad9d6c;--anatomy-shade-2:#b8a878;--anatomy-shade-3:#c2b283;--anatomy-hi:#4a3d17;--anatomy-faint:#8d7d4c}
.iso-stage{touch-action:pan-y;cursor:pointer}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
html[data-embed] body{background:transparent}
html[data-embed] .iso-page{width:100%;margin:0}
html[data-embed] .iso-figure{margin:0}
.lp-source{margin:14px 0 0;font:12px/1.4 var(--anatomy-mono)}
.lp-source a{color:var(--anatomy-muted);text-decoration:underline;text-decoration-color:var(--anatomy-faint);text-underline-offset:3px}
.lp-source a:hover{color:var(--anatomy-strong)}
.lp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
</style>`;

const first = FACES[0];
const body =
  css +
  k.plateHtml({
    fig: "Fig 26",
    title: "lilpix, opened",
    hint: "Hover to close · click to change face",
    readout: `${first.name} · ${litOf(first)} of ${MAX_PIXELS} px · apart`,
    keys: [
      {
        mark: "lit",
        label: "The face: 15 expressions drawn on a 32 × 22 LED matrix",
      },
      { mark: "red", label: "Three RGB LEDs, one colour and pattern per face" },
      {
        mark: "raised",
        label: "Mainboard: chip, flash, motion sensor for tilt, buzzer, click switch",
      },
      { mark: "edge", label: "A flex ribbon from the board to the matrix" },
    ],
    caption:
      "lilpix on a teardown bench, after the robot from the Vercel Ship 2026 demos. It comes apart into four pieces on sleds: a rear shell with its side ears and four standoffs, the mainboard that holds them, the LED matrix with the three RGB LEDs above it, and the front cover with its screen glass. Every face is a grid of lit pixels from the same data the 3D bot uses, at most 96 of them, and each face pixel lights a 2 × 2 block of the matrix. Click to step through the faces, press 1 to 9 to jump, Space to open or close.",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="lilpix teardown. Space opens or closes it; arrow keys and 1 to 9 change the face.">${svg}<span class="lp-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

const source = `<p class="lp-source"><a href="https://github.com/0xdhrv/lilpix" target="_top">Source on GitHub · github.com/0xdhrv/lilpix</a></p>`;
let html = k.pageHtml({
  title: "lilpix, opened · anatomy",
  theme: theme === "dark" ? "dark" : "light",
  body: body + source,
  script: kitSource + torphSource + live,
  width: 720,
});
if (theme === "auto") {
  // Same theme and shell as the app and the about page, and follow changes made there.
  const pick = `<script>if(new URLSearchParams(location.search).has("embed"))document.documentElement.dataset.embed="";(()=>{const dark=matchMedia("(prefers-color-scheme: dark)");const apply=()=>{let s=null;try{s=JSON.parse(localStorage.getItem("lilpix:theme"))}catch{}const t=s==="light"||s==="dark"?s:dark.matches?"dark":"light";document.body.dataset.theme=t;document.documentElement.style.colorScheme=t;let shell=null;try{shell=JSON.parse(localStorage.getItem("lilpix:shell"))}catch{}document.body.dataset.shell=${JSON.stringify(Object.keys(SHELLS))}.includes(shell)?shell:"graphite"};apply();addEventListener("storage",(e)=>{if(e.key==="lilpix:theme"||e.key==="lilpix:shell"||e.key===null)apply()});dark.addEventListener("change",apply)})()</script>`;
  html = html.replace(/(<body[^>]*>)/, `$1${pick}`);
}
const outDir = join(ROOT, "public", "anatomy");
mkdirSync(outDir, { recursive: true });
const file = theme === "auto" ? "index.html" : `${theme}.html`;
writeFileSync(join(outDir, file), html);
console.log("wrote public/anatomy/" + file, (html.length / 1024).toFixed(0) + " KB");
