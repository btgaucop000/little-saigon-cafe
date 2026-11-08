import type { Point } from './sceneLayout';

// Horizontal-pan camera. The scene always fits the viewport height (no distortion);
// wider viewports simply see more of the world. `x` is the world x at the left screen edge.

export interface Camera {
  x: number;
  scale: number;
  viewWidth: number;
  viewHeight: number;
  worldWidth: number;
  worldHeight: number;
}

export function createCamera(
  world: { width: number; height: number },
  viewWidth: number,
  viewHeight: number,
  centerX: number,
): Camera {
  const base: Camera = { x: 0, scale: 1, viewWidth: 0, viewHeight: 0, worldWidth: world.width, worldHeight: world.height };
  return resizeCamera({ ...base, x: centerX }, viewWidth, viewHeight, centerX);
}

/** Visible world width at the current scale. */
export function visibleWorldWidth(cam: Camera): number {
  return cam.viewWidth / cam.scale;
}

export function clampCameraX(cam: Camera, x: number): number {
  const visible = visibleWorldWidth(cam);
  if (visible >= cam.worldWidth) return (cam.worldWidth - visible) / 2; // center a world narrower than the view
  return Math.min(Math.max(x, 0), cam.worldWidth - visible);
}

/** Recomputes scale for a new viewport while keeping the given world x (default: current center) centered. */
export function resizeCamera(cam: Camera, viewWidth: number, viewHeight: number, centerX?: number): Camera {
  const center = centerX ?? cam.x + visibleWorldWidth(cam) / 2;
  const scale = viewHeight > 0 ? viewHeight / cam.worldHeight : 1;
  const next: Camera = { ...cam, viewWidth, viewHeight, scale };
  return { ...next, x: clampCameraX(next, center - visibleWorldWidth(next) / 2) };
}

/** Pans by a screen-space drag delta (dragging right reveals content on the left). */
export function panCamera(cam: Camera, screenDx: number): Camera {
  return { ...cam, x: clampCameraX(cam, cam.x - screenDx / cam.scale) };
}

export function screenToWorld(cam: Camera, p: Point): Point {
  return { x: p.x / cam.scale + cam.x, y: p.y / cam.scale };
}

export function worldToScreen(cam: Camera, p: Point): Point {
  return { x: (p.x - cam.x) * cam.scale, y: p.y * cam.scale };
}

/**
 * Dead-zone framing: the smallest camera x that keeps the world span [minX, maxX] inside the
 * view inset by `marginPx` screen pixels on each side. Returns the current x when the span is
 * already inside (so the camera stays still), and centers a span wider than the safe zone.
 * Always clamped to the world edges.
 */
export function revealX(cam: Camera, minX: number, maxX: number, marginPx: number): number {
  const visible = visibleWorldWidth(cam);
  const margin = Math.min(marginPx / cam.scale, visible / 4);
  const safeLeft = cam.x + margin;
  const safeRight = cam.x + visible - margin;
  let x = cam.x;
  if (maxX - minX > safeRight - safeLeft) x = (minX + maxX) / 2 - visible / 2;
  else if (minX < safeLeft) x = minX - margin;
  else if (maxX > safeRight) x = maxX - visible + margin;
  return clampCameraX(cam, x);
}

/** Ease-out cubic shared by the avatar walk and the camera, so both move in lockstep. */
export function easeOutCubic(t: number): number {
  return 1 - (1 - Math.min(Math.max(t, 0), 1)) ** 3;
}
