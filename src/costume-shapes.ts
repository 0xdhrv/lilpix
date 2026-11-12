import { positions, toBot, type PartInfo, type Vec } from "./costume-rig.ts";

// Low-poly shapes for costumes, in the logo's head coordinates (see
// costume-rig.ts): x right, y down, z away from the viewer. Each is a list of
// flat polygons; drawn unindexed, they get the logo's faceted look.

const TAU = Math.PI * 2;

type Group = {
  /** Moving part this belongs to; its positions are relative to the part's pivot. */
  part?: string;
  color: string;
  back?: string;
  opacity?: number;
  positions: number[];
};
/**
 * A flat 2D shape (flames, sprouts, antenna tips): an SVG path in the logo's
 * units, drawn around its anchor or, if absolute, in head coordinates.
 */
type Sprite = {
  path: string;
  color: string;
  opacity?: number;
  at: [number, number, number];
  /** For paths drawn in head coordinates: moves them around the anchor. */
  shift?: [number, number];
  part?: string;
};
export type CostumeData = {
  parts?: Record<string, PartInfo>;
  groups: Group[];
  sprites: Sprite[];
  threads?: [number, number, number][];
};

export const vec = (x: number, y: number, z: number): Vec => ({ x, y, z });

export function tube(points: Vec[], radii: number[], sides = 6) {
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

export function ball(c: Vec, r: number, sy = 1, rows = 5, sides = 8) {
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

export function disc(c: Vec, r: number, sides = 8) {
  return Array.from({ length: sides }, (_, k) =>
    vec(c.x + r * Math.cos((k / sides) * TAU), c.y + r * Math.sin((k / sides) * TAU), c.z),
  );
}

export function blob(c: Vec, rx: number, ry: number, rz: number, rows = 5, sides = 8) {
  return ball(vec(0, 0, 0), 1, 1, rows, sides).map((face) =>
    face.map((p) => vec(c.x + p.x * rx, c.y + p.y * ry, c.z + p.z * rz)),
  );
}

/**
 * A surface of revolution about the vertical through `c`: `profile` is
 * [radius, y] pairs, top to bottom or either way. `stretch` scales the radius
 * by angle (0 points along +x), for shapes that aren't round.
 */
export function lathe(
  profile: [number, number][],
  c: Vec,
  sides = 12,
  stretch: (angle: number) => number = () => 1,
) {
  const rings = profile.map(([r, y]) =>
    Array.from({ length: sides }, (_, k) => {
      const a = (k / sides) * TAU;
      const s = r * stretch(a);
      return vec(c.x + s * Math.cos(a), c.y + y, c.z + s * Math.sin(a));
    }),
  );
  const faces: Vec[][] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const n = (k + 1) % sides;
      const [a, b] = [rings[i], rings[i + 1]];
      // A ring of radius 0 is a point: its quads collapse to triangles.
      if (profile[i][0] === 0) faces.push([a[k], b[n], b[k]]);
      else if (profile[i + 1][0] === 0) faces.push([a[k], a[n], b[k]]);
      else faces.push([a[k], a[n], b[n], b[k]]);
    }
  }
  return faces;
}

/** Rotate shapes about `c`: about x, then y, then z, in radians. */
export function rotate(shapes: Vec[][], c: Vec, x = 0, y = 0, z = 0) {
  const [cx, sx, cy, sy, cz, sz] = [x, y, z].flatMap((a) => [Math.cos(a), Math.sin(a)]);
  return shapes.map((face) =>
    face.map((p) => {
      let dx = p.x - c.x;
      let dy = p.y - c.y;
      let dz = p.z - c.z;
      [dy, dz] = [dy * cx - dz * sx, dy * sx + dz * cx];
      [dx, dz] = [dx * cy + dz * sy, -dx * sy + dz * cy];
      [dx, dy] = [dx * cz - dy * sz, dx * sz + dy * cz];
      return vec(c.x + dx, c.y + dy, c.z + dz);
    }),
  );
}

/**
 * A flat leaf from `base` along `dir` (a unit vector), `length` long and
 * `width` across at its widest, lying in the plane of `dir` and `side`.
 */
export function leaf(base: Vec, dir: Vec, side: Vec, length: number, width: number, steps = 6) {
  const at = (u: number, w: number) =>
    vec(
      base.x + dir.x * u * length + side.x * w,
      base.y + dir.y * u * length + side.y * w,
      base.z + dir.z * u * length + side.z * w,
    );
  const edge = Array.from({ length: steps + 1 }, (_, i) => i / steps);
  const half = (u: number) => (width / 2) * Math.sin(Math.PI * u) ** 0.8;
  return [[...edge.map((u) => at(u, half(u))), ...[...edge].reverse().map((u) => at(u, -half(u)))]];
}

const ORIGIN: [number, number, number] = [0, 0, 0];

type PieceSpec = {
  color: string;
  part?: string;
  /** Color of the inside, for open shapes. */
  back?: string;
  shapes: Vec[][];
};

export function costume({
  parts = {},
  pieces,
  sprites = [],
}: {
  parts?: Record<string, { origin?: [number, number, number]; uniform?: boolean }>;
  pieces: PieceSpec[];
  sprites?: Sprite[];
}): CostumeData {
  const infos: Record<string, PartInfo> = {};
  for (const [name, { origin = ORIGIN, uniform }] of Object.entries(parts)) {
    infos[name] = { at: toBot(origin), origin, ...(uniform && { uniform }) };
  }
  const root: PartInfo = { at: ORIGIN, origin: ORIGIN };
  return {
    parts: infos,
    groups: pieces.map(({ color, part, back, shapes }) => ({
      color,
      ...(part && { part }),
      ...(back && { back }),
      positions: positions(shapes, part ? infos[part] : root),
    })),
    sprites,
  };
}
