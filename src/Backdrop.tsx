import { useEffect, useMemo } from "react";
import { Grid, Sparkles, Stars } from "@react-three/drei";
import { CanvasTexture, Color, SRGBColorSpace } from "three";
import { backgroundFor, type BackgroundName, type Theme } from "./backgrounds.ts";

// Backgrounds live inside the WebGL scene rather than in CSS: the bloom pass
// only draws glow over pixels the canvas renders, so a transparent canvas over
// a CSS background would lose the LED glow.

function GradientBackground({ stops, radial }: { stops: string[]; radial: boolean }) {
  const texture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = radial
      ? ctx.createRadialGradient(size / 2, size * 0.45, 0, size / 2, size / 2, size * 0.75)
      : ctx.createLinearGradient(0, 0, 0, size);
    stops.forEach((color, i) => gradient.addColorStop(i / (stops.length - 1), color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [stops, radial]);

  useEffect(() => () => texture.dispose(), [texture]);

  return <primitive attach="background" object={texture} />;
}

export function Backdrop({ name, theme }: { name: BackgroundName; theme: Theme }) {
  const bg = backgroundFor(name);
  const { base, stops } = bg[theme];
  const color = useMemo(() => new Color(base), [base]);

  switch (bg.kind) {
    case "radial":
    case "linear":
      return <GradientBackground stops={stops} radial={bg.kind === "radial"} />;
    case "grid":
      return (
        <>
          <color attach="background" args={[color]} />
          <Grid
            position={[0, -11.01, 0]}
            infiniteGrid
            cellSize={2}
            sectionSize={10}
            cellColor={stops[0]}
            sectionColor={stops[1]}
            fadeFrom={0}
            fadeDistance={60}
            fadeStrength={1.5}
          />
        </>
      );
    case "sparkles":
      return (
        <>
          <color attach="background" args={[color]} />
          {theme === "dark" && <Stars radius={80} depth={40} count={1500} factor={3} fade />}
          <Sparkles count={70} scale={[44, 30, 24]} size={4} speed={0.3} color={stops[0]} />
        </>
      );
    default:
      return <color attach="background" args={[color]} />;
  }
}
