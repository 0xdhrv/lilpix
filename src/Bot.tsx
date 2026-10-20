import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  PlaneGeometry,
  Color,
  MathUtils,
  MeshBasicMaterial,
  Object3D,
  type Group,
  type InstancedMesh,
  type MeshStandardMaterial,
} from "three";
import { eyeGrids, ledsFor, type ExpressionName, type Leds } from "./expressions.ts";
import { tilt } from "./tilt.ts";
import { SHELLS, type ShellName } from "./shells.ts";

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

  return <instancedMesh ref={mesh} args={[pixelGeometry, pixelMaterial, MAX_PIXELS]} />;
}

// Target bloom luminance for every LED, so blue glows as strongly as green.
const LED_GLOW = 2;
const scratch = new Color();

function luminance(c: Color) {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
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

function Led({ x, index, leds, on }: { x: number; index: number; leds: Leds; on: boolean }) {
  const material = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!material.current) return;
    const t = clock.elapsedTime;
    if (leds.mode === "rainbow") {
      scratch.setHSL((t * leds.speed + index / 3) % 1, 1, 0.5);
    } else {
      scratch.set(leds.colors[index]);
    }
    const level = on ? ledLevel(leds, t, index) : 0;
    material.current.emissive.copy(scratch);
    material.current.emissiveIntensity = Math.min(14, LED_GLOW / luminance(scratch)) * level;
  });

  return (
    <group position={[x, 6.2, FRONT]}>
      {/* Bezel: the original black slot */}
      <mesh position-z={0.01}>
        <boxGeometry args={[1.75, 1.75, 0.1]} />
        <meshStandardMaterial color={INK} roughness={0.4} />
      </mesh>
      {/* Lens */}
      <mesh position-z={0.08}>
        <boxGeometry args={[1.1, 1.1, 0.06]} />
        <meshStandardMaterial ref={material} color={INK} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}

type BotProps = {
  expression: ExpressionName;
  shell: ShellName;
  /** LEDs stay dark until switched on. */
  leds: boolean;
  /** Look toward the pointer (or the phone's tilt). Off eases back to center. */
  follow: boolean;
  onClick?: () => void;
};

export function Bot({ expression, shell, leds, follow, onClick }: BotProps) {
  const BODY = SHELLS[shell].body;
  const body = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  // Smoothed look direction, before snapping.
  const look = useRef({ x: 0, y: 0 });
  const [left, right] = eyeGrids(expression);

  // Squash the eyes shut on every expression change, then let them pop open.
  useEffect(() => {
    if (eyes.current) eyes.current.scale.y = 0.05;
  }, [expression]);

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
    body.current.rotation.y = MathUtils.damp(body.current.rotation.y, target.x * TURN_Y, 3, delta);
    body.current.rotation.x = MathUtils.damp(body.current.rotation.x, -target.y * TURN_X, 3, delta);
  });

  return (
    <group
      ref={body}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {/* Main body (x 1741–1899, y 657–815) */}
      <RoundedBox args={[15.8, 15.8, DEPTH]} radius={0.25} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.1} />
      </RoundedBox>

      {/* Side ears (x 1731–1908, y 666–806) */}
      <RoundedBox args={[17.7, 14, DEPTH - 1]} radius={0.25} smoothness={4} castShadow>
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.1} />
      </RoundedBox>

      {/* Vent slots on the right side */}
      {VENTS.map((z) => (
        <mesh key={z} position={[EAR_HX + 0.005, 0, z]}>
          <boxGeometry args={[0.04, 6.7, 0.3]} />
          <meshStandardMaterial color={INK} roughness={0.9} />
        </mesh>
      ))}

      {/* Screen (x 1749–1891, y 701–799) */}
      <mesh position={[0, -1.4, FRONT + 0.01]}>
        <boxGeometry args={[14.2, 9.8, 0.1]} />
        {/* Unfogged, so the face keeps full contrast against the eyes. */}
        <meshPhysicalMaterial
          color={INK}
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
      {SLOTS.map((x, i) => (
        <Led key={x} x={x} index={i} leds={ledsFor(expression)} on={leds} />
      ))}
    </group>
  );
}
