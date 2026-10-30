import type { CostumeName } from "./costumes.ts";
import type { Pose, Rig, Vec } from "./costume-rig.ts";

// Idle motion for the costumes, after Vercel's Lil Pix logo. Times are in
// milliseconds since the costume went on; positions and angles are in the
// logo's head coordinates (see costume-rig.ts). Meshes were captured at t = 0,
// so bending motions move vertices by the change since then.

type Motion = (t: number, rig: Rig) => Partial<Pose> | void;

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/** sin wave with a period in ms and a phase in turns. */
const wave = (t: number, period: number, phase = 0) => Math.sin((t / period + phase) * TAU);

/** Deterministic noise in [0, 1). */
function hash(n: number) {
  const v = 43758.5453 * Math.sin(127.1 * n + 311.7);
  return v - Math.floor(v);
}

/** Smooth value noise in [-1, 1]. */
function noise(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const a = 2 * hash(i + 101 * seed) - 1;
  const b = 2 * hash(i + 1 + 101 * seed) - 1;
  return a + (b - a) * f * f * (3 - 2 * f);
}

/** CSS cubic-bezier timing function. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}

const ease = {
  out: bezier(0.22, 1, 0.36, 1),
  in: bezier(0.55, 0, 1, 0.45),
  inOut: bezier(0.65, 0, 0.35, 1),
  snap: bezier(0.2, 0, 0, 1),
};

/**
 * A pulse that repeats every `period` ms after `delay`: rises over `attack`,
 * holds, falls over `release`, each beat pushed later by up to `jitter` of the
 * spare time so it doesn't feel metronomic.
 */
function pulse(
  t: number,
  period: number,
  delay: number,
  attack: number,
  hold: number,
  release: number,
  jitter: number,
) {
  if (t < delay) return 0;
  const a = t - delay;
  const k = Math.floor(a / period);
  const x = a - k * period - hash(k) * jitter * (period - attack - hold - release);
  if (x < 0) return 0;
  if (x < attack) return ease.snap(x / attack);
  if (x < attack + hold) return 1;
  return 1 - ease.inOut(clamp01((x - attack - hold) / release));
}

/** A damped spring chasing `target`, kept in the rig's state under `key`. */
function spring(
  rig: Rig,
  key: string,
  t: number,
  target: number,
  response: number,
  damping: number,
) {
  const s = rig.state;
  const omega = 4.3 / (Math.max(35, response) / 1000);
  let value = s[key] ?? target;
  let velocity = s[`${key}.v`] ?? 0;
  let left = Math.min(50, Math.max(0, t - (s[`${key}.t`] ?? t))) / 1000;
  while (left > 0) {
    const dt = Math.min(left, 1 / 240);
    velocity += (omega * omega * (target - value) - 2 * damping * omega * velocity) * dt;
    value += velocity * dt;
    left -= dt;
  }
  s[key] = value;
  s[`${key}.v`] = velocity;
  s[`${key}.t`] = t;
  return value;
}

const vec = (x: number, y: number, z: number): Vec => ({ x, y, z });

/** A tube of `sides` around a polyline, as quads. */
function tube(points: Vec[], radii: number[], sides = 6) {
  const rings = points.map((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    let tz = b.z - a.z;
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    // A side vector off the tangent, then the third axis.
    let ux = -ty;
    let uy = tx;
    let uz = 0;
    if (Math.hypot(ux, uy) < 0.1) [ux, uy, uz] = [0, -tz, ty];
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = ty * uz - tz * uy;
    const vy = tz * ux - tx * uz;
    const vz = tx * uy - ty * ux;
    return Array.from({ length: sides }, (_, k) => {
      const c = Math.cos((k / sides) * TAU) * radii[i];
      const s = Math.sin((k / sides) * TAU) * radii[i];
      return vec(p.x + ux * c + vx * s, p.y + uy * c + vy * s, p.z + uz * c + vz * s);
    });
  });
  const quads: Vec[][] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const n = (k + 1) % sides;
      quads.push([rings[i][k], rings[i][n], rings[i + 1][n], rings[i + 1][k]]);
    }
  }
  return quads;
}

/** A low-poly ball, squashed by `sy` on the y axis. */
function ball(c: Vec, r: number, sy = 1, rows = 5, sides = 8) {
  const faces: Vec[][] = [];
  const at = (i: number, k: number) => {
    const a = (i / rows) * Math.PI;
    const b = (k / sides) * TAU;
    return vec(
      c.x + r * Math.sin(a) * Math.cos(b),
      c.y - r * sy * Math.cos(a),
      c.z + r * Math.sin(a) * Math.sin(b),
    );
  };
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < sides; k++) {
      const quad = [at(i, k), at(i, k + 1), at(i + 1, k + 1), at(i + 1, k)];
      // Collapse the zero-area edges at the poles to triangles.
      faces.push(i === 0 ? [quad[0], quad[2], quad[3]] : i === rows - 1 ? quad.slice(0, 3) : quad);
    }
  }
  return faces;
}

/** Scale of a costume just put on: eases in from nothing. */
export const growIn = (t: number) => ease.out(clamp01(t / 300));

// Lil Frank: each hex nut on the neck bolts gives a sixth of a turn every
// ~3.2 s, the left one half a beat after the right.
function nutTurn(t: number) {
  const a = t - 1100;
  if (a < 0) return 0;
  const k = Math.floor(a / 3200);
  const x = a - k * 3200 - hash(7 * k + 3) * 0.4 * (3200 - 700);
  return (k + ease.out(clamp01(x / 380))) * (Math.PI / 3);
}

// Lil Bat's wings: an arm and four fingers in the wing's plane, webbed
// between the fingertips, hinged at the side of the head.
const FINGERS = [
  { len: 28, angle: 30, pull: 0.3 },
  { len: 24, angle: -8, pull: 0.3 },
  { len: 21, angle: -40, pull: 0.28 },
  { len: 17, angle: -82, pull: 0.26 },
];

function wing(
  side: number,
  arm: number,
  finger: (i: number) => number,
  sweep: number,
  reach = 1,
): Vec[] {
  const W = { x: 15 * Math.cos(arm * DEG), y: 15 * Math.sin(arm * DEG) };
  const tips = FINGERS.map((f, i) => ({
    x: W.x + f.len * reach * Math.cos(finger(i) * DEG),
    y: W.y + f.len * reach * Math.sin(finger(i) * DEG),
  }));
  const root = { x: 0, y: -15 };
  const outline = [{ x: 0, y: 0 }, W];
  tips.forEach((tip, i) => {
    const next = tips[i + 1] ?? root;
    const pull = FINGERS[i].pull;
    const cx = lerp((tip.x + next.x) / 2, W.x, pull);
    const cy = lerp((tip.y + next.y) / 2, W.y, pull);
    outline.push(tip);
    for (let k = 1; k <= 3; k++) {
      const s = k / 4;
      outline.push({
        x: (1 - s) ** 2 * tip.x + 2 * (1 - s) * s * cx + s * s * next.x,
        y: (1 - s) ** 2 * tip.y + 2 * (1 - s) * s * cy + s * s * next.y,
      });
    }
  });
  outline.push(root);
  const a = sweep * DEG;
  return outline.map(({ x, y }) => {
    const out = Math.max(0, x);
    return vec(side * (44 + out * Math.cos(a)), -5 - y, 6 + out * Math.sin(a));
  });
}

/** The flying bat's flap: snappy down, slower up. */
function flap(phase: number) {
  const e = phase - Math.floor(phase);
  return e < 0.45 ? Math.cos((Math.PI * e) / 0.45) : -Math.cos((Math.PI * (e - 0.45)) / 0.55);
}

// Lil Witch's hat: the cone's spine, and how much of the sway each ring takes.
const HAT_SPINE = [
  [0, -40, 3, 0],
  [0, -58, 3, 0],
  [0, -66, 3, 0.04],
  [1.4, -73.1, 3.4, 0.14],
  [5.8, -78.9, 3.9, 0.32],
  [12.6, -82.1, 4.5, 0.54],
  [20.2, -82.5, 5.2, 0.76],
  [26.8, -79.1, 6, 0.92],
  [30.2, -73.9, 6.6, 1],
];

/** Sway weight of a hat vertex: the weight at the closest point on the spine. */
function hatWeight(p: Vec) {
  let best = Infinity;
  let weight = 0;
  for (let i = 0; i < HAT_SPINE.length - 1; i++) {
    const [ax, ay, az, aw] = HAT_SPINE[i];
    const [bx, by, bz, bw] = HAT_SPINE[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const f = clamp01(
      ((p.x - ax) * dx + (p.y - ay) * dy + (p.z - az) * dz) / (dx * dx + dy * dy + dz * dz),
    );
    const d = Math.hypot(p.x - ax - dx * f, p.y - ay - dy * f, p.z - az - dz * f);
    if (d < best) {
      best = d;
      weight = lerp(aw, bw, f);
    }
  }
  return weight;
}

const hatSway = (t: number) => ({
  x: 2 * wave(t, 3000),
  y: -1.2 * wave(t, 3000, 0.27),
});

// Lil Wrapped's two loose bandage strips: a wave travels down each.
const STRIPS = [
  {
    root: vec(-46.4, -21.6, 16),
    dir: [-0.86, 0.12, 0.5],
    length: 41,
    amp: 6.2,
    phase: 0,
  },
  {
    root: vec(-46.4, 21, 6),
    dir: [-0.9, 0.24, 0.38],
    length: 31,
    amp: 5,
    phase: 1.9,
  },
].map((s) => {
  const l = Math.hypot(...s.dir);
  return { ...s, dir: s.dir.map((v) => v / l) };
});

// Lil Spider's legs, left side (the right mirrors x): hip, then the knee and
// foot folded and stretched out.
const LEGS = [
  {
    root: [-44, -22, -20],
    knee: [-58, -44, -26, -63, -46, -29],
    foot: [-68, -24, -30, -84, -38, -37],
  },
  {
    root: [-44, -8, -7],
    knee: [-61, -24, -9, -66, -25, -10],
    foot: [-70, -6, -11, -84, -6, -13],
  },
  {
    root: [-44, 6, 7],
    knee: [-61, -6, 9, -68, -3, 10],
    foot: [-70, 12, 11, -80, 23, 13],
  },
  {
    root: [-44, 20, 20],
    knee: [-58, 12, 26, -65, 17, 29],
    foot: [-66, 30, 30, -72, 50, 37],
  },
];

function rotateZ(p: Vec, angle: number, c: Vec) {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return vec(
    c.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    c.y + dx * Math.sin(angle) + dy * Math.cos(angle),
    p.z,
  );
}

/** Lil Spider's hop: a bounce every ~6.4 s, the legs stretching out with it. */
function spiderHop(t: number) {
  const u = t - 1700;
  let bounce = 0;
  if (u >= 0) {
    const k = Math.floor(u / 6400);
    const s = u - 6400 * k - hash(k) * 0.25 * 4200;
    if (s >= 0 && s <= 1500)
      bounce = 4.6 * Math.exp(-s / 360) * Math.sin((TAU * s) / 560) * clamp01(s / 60);
  }
  return {
    lift: bounce + 1.2 * wave(t, 5200, 0.25),
    stretch: pulse(t, 6400, 1700, 700, 600, 900, 0.25),
  };
}

// Lil Alien's antennae splay out every ~4.8 s.
function splay(t: number) {
  const a = t - 1500;
  if (a < 0) return 0;
  const k = Math.floor(a / 4800);
  const x = a - k * 4800 - hash(k + 341) * 1200;
  if (x < 0) return 0;
  if (x < 380) return ease.inOut(x / 380);
  if (x < 1280) return 1;
  return 1 - ease.inOut(clamp01((x - 1280) / 600));
}

function antenna(t: number, e: number) {
  const s = e === 0 ? -1 : 1;
  const roll = 0.42 * s * splay(t) + 0.12 * wave(t, 2800, 0.37 * e) + 0.04 * noise(t / 850, e + 1);
  const pitch = 0.07 * wave(t, 3400, 0.2 + 0.3 * e);
  const ctrl = [
    vec(13 * s, -40, -4),
    vec(13.4 * s, -49, -4),
    vec(17.4 * s, -56.5, -4.5),
    vec(19.8 * s, -64, -5),
  ];
  const curve = Array.from({ length: 7 }, (_, j) => {
    const u = j / 6;
    const w = [(1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u * u * (1 - u), u ** 3];
    return vec(
      w.reduce((sum, k, i) => sum + k * ctrl[i].x, 0),
      w.reduce((sum, k, i) => sum + k * ctrl[i].y, 0),
      w.reduce((sum, k, i) => sum + k * ctrl[i].z, 0),
    );
  });
  curve.splice(1, 0, vec(13 * s, -41.5, -4));
  const root = curve[0];
  // Curl: the further along the stalk, the more it turns about the root.
  return curve.map((p, j) => {
    const u = j / 7;
    let dx = p.x - root.x;
    let dy = p.y - root.y;
    let dz = p.z - root.z;
    const r = roll * u;
    [dx, dy] = [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)];
    const q = pitch * u;
    [dy, dz] = [dy * Math.cos(q) - dz * Math.sin(q), dy * Math.sin(q) + dz * Math.cos(q)];
    return vec(root.x + dx, root.y + dy, root.z + dz);
  });
}

// Lil Cauldron's brew bubbles: [x, z, radius, period, offset, swell time].
const BUBBLES = [
  [-16, -8, 4.2, 760, 120, 430],
  [8, 10, 3.6, 690, 260, 380],
  [20, -12, 3.2, 820, 400, 470],
  [-24, 14, 3, 720, 180, 400],
  [2, -18, 4.6, 900, 520, 560],
  [-6, 16, 3.4, 780, 330, 450],
  [24, 8, 2.8, 640, 90, 340],
  [-20, -20, 2.6, 700, 610, 380],
  [14, -24, 3, 740, 450, 410],
  [-12, 4, 3.8, 860, 700, 520],
  [16, 20, 2.6, 660, 560, 360],
  [-26, -2, 2.4, 620, 380, 330],
  [6, -4, 3.2, 800, 240, 460],
  [-2, 2, 6.4, 5200, 700, 1300],
];

// Lil Cauldron's wire handle: up the left lug, over in a squared-off arc,
// down to the right lug.
const HANDLE = [
  [-47.6, -29.8],
  ...Array.from({ length: 19 }, (_, i) => {
    const a = Math.PI - (i / 18) * Math.PI;
    const c = Math.cos(a);
    return [47.6 * Math.sign(c) * Math.abs(c) ** (2 / 3), -48 - 27.5 * Math.sin(a) ** 1.5];
  }),
  [47.6, -29.8],
];

// Lil Slime's drips along the bottom edge: [x, size, swell, pull, rest, gravity, first, seed].
const DRIPS = [
  [-29.5, 1.1, 420, 130, 360, 1900, 1050, 11],
  [-16, 0.92, 250, 95, 260, 2500, 560, 12],
  [-1, 1.3, 640, 170, 400, 1600, 1250, 13],
  [14.5, 0.98, 320, 110, 300, 2200, 780, 14],
  [28.5, 1.15, 500, 140, 340, 1800, 1500, 15],
].map(([x, size, swell, pull, rest, gravity, first, seed]) => {
  // Each drip runs a loop of 64 cycles, each a little different.
  let total = 0;
  const cycles = Array.from({ length: 64 }, (_, i) => {
    const r = (n: number) => (i === 0 ? 0.5 : hash(31.7 * seed + 7.3 * i + 1.91 * n));
    const c = {
      start: total,
      swell: swell * 2 ** (2 * r(0) - 1),
      pull: pull * 2 ** (0.45 * (2 * r(1) - 1)),
      rest: rest * 2 ** (2 * r(2) - 1),
      gravity: gravity * (0.8 + 0.4 * r(3)),
    };
    total += c.swell + c.pull + c.rest;
    return c;
  });
  return { x, size, first: first - cycles[0].swell - cycles[0].pull, cycles, total };
});

/** A drip's bulb hanging off the bottom edge, plus its last drop if still falling. */
function drip(d: (typeof DRIPS)[number], t: number) {
  const S = d.size;
  const shapes: Vec[][] = [];
  const local = t - d.first;
  if (local < 0) return shapes;
  const m = local % d.total;
  const i = d.cycles.findLastIndex((c) => c.start <= m);
  const c = d.cycles[i];
  const u = m - c.start;
  let len: number;
  let r: number;
  let stretch = 1;
  if (u < c.swell) {
    const f = ease.inOut(u / c.swell);
    len = lerp(0.7 * S, 4.4 * S, f);
    r = lerp(1.3 * S, 3.1 * S, f);
  } else if (u < c.swell + c.pull) {
    const f = (u - c.swell) / c.pull;
    len = 4.4 * S + 8.6 * S * f * f;
    r = 3.1 * S * (1.04 - 0.1 * f * f);
    stretch = 1 + 0.4 * f * f;
  } else {
    // Just let go: the bulb springs back up, and the drop falls.
    const since = u - c.swell - c.pull;
    len = 0.7 * S + 3.85 * S * Math.exp(-since / 70) * Math.cos(0.04 * since);
    r = (0.9 + 0.4 * clamp01(since / 220)) * S;
  }
  shapes.push(...tube([vec(d.x, 39, -39), vec(d.x, 40 + len, -39)], [2.4 * S, r * 0.8]));
  shapes.push(...ball(vec(d.x, 40 + len, -39), r, stretch, 4, 8));
  // The drop let go at the end of the previous pull.
  const prev = u >= c.swell + c.pull ? c : d.cycles[(i - 1 + 64) % 64];
  const fall = (u >= c.swell + c.pull ? u - c.swell - c.pull : u + prev.rest) / 1000;
  if (fall < 0.7) {
    const y =
      40 + 13 * S + (2 * 8.6 * S * fall) / (prev.pull / 1000) + 0.5 * prev.gravity * fall * fall;
    const size = 3.1 * S * (1 - smooth((y - 62) / 14));
    if (size > 0.2)
      shapes.push(...ball(vec(d.x, y, -39), size, 1.3 + 0.3 * Math.exp(-fall / 0.14), 4, 8));
  }
  return shapes;
}

/** The brew's domed surface: highest in the middle. */
const brewHeight = (x: number, z: number) => -52 + 7 * Math.min(1, (x * x + z * z) / 900);

// Lil Potion's fizz: [x, radius, period, offset], rising in the brew.
const FIZZ = [
  [-38.6, 1.3, 2300, 0],
  [38.4, 1.1, 2700, 900],
  [-37.4, 0.9, 1900, 1500],
  [37.6, 1.4, 3100, 2100],
];

function disc(c: Vec, r: number, sides = 8) {
  return Array.from({ length: sides }, (_, k) =>
    vec(c.x + r * Math.cos((k / sides) * TAU), c.y + r * Math.sin((k / sides) * TAU), c.z),
  );
}

export const MOTIONS: Partial<Record<CostumeName, Motion>> = {
  frank: (t, rig) => {
    rig.turn("nutR", nutTurn(t));
    rig.turn("nutL", nutTurn(t - 1600));
    return { roll: 0.016 * wave(t, 4600), lift: 0.5 * wave(t, 2300) };
  },

  // The cape collar breathes in and out, most at its tips.
  drac: (t, rig) => {
    const breath = 1.3 * Math.sin((TAU * t) / 3800);
    rig.deform("collar", (p) => {
      const a = Math.max(-1.78, Math.min(1.78, Math.atan2(p.x, p.z)));
      const l = Math.abs(a) / 1.78;
      const root = Math.min(45 / Math.abs(Math.sin(a) || 1e-6), 41 / Math.abs(Math.cos(a) || 1e-6));
      const u = 68;
      const tip = Math.hypot(u * Math.sin(a), 10 + 0.72 * u * Math.cos(a));
      const s = clamp01((Math.hypot(p.x, p.z) - root) / Math.max(1, tip - root));
      const d = s * l * breath;
      p.x += d * Math.sin(a);
      p.y -= 1.5 * d;
      p.z += 0.72 * d * Math.cos(a);
    });
  },

  // The sheet's hem ripples in scallops and blows to one side in gusts.
  spook: (t, rig) => {
    const sheet = (time: number, x: number, nx: number, nz: number, s: number) => {
      const w = 0.5 - 0.5 * Math.cos(TAU * (12 * s + 0.0003 * time));
      const gust = 0.62 + 0.38 * noise(time / 1500, 7);
      const o = 0.5 - (0.5 * x) / 48.5;
      const front = Math.max(0, -nz);
      return {
        cx: nx * 0.8 * Math.sin(0.004 * time),
        cz: nz * 0.8 * Math.sin(0.004 * time),
        cy: (8 * w - 4) * front + 0.8 * Math.sin(2 * TAU * s + 0.0035 * time),
        gx: -13 * gust,
        gy: 10 * o * gust + 2.4 * Math.sin(10 * TAU * s + 0.006 * time) * front,
        gz: 2 * gust * o,
      };
    };
    rig.deform("skirt", (p) => {
      if (p.y <= 34.5) return;
      const n = clamp01((p.y - 35) / 23);
      const fold = n * n * (3 - 2 * n);
      const blow = n * n * (2 - n);
      const l = Math.hypot(p.x / 48.5, p.z / 44.5) || 1;
      const nx = p.x / 48.5 / l;
      const nz = p.z / 44.5 / l;
      const s = (Math.atan2(p.x, -p.z) / TAU + 1) % 1;
      const now = sheet(t, p.x, nx, nz, s);
      const rest = sheet(0, p.x, nx, nz, s);
      p.x += (now.cx - rest.cx) * fold + (now.gx - rest.gx) * blow;
      p.y += (now.cy + now.gy - rest.cy - rest.gy) * fold;
      p.z += (now.cz - rest.cz) * fold + (now.gz - rest.gz) * blow;
    });
    return {
      lift: 2.4 * Math.sin(0.0032 * t),
      roll: 0.035 * Math.sin(0.0021 * t),
    };
  },

  // The lid puffs up on its hinge now and then; the glow inside flickers.
  patch: (t, rig) => {
    const puff = pulse(t, 3500, 1500, 150, 60, 560, 0.5);
    const lift = spring(rig, "lid", t, 1.2 + 2.2 * puff, 260, 0.45) - 1.2;
    const tilt = spring(rig, "tilt", t, 0.24 + 0.08 * puff, 320, 0.55) - 0.24;
    rig.shift("lid", 0, -lift, 0);
    rig.turn("lid", -0.3 * tilt, 0, -tilt);
    const glow = clamp01(
      0.8 * clamp01(0.55 + 0.32 * noise(t / 150, 3) + 0.16 * noise(t / 55, 8)) + 0.4 * puff,
    );
    rig.color("glow", 255, lerp(150, 236, glow), lerp(40, 160, glow));
  },

  // The goo wobbles down the sides and along the bottom edge.
  slime: (t, rig) => {
    const side = (time: number, y: number, a: number) =>
      0.4 * Math.sin(0.23 * y + a + time / 2100) + 0.25 * Math.sin(0.53 * y - time / 1500 + a);
    const bottom = (time: number, x: number) =>
      0.35 * Math.sin(0.21 * x + 1.3 + time / 2300) + 0.25 * Math.sin(0.47 * x + 0.4 - time / 1700);
    const top = (time: number, s: number) => 0.35 * wave(time, 2900, s > 0 ? 0 : 0.5);
    rig.polygons(
      "drips",
      DRIPS.flatMap((d) => drip(d, t)),
    );
    rig.deform("goo", (p) => {
      const s = Math.sign(p.x);
      if (Math.abs(p.x) > 43 && p.y > -33 && p.y < 36) {
        const a = s > 0 ? 0 : 2.1;
        p.x += s * (side(t, p.y, a) - side(0, p.y, a)) * smooth((42 - p.y) / 9);
      } else if (p.y > 39.5) {
        p.y += bottom(t, p.x) - bottom(0, p.x);
      } else if (p.y < -40 && Math.abs(p.x) > 16) {
        p.y -= (top(t, s) - top(0, s)) * smooth((Math.abs(p.x) - 16) / 22.5);
      }
    });
    return { lift: 0.8 * wave(t, 2600), roll: 0.022 * wave(t, 3700) };
  },

  // The right ear flicks every few seconds.
  kitty: (t, rig) => {
    const flick = spring(rig, "flick", t, pulse(t, 3400, 900, 55, 70, 150, 0.45), 120, 0.38);
    const yaw = -0.62 * flick;
    rig.deform("earR", (p) => {
      const w = clamp01((-40 - p.y) / 18);
      p.x += 3.6 * flick * w;
      p.y += 1.2 * flick * w;
      const dx = p.x - 21;
      const dz = p.z + 8;
      p.x = 21 + Math.cos(yaw) * dx + Math.sin(yaw) * dz;
      p.z = -8 - Math.sin(yaw) * dx + Math.cos(yaw) * dz;
    });
  },

  // Loose bandage strips ripple off the side and sway.
  wrapped: (t, rig) => {
    STRIPS.forEach((strip, index) => {
      const name = `strip${index}`;
      const offset = (time: number, i: number) => {
        const u = 2.3 * Math.PI * i - 0.0048 * time + strip.phase;
        const h = 0.4 + strip.amp * i;
        return { y: Math.sin(u) * h, z: 0.45 * Math.cos(0.8 * u) * h };
      };
      rig.deform(name, (p) => {
        const [dx, dy, dz] = strip.dir;
        const i = clamp01(
          ((p.x - strip.root.x) * dx + (p.y - strip.root.y) * dy + (p.z - strip.root.z) * dz) /
            strip.length,
        );
        const now = offset(t, i);
        const rest = offset(0, i);
        p.y += now.y - rest.y;
        p.z += now.z - rest.z;
      });
      rig.turn(name, 0, 0, 0.04 * (wave(t, 3100, 0.4 * index) - wave(0, 3100, 0.4 * index)));
    });
    return { roll: 0.028 * wave(t, 3600), lift: 0.5 * wave(t, 1800) };
  },

  devil: (t) => ({ lift: 0.7 * wave(t, 3000) }),

  bat: (t, rig) => {
    const phase = 2.6733 + (t - 1220) / 260;
    const lean = (p: number) => 18 * flap(p) - 2;
    const raise = lean(phase);
    const flex = 0.5 * (lean(phase - 0.12) - raise);
    const e = phase - Math.floor(phase);
    const fan = 1 - 0.06 * (e < 0.45 ? 0 : Math.sin((Math.PI * (e - 0.45)) / 0.55));
    const sweep = 20 - 4 * flap(phase - 0.05);
    const arm = 30 + raise;
    const finger = (i: number) => arm + (FINGERS[i].angle - 30) * fan + flex * (1 - 0.15 * i);
    rig.polygons("wingR", [wing(1, arm, finger, sweep)]);
    rig.polygons("wingL", [wing(-1, arm, finger, sweep)]);
    return { lift: 0.9 * flap(phase - 0.15) + 1.3 * wave(t - 1100, 2200) };
  },

  // Folded wings breathe; the bat sways on its twig. Its wings are built the
  // right way up, then turned over.
  "hanging-bat": (t, rig) => {
    const x = wave(t, 3800);
    const arm = 61.9 + 2.4 * x;
    const finger = (i: number) =>
      arm + (FINGERS[i].angle - 30) * 0.85 * (0.8 + 0.025 * x) + 1.6 * x * (1 - 0.15 * i);
    const sweep = 30 + 1.2 * x;
    const flip = (points: Vec[]) => points.map((p) => vec(-p.x, -p.y, p.z));
    rig.polygons("wingR", [flip(wing(-1, arm, finger, sweep, 0.895))]);
    rig.polygons("wingL", [flip(wing(1, arm, finger, sweep, 0.895))]);
    return { roll: 0.035 * wave(t, 3400), lift: 0.5 * wave(t, 3800, 0.2) };
  },

  // The curled tip of the hat sways.
  witch: (t, rig) => {
    const now = hatSway(t);
    const rest = hatSway(0);
    rig.deform("cone", (p) => {
      const w = hatWeight(p);
      p.x += w * (now.x - rest.x);
      p.y += w * (now.y - rest.y);
    });
  },

  // The crossbones rattle every few seconds.
  skully: (t, rig) => {
    const rattle = pulse(t, 4400, 1500, 160, 520, 300, 0.35) * Math.sin(t / 85) * 0.09;
    rig.turn("boneA", 0, 0, rattle);
    rig.turn("boneB", 0, 0, rattle);
  },

  // Throws its head back to howl every ~6 s, ears back and ruff out; the
  // right ear flicks in between.
  wolf: (t, rig) => {
    const howl = pulse(t, 6000, 700, 520, 900, 620, 0.3);
    const twitch = pulse(t + 2200, 3100, 1800, 60, 40, 170, 0.6) * (1 - howl);
    const flick = spring(rig, "flick", t, twitch, 110, 0.38);
    for (const [name, right] of [
      ["earL", false],
      ["earR", true],
    ] as const) {
      rig.deform(name, (p) => {
        const w = clamp01((-40 - p.y) / 25);
        if (right) p.x += 2.134 * flick * w;
        p.z += (3.659 * howl + (right ? 1.22 * flick : 0)) * w;
      });
    }
    rig.deform("ruff", (p) => {
      p.y = 40 + (p.y - 40) * (1 + 0.2 * howl);
    });
    rig.scale("burnL", 1 + 0.16 * howl, 1 - 0.05 * howl, 1);
    rig.scale("burnR", 1 + 0.16 * howl, 1 - 0.05 * howl, 1);
    return { pitch: -0.42 * howl, lift: -4 * howl };
  },

  // Legs stretch out on each hop and sway at the hips.
  spider: (t, rig) => {
    const { lift, stretch } = spiderHop(t);
    const flare = Math.max(-1, Math.min(1, lift / 5));
    const sag = (spring(rig, "sag", t, lift, 200, 0.4) - lift) * 2.2;
    for (const side of [-1, 1]) {
      const legs = LEGS.flatMap((leg, i) => {
        const root = vec(leg.root[0], leg.root[1], leg.root[2]);
        const at = (k: number[]) =>
          vec(lerp(k[0], k[3], stretch), lerp(k[1], k[4], stretch), lerp(k[2], k[5], stretch));
        const hip = -0.1 * flare + 0.02 * Math.sin(TAU * (t / 5200 + 0.1 * i));
        const knee = rotateZ(at(leg.knee), hip, root);
        const foot = rotateZ(rotateZ(at(leg.foot), hip, root), 0.2 * flare, knee);
        knee.y += 0.6 * sag;
        foot.y += sag;
        const chain = [
          root,
          vec(lerp(root.x, knee.x, 0.82), lerp(root.y, knee.y, 0.82), lerp(root.z, knee.z, 0.82)),
          vec(lerp(knee.x, foot.x, 0.18), lerp(knee.y, foot.y, 0.18), lerp(knee.z, foot.z, 0.18)),
          foot,
        ].map((p) => vec(side < 0 ? p.x : -p.x, p.y, p.z));
        return tube(chain, [2.9, 2.6, 2.3, 1.2]);
      });
      rig.polygons(side < 0 ? "legL" : "legR", legs);
    }
    return { lift, roll: 0.045 * wave(t, 5200), yaw: 0.07 * wave(t, 7400) };
  },

  // The candle flame flickers, and every 4 s it's blown out and relights.
  flame: (t, rig) => {
    let size = 1;
    let narrow = 1;
    const smoke: Vec[][] = [];
    if (t >= 1600) {
      const c = (t - 1600) % 4000;
      // A curl of smoke rises from the wick once it's out.
      const e = (c - 340) / 950;
      if (e > 0 && e < 1) {
        const fade = 1 - ease.in(e);
        for (let n = 1; n <= 6; n++) {
          const s = n / 6;
          const rise = s * (6 + 20 * ease.out(e));
          const dx = Math.sin(4.5 * s - 4 * e) * (0.8 + 4 * s) * (0.4 + 0.6 * e) + 3 * s * e;
          const r = (0.5 + 1.4 * s) * fade * clamp01(6 * e);
          if (r > 0.1) smoke.push(...ball(vec(1.6 - dx, -50.5 - rise, 0), r, 1, 3, 6));
        }
      }
      const out = ease.in(clamp01((c - 60) / 360));
      const left = 1 - out;
      const relit = c - 1500;
      const flicker = 1 - 0.5 * Math.sin(c / 19) * out * left;
      size =
        relit >= 0 ? 1 - Math.exp(-relit / 120) * Math.cos((TAU * relit) / 360) : left * flicker;
      if (c < 1500) narrow = 0.55 + 0.45 * size;
      else narrow = size;
    }
    const stretch = 0.075 * noise(t / 260, 4) + 0.045 * noise(t / 96, 6);
    const shown = size < 0.05 ? 0 : 1;
    rig.scale("flame", shown * narrow * (1 - 0.5 * stretch), shown * size * (1 + stretch), 1);
    rig.polygons("smoke", smoke);
    return { lift: -0.7 * wave(t, 3800) };
  },

  // The fire flickers and the brew bubbles, swelling and popping.
  cauldron: (t, rig) => {
    const flicker = 1 + 0.12 * noise(t / 230, 3) + 0.06 * noise(t / 90, 10);
    rig.scale("fire", 1, 0.96 + 0.04 * flicker, 1);
    // The big bubble's pop knocks the handle, which rattles back to rest.
    const e = t - 2000;
    const r = e < 0 ? 1e9 : e % 5200;
    const knock = r < 520 ? Math.sin((Math.PI * r) / 520) * (1 - r / 520) * 1.6 : 0;
    const lean = 16 * DEG + spring(rig, "rattle", t, 0.12 * knock, 140, 0.25);
    rig.polygons(
      "handle",
      tube(
        HANDLE.map(([x, y]) => {
          const d = y + 31.5;
          return vec(x, -31.5 + d * Math.cos(lean), -d * Math.sin(lean));
        }),
        HANDLE.map(() => 2.1),
      ),
    );
    const embers: Vec[][] = [];
    for (let o = 0; o < 5; o++) {
      const period = 1700 + 230 * o;
      const h = ((((t - 340 * o) % period) + period) % period) / period;
      const radius = 1.1 * Math.sin(Math.PI * h);
      if (radius < 0.15) continue;
      const x = (o - 2) * 9 + 6 * noise(t / 600, o + 20) * h;
      embers.push(...ball(vec(x, 62 - 14 * ease.out(h), -12), radius, 1, 3, 6));
    }
    rig.polygons("embers", embers);
    const bubbles: Vec[][] = [];
    BUBBLES.forEach(([x, z, r, period, at, grow], i) => {
      const m = (((t - at) % period) + period) % period;
      if (m >= grow + 70) return;
      const k = Math.floor((t - at) / period);
      const limit = 26 - r;
      const bx = Math.max(-limit, Math.min(limit, x + (hash(7 * k + 31 * i) - 0.5) * 9));
      const bz = Math.max(-limit, Math.min(limit, z + (hash(13 * k + 17 * i + 5) - 0.5) * 9));
      const swell = ease.out(Math.min(1, m / grow));
      const R = r * (0.35 + 0.65 * swell);
      // Rises out of the brew, then flattens as it pops.
      const flat = m < grow ? 1 : 1 - ease.in(clamp01((m - grow) / 70));
      const sunk = 0.8 * R * (1 - swell);
      bubbles.push(...ball(vec(bx, brewHeight(bx, bz) + sunk, bz), R, flat));
    });
    rig.polygons("bubbles", bubbles);
    return {
      lift: -1.4 * wave(t, 3200),
      roll: 0.024 * wave(t, 3800) + 0.008 * wave(t, 1700, 0.3),
      pitch: 0.014 * wave(t, 3200, 0.25),
    };
  },

  // Fizz rises up the glass beside the face.
  potion: (t, rig) => {
    const fizz: Vec[][] = [];
    FIZZ.forEach(([x, r, period, at], i) => {
      const f = ((t + at) / period) % 1;
      const y = 30.5 - 56 * f;
      const radius = r * (0.6 + 0.4 * f);
      if (y - radius > -12.5) fizz.push(disc(vec(x + 0.8 * Math.sin(9 * f + i), y, -40.3), radius));
    });
    rig.polygons("fizz", fizz);
    return { lift: 0.6 * wave(t, 3000), roll: 0.035 * wave(t, 5200) };
  },

  alien: (t, rig) => {
    for (const e of [0, 1]) {
      const stalk = antenna(t, e);
      const radii = stalk.map((_, j) => (5.4 - 1.4 * (j / 7)) / 2);
      rig.polygons(e === 0 ? "stalkL" : "stalkR", tube(stalk, radii));
      rig.polygons(e === 0 ? "tipL" : "tipR", ball(stalk[stalk.length - 1], 7.5));
    }
  },
};
