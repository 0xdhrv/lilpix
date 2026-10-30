import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./sweep.ts";
import { LazyApp } from "./LazyApp.tsx";

// react-three-fiber 9 still builds a THREE.Clock, which three now warns about on
// every canvas. Nothing here can change that, so drop just that line.
const warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].startsWith("THREE.Clock:")) return;
  warn(...args);
};

// Dev-only feedback toolbar; the DEV check lets the bundler drop it from production.
const Agentation = import.meta.env.DEV
  ? lazy(() => import("agentation").then((m) => ({ default: m.Agentation })))
  : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <LazyApp />
    </Suspense>
    {Agentation && (
      <Suspense fallback={null}>
        <Agentation />
      </Suspense>
    )}
  </StrictMode>,
);
