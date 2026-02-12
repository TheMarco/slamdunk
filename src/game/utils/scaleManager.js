// iOS-safe resolution: cap at 2x to prevent GPU meltdown on iPhone Pro (3x)
export const PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, 2);

export function scale(value) {
  return value * PIXEL_RATIO;
}

export function getDisplaySize(scene) {
  return {
    width: scene.scale.width / PIXEL_RATIO,
    height: scene.scale.height / PIXEL_RATIO,
  };
}

export function getDisplayCenter(scene) {
  const display = getDisplaySize(scene);
  return {
    x: scene.scale.width / 2,
    y: scene.scale.height / 2,
    displayWidth: display.width,
    displayHeight: display.height,
  };
}
