import { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
} from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Backdrop } from "./Backdrop.tsx";
import {
  BACKGROUND_NAMES,
  backgroundFor,
  bgValue,
  type BackgroundName,
  type Theme,
} from "./backgrounds.ts";
import { SHELL_NAMES, shellValue, type ShellName } from "./shells.ts";
import { Bot } from "./Bot.tsx";
import { CameraFit } from "./CameraFit.tsx";
import { Intro } from "./Intro.tsx";
import { SceneFog } from "./SceneFog.tsx";
import { CommandMenu } from "./CommandMenu.tsx";
import { EXPRESSION_NAMES, type ExpressionName } from "./expressions.ts";
import { usePersistent, useMediaQuery } from "./hooks.ts";
import {
  CommandIcon,
  InfoIcon,
  LedOffIcon,
  LedOnIcon,
  MoonIcon,
  SoundOffIcon,
  SoundOnIcon,
  SunIcon,
} from "./icons.tsx";
import { playExpression } from "./sounds.ts";
import { enableTilt, tiltNeedsPermission } from "./tilt.ts";

const hasWebGL = (() => {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    // Release the probe's context right away; browsers cap how many stay live.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
})();

const MAX_DPR = Math.min(devicePixelRatio, 1.75);

// Steps the render resolution down while frames drop and back up once there's
// headroom. Goes straight to the renderer, so the React tree doesn't re-render.
function AdaptiveResolution() {
  const setDpr = useThree((s) => s.setDpr);
  return (
    <PerformanceMonitor
      factor={1}
      onChange={({ factor }) => setDpr(Math.round((1 + (MAX_DPR - 1) * factor) * 4) / 4)}
    />
  );
}

const isExpression = (value: string): value is ExpressionName =>
  EXPRESSION_NAMES.includes(value as ExpressionName);

const isBackground = (value: unknown): value is BackgroundName =>
  BACKGROUND_NAMES.includes(value as BackgroundName);

const isShell = (value: unknown): value is ShellName => SHELL_NAMES.includes(value as ShellName);

const shellFromValue = (value: string) =>
  SHELL_NAMES.find((name) => shellValue(name) === value) ?? null;

const isTheme = (value: unknown): value is Theme => value === "light" || value === "dark";

const backgroundFromValue = (value: string) =>
  BACKGROUND_NAMES.find((name) => bgValue(name) === value) ?? null;

export default function App() {
  const [expression, setExpression] = useState<ExpressionName>("neutral");
  const [background, setBackground] = usePersistent<BackgroundName>(
    "lilpix:background",
    () => "studio",
    isBackground,
  );
  const [shell, setShell] = usePersistent<ShellName>("lilpix:shell", () => "graphite", isShell);
  const [theme, setTheme] = usePersistent<Theme>(
    "lilpix:theme",
    () => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    isTheme,
  );
  const [sound, setSound] = usePersistent("lilpix:sound", () => true);
  const [leds, setLeds] = usePersistent("lilpix:leds", () => false);
  const [follow, setFollow] = usePersistent("lilpix:follow", () => true);
  const [fog, setFog] = usePersistent("lilpix:fog", () => false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Item highlighted in the open menu; expressions and backgrounds preview live.
  const [highlighted, setHighlighted] = useState<string | null>(null);
  // Touch devices get the drawer and a visible trigger at any width; ⌘K needs a keyboard.
  const mobile = useMediaQuery("(max-width: 640px), (pointer: coarse)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const previewExpression = highlighted && isExpression(highlighted) ? highlighted : null;
  const previewShell = highlighted ? shellFromValue(highlighted) : null;
  const previewBackground = highlighted ? backgroundFromValue(highlighted) : null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Phones look around with the gyroscope. iOS only allows asking for sensor
  // access from a user gesture, so wait for the first tap there.
  useEffect(() => {
    if (!mobile) return;
    if (!tiltNeedsPermission()) {
      void enableTilt();
      return;
    }
    const onFirstTap = () => void enableTilt();
    window.addEventListener("pointerdown", onFirstTap, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstTap);
  }, [mobile]);

  const choose = (name: ExpressionName) => {
    setExpression(name);
    if (sound) playExpression(name);
  };

  const cycle = () =>
    choose(EXPRESSION_NAMES[(EXPRESSION_NAMES.indexOf(expression) + 1) % EXPRESSION_NAMES.length]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const toggleLeds = () => setLeds((on) => !on);
  const toggleFollow = () => setFollow((on) => !on);
  const toggleFog = () => setFog((on) => !on);

  const toggleSound = () => {
    if (!sound) playExpression("neutral");
    setSound(!sound);
  };

  const setOpen = (open: boolean) => {
    setMenuOpen(open);
    setHighlighted(null);
  };

  // ⌘K toggles the menu; number keys 1–9 pick an expression directly.
  // Re-subscribes every render so the handler always sees current state.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!menuOpen);
        return;
      }
      if (menuOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const name = EXPRESSION_NAMES[Number(e.key) - 1];
      if (name) choose(name);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const dark = theme === "dark";

  if (!hasWebGL) {
    return (
      <p className="fallback">
        lilpix needs WebGL to draw its 3D robot, and this browser has it turned off or does not
        support it.
      </p>
    );
  }

  return (
    <>
      {/* The scene is all canvas, so give crawlers and screen readers a heading. */}
      <h1 className="sr-only">lilpix, a tiny 3D robot with a pixel face</h1>
      <p className="sr-only">
        Click the bot to cycle its expressions, or press ⌘K for the command menu.
      </p>
      <Canvas
        shadows="percentage"
        dpr={[1, MAX_DPR]}
        // The effect composer does its own multisampling, so skip it on the canvas.
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: 35 }}
      >
        <AdaptiveResolution />
        <CameraFit />
        <Backdrop name={previewBackground ?? background} theme={theme} />
        {fog && (
          <SceneFog
            color={backgroundFor(previewBackground ?? background)[theme].base}
            theme={theme}
          />
        )}
        <ambientLight intensity={dark ? 0.15 : 0.25} />
        <directionalLight
          position={[10, 18, 14]}
          intensity={dark ? 1 : 1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
          shadow-radius={12}
          shadow-bias={-0.0005}
        />
        <Environment resolution={256}>
          <Lightformer intensity={2} position={[0, 5, -9]} scale={[10, 10, 1]} />
          <Lightformer
            intensity={1.5}
            position={[-5, 1, -1]}
            rotation-y={Math.PI / 2}
            scale={[50, 2, 1]}
          />
          <Lightformer
            intensity={1.5}
            position={[10, 1, 0]}
            rotation-y={-Math.PI / 2}
            scale={[50, 2, 1]}
          />
        </Environment>

        <Intro skip={reducedMotion}>
          <Float
            speed={2}
            rotationIntensity={reducedMotion ? 0 : 0.25}
            floatIntensity={reducedMotion ? 0 : 0.8}
          >
            <Bot
              expression={previewExpression ?? expression}
              shell={previewShell ?? shell}
              leds={leds}
              follow={follow}
              onClick={cycle}
            />
          </Float>
        </Intro>

        {/* Shadow catcher: only the shadow is drawn, so there's no visible floor edge. */}
        <mesh position={[0, -11, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <shadowMaterial transparent opacity={dark ? 0.5 : 0.18} />
        </mesh>
        {/* Only the LEDs are pushed past the threshold, so only they glow.
            Glow reads weaker on light backgrounds, so push it harder there. */}
        <EffectComposer multisampling={4}>
          <Bloom
            mipmapBlur
            luminanceThreshold={1}
            luminanceSmoothing={0}
            intensity={dark ? 1.4 : 2}
            radius={0.7}
          />
        </EffectComposer>

        <OrbitControls enablePan={false} minDistance={20} maxDistance={160} />
      </Canvas>

      <div className="toolbar">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
        <button type="button" onClick={toggleSound} aria-label="Sound" aria-pressed={sound}>
          {sound ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
        <button type="button" onClick={toggleLeds} aria-label="LEDs" aria-pressed={leds}>
          {leds ? <LedOnIcon /> : <LedOffIcon />}
        </button>
        <a href="/about/" aria-label="About lilpix">
          <InfoIcon />
        </a>
      </div>

      {mobile && (
        <button
          type="button"
          className="menu-trigger"
          onClick={() => setOpen(true)}
          aria-label="Open command menu"
        >
          <CommandIcon />
        </button>
      )}

      <CommandMenu
        open={menuOpen}
        onOpenChange={setOpen}
        touch={mobile}
        highlighted={highlighted ?? expression}
        onHighlight={setHighlighted}
        expression={expression}
        background={background}
        shell={shell}
        theme={theme}
        sound={sound}
        leds={leds}
        follow={follow}
        fog={fog}
        onExpression={(name) => {
          choose(name);
          setOpen(false);
        }}
        onBackground={(name) => {
          setBackground(name);
          setOpen(false);
        }}
        onShell={(name) => {
          setShell(name);
          setOpen(false);
        }}
        // Toggles keep the menu open so the change is visible right away.
        onToggleTheme={toggleTheme}
        onToggleSound={toggleSound}
        onToggleLeds={toggleLeds}
        onToggleFollow={toggleFollow}
        onToggleFog={toggleFog}
      />
    </>
  );
}
