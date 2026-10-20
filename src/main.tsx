import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./sweep.ts";

// The scene (three.js and friends) loads after the small render-blocking entry,
// so first paint does not wait for it.
const App = lazy(() => import("./App.tsx"));

// Dev-only feedback toolbar; the DEV check lets the bundler drop it from production.
const Agentation = import.meta.env.DEV
  ? lazy(() => import("agentation").then((m) => ({ default: m.Agentation })))
  : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
    {Agentation && (
      <Suspense fallback={null}>
        <Agentation />
      </Suspense>
    )}
  </StrictMode>,
);
