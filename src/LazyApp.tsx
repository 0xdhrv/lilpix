import { lazy } from "react";

// The scene (three.js and friends) loads after the small render-blocking entry,
// so first paint does not wait for it.
export const LazyApp = lazy(() => import("./App.tsx"));
