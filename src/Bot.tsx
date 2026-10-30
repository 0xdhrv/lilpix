import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  BoxGeometry,
  PlaneGeometry,
  Color,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  type Group,
  type InstancedMesh,
} from "three";
import { eyeGrids, ledsFor, type ExpressionName, type Leds } from "./expressions.ts";
import { tilt } from "./tilt.ts";
import { SHELLS, type ShellName } from "./shells.ts";
import { costumeLook, isUpsideDown, type CostumeName } from "./costumes.ts";
import type { Theme } from "./backgrounds.ts";
import { Costume } from "./Costume.tsx";
import { fireLight } from "./fire-light.ts";
import { restPose, SY } from "./costume-rig.ts";

// Geometry traced from the source SVG: 1 unit = 10 SVG px, origin at the
// body's center (1819.5, 736), SVG y flipped to point up.
const DEPTH = 12;
const FRONT = DEPTH / 2;

const INK = "#000000";
const EYE = "#f2f2f2";

const SLOTS = [-6.16, -3.5, -0.88];
const EYES = [-2.58, 2.65];
// Half the original eye bar width, so the neutral 2×6 grid matches the SVG.
const PIXEL = 0.86;
const EYES_Y = -0.95;

// Vent slots on the right ear, as on the about-page figure: 11 closed slots.
const EAR_HX = 17.7 / 2;
const VENTS = Array.from({ length: 11 }, (_, i) => (i - 5) * 0.73);

// Cursor tracking. Eye travel keeps the widest grid inside the screen; the
// body turn stays subtle so the face is always readable.
const LOOK_X = 1.1;
const LOOK_Y = 0.75;
const TURN_Y = 0.3;
const TURN_X = 0.18;
const CENTER = { x: 0, y: 0 };
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Every lit eye pixel is one instance of a single mesh: one draw call for the
// whole face, however many pixels an expression uses.
const MAX_PIXELS = 96;
// A flat quad, not a box: side walls would read as bevels when the bot tilts.
const pixelGeometry = new PlaneGeometry(PIXEL, PIXEL).translate(0, 0, 0.06);
// Unlit and pushed past the bloom threshold (1) so the eyes glow like the LEDs.
// Fog skips the eyes and LEDs so the face and glow stay crisp through the haze.
const pixelMaterial = new MeshBasicMaterial({
  color: EYE,
  toneMapped: false,
  fog: false,
});
pixelMaterial.color.multiplyScalar(1.25);
const dummy = new Object3D();

// Decorative meshes never take pointer events: the invisible hit box below
// answers for the whole bot, so a pointer move doesn't test every triangle.
const noRaycast = () => null;

// One shell material for the body and ears; a shell change just recolors it.
const shellMaterial = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 });
const ventMaterial = new MeshStandardMaterial({ color: INK, roughness: 0.9 });
const bezelMaterial = new MeshStandardMaterial({ color: INK, roughness: 0.4 });
const ventGeometry = new BoxGeometry(0.04, 6.7, 0.3);
// The black slot behind each LED lens.
const bezelGeometry = new BoxGeometry(1.75, 1.75, 0.1);
const lensGeometry = new BoxGeometry(1.1, 1.1, 0.06);

/** Identical parts that never move, drawn as one instanced mesh. */
function StaticInstances({
  geometry,
  material,
  positions,
}: {
  geometry: BoxGeometry;
  material: MeshStandardMaterial;
  positions: [number, number, number][];
}) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    positions.forEach((position, i) => {
      dummy.position.set(...position);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return (
    <instancedMesh ref={mesh} args={[geometry, material, positions.length]} raycast={noRaycast} />
  );
}

const VENT_POSITIONS = VENTS.map((z): [number, number, number] => [EAR_HX + 0.005, 0, z]);
const BEZEL_POSITIONS = SLOTS.map((x): [number, number, number] => [x, 6.2, FRONT + 0.01]);

function EyePixels({ left, right }: { left: string[]; right: string[] }) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    let i = 0;
    [left, right].forEach((rows, eye) => {
      const h = rows.length;
      const w = rows[0].length;
      rows.forEach((row, r) =>
        row.split("").forEach((cell, c) => {
          if (cell !== "#" || i >= MAX_PIXELS) return;
          dummy.position.set(EYES[eye] + (c - (w - 1) / 2) * PIXEL, ((h - 1) / 2 - r) * PIXEL, 0);
          dummy.updateMatrix();
          mesh.current!.setMatrixAt(i++, dummy.matrix);
        }),
      );
    });
    mesh.current.count = i;
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [left, right]);

  // Culling is off: the bounding sphere is fixed by the first expression, and
  // wider ones would pop out at the screen's edge.
  return (
    <instancedMesh
      ref={mesh}
      args={[pixelGeometry, pixelMaterial, MAX_PIXELS]}
      frustumCulled={false}
      raycast={noRaycast}
    />
  );
}

// Target bloom luminance for every LED, so blue glows as strongly as green.
const LED_GLOW = 2;
const scratch = new Color();
const colorCache = new Map<string, { color: Color; gain: number }>();

function luminance(c: Color) {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

// Parsed once per color, not per frame.
function ledColor(hex: string) {
  let entry = colorCache.get(hex);
  if (!entry) {
    const color = new Color(hex);
    entry = { color, gain: Math.min(14, LED_GLOW / luminance(color)) };
    colorCache.set(hex, entry);
  }
  return entry;
}

function ledLevel({ mode, speed }: Leds, t: number, i: number) {
  switch (mode) {
    case "breathe":
      return 0.25 + 0.75 * (0.5 + 0.5 * Math.sin((t * speed + i * 0.15) * Math.PI * 2));
    case "blink":
      return (t * speed) % 1 < 0.5 ? 1 : 0.06;
    case "chase":
      return Math.floor(t * speed) % 3 === i ? 1 : 0.1;
    default:
      return 1;
  }
}

function Leds({ leds, on, base }: { leds: Leds; on: boolean; base: string }) {
  const lenses = useRef<(MeshStandardMaterial | null)[]>([]);
  // What the lenses currently show, so a static or dark LED costs nothing per frame.
  const applied = useRef<{ leds: Leds; on: boolean } | null>(null);

  useFrame(({ clock }) => {
    const animated = on && leds.mode !== "steady";
    const last = applied.current;
    if (!animated && last && last.leds === leds && last.on === on) return;
    applied.current = { leds, on };

    const t = clock.elapsedTime;
    lenses.current.forEach((material, i) => {
      if (!material) return;
      let color: Color;
      let gain: number;
      if (leds.mode === "rainbow") {
        color = scratch.setHSL((t * leds.speed + i / 3) % 1, 1, 0.5);
        gain = Math.min(14, LED_GLOW / luminance(color));
      } else {
        ({ color, gain } = ledColor(leds.colors[i]));
      }
      material.emissive.copy(color);
      material.emissiveIntensity = gain * (on ? ledLevel(leds, t, i) : 0);
    });
  });

  return (
    <>
      <StaticInstances
        geometry={bezelGeometry}
        material={bezelMaterial}
        positions={BEZEL_POSITIONS}
      />
      {SLOTS.map((x, i) => (
        <mesh key={x} position={[x, 6.2, FRONT + 0.08]} geometry={lensGeometry} raycast={noRaycast}>
          <meshStandardMaterial
            ref={(m) => {
              lenses.current[i] = m;
            }}
            color={base}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      ))}
    </>
  );
}

type BotProps = {
  expression: ExpressionName;
  shell: ShellName;
  /** Halloween costume; it brings its own shell, screen and eye colors. */
  costume: CostumeName | null;
  theme: Theme;
  /** LEDs stay dark until switched on. */
  leds: boolean;
  /** Look toward the pointer (or the phone's tilt). Off eases back to center. */
  follow: boolean;
  onClick?: () => void;
};

export function Bot({ expression, shell, costume, theme, leds, follow, onClick }: BotProps) {
  const colors = costume ? costumeLook(costume, theme) : null;
  const BODY = colors?.shell ?? SHELLS[shell].body;
  const EYE_COLOR = colors?.eyes ?? EYE;
  const body = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  // Smoothed look direction, before snapping.
  const look = useRef({ x: 0, y: 0 });
  // Smoothed body turn, kept apart from the costume's head motion added on top.
  const turn = useRef({ x: 0, y: 0 });
  const pose = useRef(restPose());
  const [left, right] = eyeGrids(expression);

  // Squash the eyes shut on every expression change, then let them pop open.
  useEffect(() => {
    if (eyes.current) eyes.current.scale.y = 0.05;
  }, [expression]);

  useLayoutEffect(() => {
    shellMaterial.color.set(BODY);
  }, [BODY]);

  useLayoutEffect(() => {
    pixelMaterial.color.set(EYE_COLOR).multiplyScalar(1.25);
  }, [EYE_COLOR]);

  useFrame(({ clock, pointer }, delta) => {
    // Clamp long frames (tab switches) so damping never jumps.
    delta = Math.min(delta, 1 / 30);
    if (!eyes.current || !body.current) return;

    // Quick blink every ~4s, eased back open.
    const blinking = clock.elapsedTime % 4 > 3.85;
    const openness = blinking ? 0.1 : 1;
    eyes.current.scale.y = MathUtils.damp(eyes.current.scale.y, openness, 18, delta);

    // Follow the pointer (or the phone's tilt): eyes glance first, the body
    // turns after them.
    if (reducedMotion) return;
    const target = !follow ? CENTER : tilt.active ? tilt : pointer;
    look.current.x = MathUtils.damp(look.current.x, target.x, 8, delta);
    look.current.y = MathUtils.damp(look.current.y, target.y, 8, delta);
    eyes.current.position.x = look.current.x * LOOK_X;
    eyes.current.position.y = EYES_Y + look.current.y * LOOK_Y;
    turn.current.y = MathUtils.damp(turn.current.y, target.x * TURN_Y, 3, delta);
    turn.current.x = MathUtils.damp(turn.current.x, -target.y * TURN_X, 3, delta);
    // Costume poses are in the logo's axes: y and z point the other way.
    const { pitch, yaw, roll, lift } = pose.current;
    body.current.rotation.set(
      turn.current.x + pitch,
      turn.current.y - yaw,
      (isUpsideDown(costume) ? Math.PI : 0) - roll,
    );
    body.current.position.y = -lift * SY;
  });

  return (
    <group
      ref={body}
      rotation-z={isUpsideDown(costume) ? Math.PI : 0}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {/* Invisible hit box standing in for the body and ears. */}
      <mesh visible={false}>
        <boxGeometry args={[17.7, 15.8, DEPTH]} />
      </mesh>

      {/* Main body (x 1741–1899, y 657–815) */}
      <RoundedBox
        args={[15.8, 15.8, DEPTH]}
        radius={0.25}
        smoothness={4}
        material={shellMaterial}
        castShadow
        receiveShadow
        raycast={noRaycast}
      />

      {/* Side ears (x 1731–1908, y 666–806) */}
      <RoundedBox
        args={[17.7, 14, DEPTH - 1]}
        radius={0.25}
        smoothness={4}
        material={shellMaterial}
        castShadow
        raycast={noRaycast}
      />

      {/* Vent slots on the right side */}
      <StaticInstances geometry={ventGeometry} material={ventMaterial} positions={VENT_POSITIONS} />

      {/* Screen (x 1749–1891, y 701–799) */}
      <mesh position={[0, -1.4, FRONT + 0.01]} raycast={noRaycast}>
        <boxGeometry args={[14.2, 9.8, 0.1]} />
        {/* Unfogged, so the face keeps full contrast against the eyes. */}
        <meshPhysicalMaterial
          color={colors?.screen ?? INK}
          roughness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.1}
          fog={false}
        />
      </mesh>

      {/* Eyes */}
      <group ref={eyes} position={[0, EYES_Y, FRONT + 0.12]}>
        <EyePixels left={left} right={right} />
      </group>

      {/* RGB LEDs in the top slots */}
      <Leds leds={ledsFor(expression)} on={leds} base={colors?.leds ?? INK} />

      <primitive object={fireLight} />

      {costume && (
        // Costumes are modeled the right way up, even on a bot hanging upside down.
        <group rotation-z={isUpsideDown(costume) ? Math.PI : 0}>
          <Costume name={costume} pose={pose} />
        </group>
      )}
    </group>
  );
}
