import {
  BufferAttribute,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
  type BufferGeometry,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from "three";

// Costume meshes are stored in bot units, but their motion is written in the
// logo's head coordinates (see Costume.tsx): x right, y down, z away from the
// viewer, the head a box of ±39 (±44 at the ears) × ±40 × ±40. This maps
// between the two, squeezing the head's depth to the bot's 12 units.

export type Vec = { x: number; y: number; z: number };

export const SX = 8.85 / 44;
export const SY = 7.9 / 40;
const SZ_IN = 6 / 40;
const LIFT = 0.04;

function toBotZ(z: number) {
  const a = Math.abs(z);
  return a <= 40 ? -z * SZ_IN : -Math.sign(z) * (6 + LIFT + (a - 40) * SX);
}

function fromBotZ(z: number) {
  const a = Math.abs(z);
  return a <= 6 ? -z / SZ_IN : -Math.sign(z) * (40 + (a - 6 - LIFT) / SX);
}

export type PartInfo = {
  /** Pivot in bot units, where the part's group sits. */
  at: [number, number, number];
  /** Pivot in logo units. */
  origin: [number, number, number];
  /** Mapped with one scale on every axis about the pivot, so it can spin without warping. */
  uniform?: boolean;
};

/** Logo point to the part's local bot coordinates. */
function toLocal(p: Vec, info: PartInfo, out: Vec) {
  const [ox, oy, oz] = info.origin;
  if (info.uniform) {
    out.x = (p.x - ox) * SX;
    out.y = -(p.y - oy) * SY;
    out.z = -(p.z - oz) * SX;
  } else {
    out.x = (p.x - ox) * SX;
    out.y = -(p.y - oy) * SY;
    out.z = toBotZ(p.z) - toBotZ(oz);
  }
  return out;
}

function fromLocal(x: number, y: number, z: number, info: PartInfo, out: Vec) {
  const [ox, oy, oz] = info.origin;
  out.x = x / SX + ox;
  out.y = -y / SY + oy;
  out.z = info.uniform ? -z / SX + oz : fromBotZ(z + toBotZ(oz));
  return out;
}

/** The pose a costume gives the whole head: angles in the logo's axes, lift in logo units (down). */
export type Pose = { pitch: number; yaw: number; roll: number; lift: number };

export const restPose = (): Pose => ({ pitch: 0, yaw: 0, roll: 0, lift: 0 });

type RigPart = { info: PartInfo; group?: Group };

/** What a costume's motion can move, by part name. */
export class Rig {
  /** Free storage for a motion's springs and timers; cleared per costume. */
  state: Record<string, number> = {};
  private parts = new Map<string, RigPart>();
  private start = -1;
  private rest = new WeakMap<BufferGeometry, Float32Array>();
  private p: Vec = { x: 0, y: 0, z: 0 };
  private q: Vec = { x: 0, y: 0, z: 0 };

  /** Milliseconds since the first frame this rig was asked, given the clock in seconds. */
  since(seconds: number) {
    if (this.start < 0) this.start = seconds;
    return (seconds - this.start) * 1000;
  }

  define(name: string, info: PartInfo) {
    this.parts.set(name, { info });
  }

  attach(name: string, group: Group | null) {
    const part = this.parts.get(name);
    if (!part) return;
    part.group = group ?? undefined;
  }

  /** The part's group, posed about its pivot. */
  group(name: string) {
    return this.parts.get(name)?.group;
  }

  /** Rotate a part about its pivot: pitch about x, yaw about y, roll about z, in the logo's axes. */
  turn(name: string, pitch = 0, yaw = 0, roll = 0) {
    this.group(name)?.rotation.set(pitch, -yaw, -roll, "YXZ");
  }

  /** Move a part by an offset in logo units. */
  shift(name: string, x = 0, y = 0, z = 0) {
    const part = this.parts.get(name);
    if (!part?.group) return;
    const [ax, ay, az] = part.info.at;
    part.group.position.set(ax + x * SX, ay - y * SY, az - z * SX);
  }

  /** Scale a part about its pivot. */
  scale(name: string, x = 1, y = 1, z = 1) {
    this.group(name)?.scale.set(x, y, z);
  }

  color(name: string, r: number, g: number, b: number) {
    const part = this.parts.get(name);
    for (const mesh of part ? meshes(part) : []) {
      const material = mesh.material as MeshStandardMaterial;
      // Glowing parts keep their boost past the bloom threshold.
      material.color
        .setRGB(r / 255, g / 255, b / 255, "srgb")
        .multiplyScalar(material.userData.gain ?? 1);
    }
  }

  /**
   * Bend a part: `move` gets each vertex at rest, in logo coordinates, and
   * moves it in place.
   */
  deform(name: string, move: (p: Vec) => void) {
    const part = this.parts.get(name);
    if (!part) return;
    for (const geometry of this.geometries(part)) {
      const position = geometry.getAttribute("position") as BufferAttribute;
      let rest = this.rest.get(geometry);
      if (!rest) {
        rest = (position.array as Float32Array).slice();
        this.rest.set(geometry, rest);
      }
      const array = position.array as Float32Array;
      for (let i = 0; i < rest.length; i += 3) {
        const p = fromLocal(rest[i], rest[i + 1], rest[i + 2], part.info, this.p);
        move(p);
        const q = toLocal(p, part.info, this.q);
        array[i] = q.x;
        array[i + 1] = q.y;
        array[i + 2] = q.z;
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
  }

  /** Replace a part's surface with these polygons, in logo coordinates. */
  polygons(name: string, polygons: Vec[][]) {
    const part = this.parts.get(name);
    const geometry = part && this.geometries(part)[0];
    if (!geometry) return;
    const out: number[] = [];
    for (const polygon of polygons) {
      for (const [a, b, c] of triangulate(polygon)) {
        for (const p of [polygon[a], polygon[b], polygon[c]]) {
          const q = toLocal(p, part.info, this.q);
          out.push(q.x, q.y, q.z);
        }
      }
    }
    const position = geometry.getAttribute("position") as BufferAttribute | undefined;
    if (position && position.array.length === out.length) {
      (position.array as Float32Array).set(out);
      position.needsUpdate = true;
    } else {
      geometry.setAttribute("position", new Float32BufferAttribute(out, 3));
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  private geometries(part: RigPart) {
    // Front and back faces of a part share one geometry.
    return [...new Set(meshes(part).map((m) => m.geometry))];
  }
}

const meshes = (part: RigPart) =>
  (part.group?.children.filter((c) => (c as Mesh).isMesh) ?? []) as Mesh[];

/** Triangle indices for a planar polygon, in its dominant plane. */
function triangulate(polygon: Vec[]) {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i];
    const q = polygon[(i + 1) % polygon.length];
    nx += (p.y - q.y) * (p.z + q.z);
    ny += (p.z - q.z) * (p.x + q.x);
    nz += (p.x - q.x) * (p.y + q.y);
  }
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const az = Math.abs(nz);
  const flat =
    az >= ax && az >= ay
      ? polygon.map((p) => new Vector2(p.x, p.y))
      : ax >= ay
        ? polygon.map((p) => new Vector2(p.y, p.z))
        : polygon.map((p) => new Vector2(p.z, p.x));
  return ShapeUtils.triangulateShape(flat, []);
}
