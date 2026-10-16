import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";

// Area that must stay in view around the bot, in world units. Generous on
// purpose so the bot loads zoomed out with room around it on any aspect ratio.
const FIT_WIDTH = 42;
const FIT_HEIGHT = 38;
/** Direction the camera looks at the bot from: front, a little right and above. */
const VIEW = new Vector3(16, 9, 44).normalize();

/**
 * Places the camera so the bot fits the viewport, on load and whenever the
 * viewport resizes (rotating a phone, resizing a window). Zooming in or out
 * with the controls afterwards is left alone until the next resize.
 */
export function CameraFit() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = width / height;
    const halfV = MathUtils.degToRad(camera.fov) / 2;
    const halfH = Math.atan(Math.tan(halfV) * aspect);
    const distance = Math.max(FIT_HEIGHT / 2 / Math.tan(halfV), FIT_WIDTH / 2 / Math.tan(halfH));
    camera.position.copy(VIEW).multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);

  return null;
}
