import { createShader, playSweep, type Direction } from "glimm";

// Page transition between the app and the about page: a glimm band sweeps
// across the screen, the old page held ahead of it and the new one revealed
// behind it. glimm's own provider does this for same-document navigation;
// these are two separate HTML pages, so this drives the same masking with a
// cross-document View Transition instead. Browsers without one (or with
// reduced motion) navigate normally.
//
// Must run before first render on both pages, so the importing entry script
// carries blocking="render". Keep that entry small; main.tsx lazy-loads the scene.

const ATTR = "data-sweep";
const LAYER = "glimm-layer";

const style = document.createElement("style");
style.textContent = `
  @media (prefers-reduced-motion: no-preference) {
    @view-transition { navigation: auto; }
  }
  html[${ATTR}] * { view-transition-name: none !important; }
  html[${ATTR}] .sweep-layer { view-transition-name: ${LAYER} !important; }
  @keyframes sweep-hold { from { opacity: 1 } to { opacity: 1 } }
  html[${ATTR}]::view-transition-group(*) { animation: sweep-hold 86400s linear both; }
  html[${ATTR}]::view-transition-image-pair(*) { isolation: auto; }
  html[${ATTR}]::view-transition-old(*),
  html[${ATTR}]::view-transition-new(*) { animation: none; mix-blend-mode: normal; opacity: 1; }
  html[${ATTR}]::view-transition-old(root) { z-index: 2; clip-path: var(--sweep-clip, inset(0)); }
  html[${ATTR}]::view-transition-new(root) { z-index: 1; }
  html[${ATTR}]::view-transition-group(${LAYER}) { z-index: 2147483647; }
  .sweep-layer { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; }
`;
document.head.append(style);

// Keep named elements out of the outgoing snapshot so the whole page moves
// as one image.
addEventListener("pageswap", (event) => {
  if (event.viewTransition) document.documentElement.setAttribute(ATTR, "");
});

addEventListener("pagereveal", (event) => {
  const transition = event.viewTransition;
  if (!transition) return;

  const root = document.documentElement;
  const canvas = document.createElement("canvas");
  canvas.className = "sweep-layer";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const ctrl = createShader({ canvas });
  if (!ctrl) {
    canvas.remove();
    transition.skipTransition();
    return;
  }

  // Going back sweeps the other way.
  const back = navigation.activation?.navigationType === "traverse";
  const direction: Direction = back ? "rtl" : "ltr";
  const setClip = (p: number) => {
    const edge = Math.max(0, Math.min(100, (-0.2 + p * 1.4) * 100));
    root.style.setProperty(
      "--sweep-clip",
      direction === "ltr" ? `inset(0 0 0 ${edge}%)` : `inset(0 ${edge}% 0 0)`,
    );
  };
  setClip(0);
  root.setAttribute(ATTR, "");

  const cleanup = () => {
    ctrl.destroy();
    canvas.remove();
    root.removeAttribute(ATTR);
    root.style.removeProperty("--sweep-clip");
  };

  transition.ready.then(async () => {
    const sweep = playSweep(
      {
        ...ctrl,
        setProgress: (p) => {
          setClip(p);
          ctrl.setProgress(p);
        },
      },
      {
        palette: "prism",
        direction,
        sweepMs: 550,
        brightness: root.dataset.theme === "dark" ? 0.85 : 1,
      },
    );
    await sweep.done;
    transition.skipTransition();
    await transition.finished.catch(() => {});
    cleanup();
  }, cleanup);
});
