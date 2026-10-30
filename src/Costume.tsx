import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import {
  BackSide,
  Box3,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShapeGeometry,
  type Group as ThreeGroup,
  type Material,
  type Side,
} from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { CostumeName } from "./costumes.ts";
import { growIn, MOTIONS } from "./costume-motion.ts";
import { Flame, type FlameKind } from "./Flame.tsx";
import { Rig, restPose, type PartInfo, type Pose } from "./costume-rig.ts";

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
type CostumeData = {
  /** Moving parts by name. */
  parts?: Record<string, PartInfo>;
  groups: Group[];
  sprites: Sprite[];
  threads?: [number, number, number][];
};

const loaders = import.meta.glob<CostumeData>("./costumes/*.json", {
  import: "default",
});
const loaded = new Map<CostumeName, CostumeData>();

// The logo draws sprites mirrored, with y pointing down, at 44 units to an ear.
const SPRITE_SCALE: [number, number, number] = [-8.85 / 44, -7.9 / 40, 1];
// Spacing between stacked sprites, so later ones draw on top.
const SPRITE_LAYER = 0.004;
// Lil Spider's thread runs well out of frame, as if hung from the ceiling.
const THREAD_LENGTH = 120;
const threadGeometry = new CylinderGeometry(0.05, 0.05, THREAD_LENGTH, 6).translate(
  0,
  THREAD_LENGTH / 2,
  0,
);
const threadMaterial = new MeshStandardMaterial({
  color: "#b9bccb",
  roughness: 0.6,
});

const noRaycast = () => null;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const svgLoader = new SVGLoader();

// Fire and glowing parts: unlit and pushed past the bloom threshold, like the eyes.
const GLOWING = new Set(["glow", "embers"]);
// Parts whose sprites only outline a fire; a live flame fills the outline instead.
const FLAMES: Record<string, FlameKind> = { flame: "candle", fire: "campfire" };
const GLOW_GAIN = 1.6;

function material(color: string, opacity = 1, side: Side = DoubleSide, part?: string) {
  if (part && GLOWING.has(part)) {
    const glow = new MeshBasicMaterial({
      color,
      side,
      transparent: opacity < 1,
      opacity,
      toneMapped: false,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    glow.color.multiplyScalar(GLOW_GAIN);
    glow.userData.gain = GLOW_GAIN;
    return glow;
  }
  return new MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.1,
    side,
    transparent: opacity < 1,
    opacity,
    // Painted-on details sit a hair above the shell; win the depth test there.
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

type Part = { geometry: BufferGeometry; material: Material; part?: string };
/** Sprites turn about their anchor to face the camera, like the logo's billboards. */
type SpritePart = Part & { at: [number, number, number] };
type FlamePart = { part: string; kind: FlameKind; at: [number, number, number]; box: Box3 };

function build(data: CostumeData) {
  const parts: Part[] = [];
  const sprites: SpritePart[] = [];
  const flames: FlamePart[] = [];
  for (const group of data.groups) {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(group.positions, 3));
    // Unindexed triangles get one normal per face: the same flat, faceted look as the logo.
    geometry.computeVertexNormals();
    if (group.back) {
      parts.push({
        geometry,
        material: material(group.color, group.opacity, FrontSide, group.part),
        part: group.part,
      });
      parts.push({
        geometry,
        material: material(group.back, group.opacity, BackSide, group.part),
        part: group.part,
      });
    } else {
      parts.push({
        geometry,
        material: material(group.color, group.opacity, DoubleSide, group.part),
        part: group.part,
      });
    }
  }
  for (const sprite of data.sprites) {
    const svg = svgLoader.parse(
      `<svg xmlns="http://www.w3.org/2000/svg"><path d="${sprite.path}"/></svg>`,
    );
    const shapes = svg.paths.flatMap((path) => SVGLoader.createShapes(path));
    const [x, y] = sprite.shift ?? [0, 0];
    const geometry = new ShapeGeometry(shapes)
      .scale(...SPRITE_SCALE)
      .translate(x, y, sprites.length * SPRITE_LAYER);
    const kind = sprite.part && FLAMES[sprite.part];
    if (kind) {
      geometry.computeBoundingBox();
      const flame = flames.find((f) => f.part === sprite.part);
      if (flame) flame.box.union(geometry.boundingBox!);
      else flames.push({ part: sprite.part!, kind, at: sprite.at, box: geometry.boundingBox! });
      geometry.dispose();
      continue;
    }
    sprites.push({
      geometry,
      material: material(sprite.color, sprite.opacity, DoubleSide, sprite.part),
      at: sprite.at,
      part: sprite.part,
    });
  }
  return { parts, sprites, flames };
}

/**
 * The costume meshes for the bot, loaded on first use. `pose` receives the
 * costume's head motion for the bot to apply.
 */
export function Costume({ name, pose }: { name: CostumeName; pose: RefObject<Pose> }) {
  const current = loaded.get(name);
  // Bumped when a costume finishes loading, to re-render with it.
  const [, setLoads] = useState(0);

  useEffect(() => {
    if (loaded.has(name)) return;
    void loaders[`./costumes/${name}.json`]().then((data) => {
      loaded.set(name, data);
      setLoads((n) => n + 1);
    });
  }, [name]);

  const built = useMemo(
    () => (current ? build(current) : { parts: [], sprites: [], flames: [] }),
    [current],
  );

  useEffect(
    () => () =>
      [...built.parts, ...built.sprites].forEach((part) => {
        part.geometry.dispose();
        part.material.dispose();
      }),
    [built],
  );

  // A fresh rig per costume; its clock starts on the first frame it's worn.
  const rig = useMemo(() => {
    const rig = new Rig();
    for (const [part, info] of Object.entries(current?.parts ?? {})) rig.define(part, info);
    return rig;
  }, [current]);

  useEffect(() => () => void Object.assign(pose.current, restPose()), [pose, rig]);

  const root = useRef<ThreeGroup>(null);

  useFrame(({ clock }) => {
    if (reducedMotion || !current) return;
    const t = rig.since(clock.elapsedTime);
    // Grows out of the head when put on.
    root.current?.scale.setScalar(Math.max(1e-3, growIn(t)));
    const head = MOTIONS[name]?.(t, rig);
    Object.assign(pose.current, restPose(), head);
  });

  const meshes = (part?: string) => (
    <>
      {built.parts
        .filter((p) => p.part === part)
        .map((p, i) => (
          <mesh
            key={i}
            geometry={p.geometry}
            material={p.material}
            castShadow
            raycast={noRaycast}
          />
        ))}
      {built.sprites
        .filter((s) => s.part === part)
        .map((s, i) => (
          // Upright: turn about the vertical only, so flames and sprouts keep standing.
          <Billboard key={`sprite-${i}`} position={s.at} lockX lockZ>
            <mesh geometry={s.geometry} material={s.material} raycast={noRaycast} />
          </Billboard>
        ))}
      {built.flames
        .filter((f) => f.part === part)
        .map((f, i) => (
          <group key={`flame-${i}`} position={f.at}>
            <Flame kind={f.kind} box={f.box} seed={i} />
          </group>
        ))}
    </>
  );

  return (
    <group ref={root}>
      {meshes()}
      {Object.entries(current?.parts ?? {}).map(([part, info]) => (
        <group
          // Remount per costume, so no pose carries over to the next one.
          key={`${name}-${part}`}
          position={info.at}
          ref={(g) => rig.attach(part, g)}
        >
          {meshes(part)}
        </group>
      ))}
      {current?.threads?.map((at, i) => (
        <mesh
          key={`thread-${i}`}
          position={at}
          geometry={threadGeometry}
          material={threadMaterial}
          raycast={noRaycast}
        />
      ))}
    </group>
  );
}
