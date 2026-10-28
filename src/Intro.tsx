import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3, type Group } from "three";

// Same direction CameraFit looks from, so the bot flies straight down the
// line of sight: from far behind the scene, past its resting spot towards the
// screen, then back.
const VIEW = new Vector3(16, 9, 44).normalize();
/** How far behind the resting spot the bot starts, in world units. */
const START = 140;
/** How far past the resting spot, towards the screen, the bot comes. */
const PEAK = 0;
/** Seconds to fly in to the peak, then to ease back to rest. */
const IN = 0.8;
const BACK = 0.9;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Plays the bot's entrance. Mounts only after everything in the Canvas has
 * loaded (assets suspend), so it starts with the first real frame.
 */
export function Intro({ skip, children }: { skip: boolean; children: ReactNode }) {
  const group = useRef<Group>(null);
  const elapsed = useRef(skip ? IN + BACK : 0);

  useFrame((_, delta) => {
    if (!group.current || elapsed.current >= IN + BACK) return;
    // Clamp long frames so a hitch on load doesn't skip the flight.
    elapsed.current += Math.min(delta, 0.05);
    const t = elapsed.current;
    const distance =
      t < IN
        ? MathUtils.lerp(-START, PEAK, easeOut(t / IN))
        : MathUtils.lerp(PEAK, 0, easeInOut(Math.min((t - IN) / BACK, 1)));
    group.current.position.copy(VIEW).multiplyScalar(distance);
    // Half a turn from showing its back to facing front, done by the peak.
    group.current.rotation.y = Math.PI * (1 - easeOut(Math.min(t / IN, 1)));
  });

  return <group ref={group}>{children}</group>;
}
