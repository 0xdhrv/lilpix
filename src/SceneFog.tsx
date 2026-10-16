import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Fog } from "three";
import type { Theme } from "./backgrounds.ts";

// Fog distances scale with how far the camera is from the bot, which changes
// with the viewport (CameraFit) and with zooming, so the haze looks the same
// on a phone and a wide desktop window. Light fog washes dark surfaces out
// much faster than dark fog does, so it starts later and thins out more.
const RANGE: Record<Theme, { near: number; far: number }> = {
  light: { near: 0.85, far: 2.6 },
  dark: { near: 0.6, far: 1.9 },
};

export function SceneFog({ color, theme }: { color: string; theme: Theme }) {
  const fog = useRef<Fog>(null);

  useFrame(({ camera }) => {
    if (!fog.current) return;
    const distance = camera.position.length();
    fog.current.near = distance * RANGE[theme].near;
    fog.current.far = distance * RANGE[theme].far;
  });

  return <fog ref={fog} attach="fog" args={[color, 40, 120]} />;
}
