import { PointLight } from "three";

/**
 * Warm light cast by a costume's fire. The bot keeps it in its scene at all
 * times, dark unless a flame is lit, so putting a fire on doesn't make every
 * material recompile for the extra light.
 */
export const fireLight = new PointLight("#ff8a3a", 0, 0, 2);
