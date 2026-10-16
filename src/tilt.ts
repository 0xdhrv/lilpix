// Device-orientation "look" input for phones. Bot reads this every frame
// instead of the pointer once a sensor reading has arrived.

/** Degrees of tilt that map to a full look (-1…1) in each direction. */
const RANGE = 25;
/** How quickly the neutral pose follows the way the phone is held. */
const RECENTER = 0.01;

export const tilt = { x: 0, y: 0, active: false };

let baseBeta: number | null = null;
let baseGamma: number | null = null;
let listening = false;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta === null || e.gamma === null) return;
  baseBeta ??= e.beta;
  baseGamma ??= e.gamma;
  // Drift the neutral pose toward the current one, so the bot looks straight
  // ahead however the phone is held after a moment.
  baseBeta += (e.beta - baseBeta) * RECENTER;
  baseGamma += (e.gamma - baseGamma) * RECENTER;
  tilt.x = clamp((e.gamma - baseGamma) / RANGE);
  tilt.y = clamp((e.beta - baseBeta) / RANGE);
  tilt.active = true;
}

type PermissionRequest = { requestPermission?: () => Promise<"granted" | "denied"> };

/** True when the browser needs a user gesture before sending sensor data (iOS). */
export const tiltNeedsPermission = () =>
  typeof (DeviceOrientationEvent as unknown as PermissionRequest).requestPermission === "function";

/** Start listening. On iOS, call from a user gesture so the permission prompt can show. */
export async function enableTilt() {
  if (listening || typeof DeviceOrientationEvent === "undefined") return;
  const api = DeviceOrientationEvent as unknown as PermissionRequest;
  // Called as a method: iOS rejects it when detached from DeviceOrientationEvent.
  if (api.requestPermission && (await api.requestPermission()) !== "granted") return;
  listening = true;
  window.addEventListener("deviceorientation", onOrientation);
}
