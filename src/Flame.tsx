import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { fireLight } from "./fire-light.ts";
import { BoxGeometry, ShaderMaterial, Vector3, type Box3, type Mesh } from "three";

export type FlameKind = "candle" | "campfire";

// Room around the costume's flame outline for the flame to sway and leap into,
// as multiples of the outline's width and height. Depth is the flame's own
// depth front to back, as a share of its width.
const ROOM: Record<FlameKind, { width: number; above: number; below: number; depth: number }> = {
  candle: { width: 2.2, above: 0.35, below: 0.1, depth: 1 },
  campfire: { width: 1.5, above: 0.8, below: 0.05, depth: 0.7 },
};
// Brightness of the light each kind throws on the bot, at full size.
const LIGHT: Record<FlameKind, number> = { candle: 14, campfire: 22 };
// Brightness of the flame itself. A campfire is deep enough to blow out to white.
const GAIN: Record<FlameKind, number> = { candle: 1.6, campfire: 1.2 };

const at = new Vector3();
const scale = new Vector3();

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const vertexShader = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Raymarches a volume of fire inside the box: each pixel walks its view ray
// through the box, adding up the light the fire gives off along the way.
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform int uKind;
  uniform float uGain;
  // Camera and the box's bounds, in the box's own space.
  uniform vec3 uCam;
  uniform vec3 uMin;
  uniform vec3 uMax;
  // The costume's flame outline: center of its base, and half width, height, half depth.
  uniform vec3 uOrigin;
  uniform vec3 uSize;
  varying vec3 vPos;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1, 0)), u.x),
      mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x),
      u.y
    );
  }

  // Black-body ramp from a dull red edge to a white-hot core, in linear light.
  // Past 1, so the core blooms like the eyes do.
  vec3 heat(float k) {
    vec3 c = mix(vec3(0.55, 0.06, 0.01), vec3(1.25, 0.32, 0.04), smoothstep(0.0, 0.3, k));
    c = mix(c, vec3(1.8, 0.85, 0.16), smoothstep(0.25, 0.6, k));
    return mix(c, vec3(2.6, 2.1, 1.25), smoothstep(0.6, 0.95, k));
  }

  // How far into a teardrop flame p is: 0 at its skin, 1 on its axis. p is
  // in the flame's own units: x and z -1 to 1 across its bulb, y 0 to 1 up it.
  // It leans by lean (x, z) toward the tip and ripples by ripple.
  float teardrop(vec3 p, vec2 lean, vec2 ripple, float bulb) {
    float s = clamp(p.y, 0.0, 1.0);
    vec2 xz = p.xz - lean * s * s - ripple * s;
    float w = p.y < bulb
      ? sqrt(max(0.0, 1.0 - pow((bulb - p.y) / bulb, 2.0)))
      : pow(max(0.0, 1.0 - (p.y - bulb) / (1.0 - bulb)), 1.25);
    return w > 0.01 ? clamp(1.0 - length(xz) / w, 0.0, 1.0) : 0.0;
  }

  // The flames' shapes this frame, the same for every sample: where each
  // stands (x, z), its height and width, and its lean.
  const int TONGUES = 7;
  vec4 tongues[TONGUES];
  vec2 leans[TONGUES];

  // Density of fire at q (x and z -1 to 1 across the outline, y 0 at its base
  // to 1 at its top); its color comes back in color.
  float candle(vec3 q, out vec3 color) {
    float t = uTime;
    vec4 shape = tongues[0];
    vec3 p = vec3(q.x, q.y / shape.z, q.z);
    // Quick ripples running up it, on top of the slow lean.
    vec2 ripple = vec2(
      noise(vec2(q.y * 5.0 - t * 7.0, uSeed + 3.0)),
      noise(vec2(q.y * 5.0 - t * 6.3, uSeed + 5.0))
    ) - 0.5;
    float bulb = 0.3;
    float k = teardrop(p, leans[0], ripple * 0.18, bulb);
    color = heat(k * mix(0.9, 1.1, smoothstep(0.1, 0.5, p.y)));
    // Cooler, see-through blue at the base, and a dark zone hugging the wick.
    float base = smoothstep(bulb * 0.95, 0.0, p.y);
    color = mix(color, vec3(0.1, 0.22, 1.2), base * smoothstep(0.65, 0.1, k));
    color *= 1.0 - 0.55 * base * smoothstep(0.45, 0.9, k);
    return smoothstep(0.0, 0.25, k) * mix(1.0, 0.45, base);
  }

  // A cluster of tongues licking up from a bed of embers over the logs.
  float campfire(vec3 q, out vec3 color) {
    float t = uTime;
    // The ember bed: a low, glowing mound.
    float k = 0.75 * clamp(1.0 - length(vec3(q.x / 0.95, (q.y - 0.02) / 0.16, q.z / 0.95)), 0.0, 1.0);
    for (int i = 0; i < TONGUES; i++) {
      vec4 shape = tongues[i];
      vec3 p = vec3((q.x - shape.x) / shape.w, q.y / shape.z, (q.z - shape.y) / shape.w);
      if (p.y > 1.0 || abs(p.x) > 1.6 || abs(p.z) > 1.6) continue;
      float f = float(i);
      vec2 ripple = vec2(
        noise(vec2(p.y * 4.0 - t * 8.0, f * 7.3 + uSeed)),
        noise(vec2(p.y * 4.0 - t * 7.1, f * 5.1 + uSeed + 2.0))
      ) - 0.5;
      k = max(k, teardrop(p, leans[i], ripple * 0.45, 0.25));
    }
    color = heat(k);
    return smoothstep(0.0, 0.2, k);
  }

  void main() {
    float t = uTime;
    if (uKind == 0) {
      tongues[0] = vec4(0.0, 0.0, 0.9 + 0.1 * noise(vec2(t * 6.0, uSeed + 7.0)), 1.0);
      leans[0] = (vec2(noise(vec2(t * 0.7, uSeed)), noise(vec2(t * 0.6, uSeed + 11.0))) - 0.5)
        * vec2(0.7, 0.5);
    } else {
      for (int i = 0; i < TONGUES; i++) {
        float f = float(i);
        // One tall flame in the middle, the rest around it, spaced by the golden angle.
        float angle = f * 2.39996 + uSeed;
        float ring = i == 0 ? 0.0 : 0.38 + 0.2 * hash(vec2(f, 1.0));
        // Each licks up and dies back on its own beat.
        float lick = noise(vec2(t * 2.4 + f * 3.7, f * 9.1));
        float tall = (i == 0 ? 1.25 : 0.55 + 0.4 * hash(vec2(f, 2.0))) * (0.6 + 0.6 * lick);
        tongues[i] = vec4(ring * cos(angle), ring * sin(angle), tall, i == 0 ? 0.5 : 0.36);
        leans[i] = (vec2(noise(vec2(t * 1.1, f * 3.3)), noise(vec2(t * 0.9, f * 4.7 + 5.0))) - 0.5)
          * 0.9;
      }
    }

    // From where the ray enters the box to where it leaves.
    vec3 dir = normalize(vPos - uCam);
    vec3 a = (uMin - vPos) / dir;
    vec3 b = (uMax - vPos) / dir;
    vec3 far3 = max(a, b);
    float far = min(min(far3.x, far3.y), far3.z);

    const int STEPS = 40;
    float dt = far / float(STEPS);
    // A random start per pixel trades banding for fine grain.
    float jitter = hash(vec3(gl_FragCoord.xy, t));
    vec3 light = vec3(0.0);
    float amount = 0.0;
    for (int i = 0; i < STEPS; i++) {
      vec3 p = vPos + dir * (float(i) + jitter) * dt;
      vec3 q = (p - uOrigin) / uSize;
      vec3 color;
      float density = uKind == 0 ? candle(q, color) : campfire(q, color);
      // Measured in half widths of the outline, so it's the same at any size.
      float d = density * dt / uSize.x;
      light += color * d;
      amount += d;
      if (amount > 3.0) break;
    }
    float alpha = 1.0 - exp(-2.5 * amount);
    if (alpha < 0.004) discard;
    // Fire gives off light more than it blocks it: the core shows through.
    gl_FragColor = vec4(uGain * light / max(alpha, 1e-3), alpha);
  }
`;

/**
 * A live, three-dimensional flame filling a costume's flame outline: a volume
 * of rising, flickering fire raymarched inside a box. `box` is the outline,
 * base at the bottom; the flame is as deep as it is wide.
 */
export function Flame({ kind, box, seed = 0 }: { kind: FlameKind; box: Box3; seed?: number }) {
  const mesh = useRef<Mesh>(null);

  const { geometry, material, center } = useMemo(() => {
    const room = ROOM[kind];
    const w = box.max.x - box.min.x;
    const h = box.max.y - box.min.y;
    const cx = (box.min.x + box.max.x) / 2;
    const width = w * room.width;
    const depth = width * room.depth;
    const bottom = box.min.y - h * room.below;
    const height = h * (1 + room.above + room.below);
    const geometry = new BoxGeometry(width, height, depth).translate(cx, bottom + height / 2, 0);
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 1.7 },
        uSeed: { value: seed * 13.7 },
        uKind: { value: kind === "candle" ? 0 : 1 },
        uGain: { value: GAIN[kind] },
        uCam: { value: new Vector3() },
        uMin: { value: new Vector3(cx - width / 2, bottom, -depth / 2) },
        uMax: {
          value: new Vector3(cx + width / 2, bottom + height, depth / 2),
        },
        uOrigin: { value: new Vector3(cx, box.min.y, 0) },
        uSize: { value: new Vector3(w / 2, h, (w / 2) * room.depth) },
      },
      transparent: true,
      depthWrite: false,
    });
    return {
      geometry,
      material,
      center: new Vector3(cx, (box.min.y + box.max.y) / 2, 0),
    };
  }, [kind, box, seed]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      fireLight.intensity = 0;
    },
    [geometry, material],
  );

  useFrame(({ clock, camera }) => {
    const flame = mesh.current;
    const parent = fireLight.parent;
    if (!flame || !parent) return;
    // Blown out: nothing to draw, and no space left to march through.
    const size = flame.getWorldScale(scale).y;
    flame.visible = size > 0.01;
    const t = reducedMotion ? 1.7 : clock.elapsedTime;
    const uniforms = (flame.material as ShaderMaterial).uniforms;
    uniforms.uTime.value = t;
    if (flame.visible) flame.worldToLocal(uniforms.uCam.value.copy(camera.position));
    // The light sits in the flame and dims with it as it's blown out or put on.
    parent.worldToLocal(flame.localToWorld(at.copy(center)));
    fireLight.position.copy(at);
    const flicker = reducedMotion
      ? 1
      : 1 + 0.12 * Math.sin(t * 13.1) + 0.08 * Math.sin(t * 23.7 + 1.3) + 0.06 * Math.sin(t * 7.3);
    fireLight.intensity = LIGHT[kind] * size * flicker;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} raycast={() => null} />;
}
