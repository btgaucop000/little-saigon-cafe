import { Graphics } from 'pixi.js';
import type { Point, SeatLayout } from '../game/sceneLayout';

// Dev-only seat alignment overlay, enabled with `?debug=seat`. Never shown in production builds.

/** Visible cushion of chair-fold-left.png, in source pixels (back-left, back-right, front-right, front-left). */
const LEFT_CHAIR_CUSHION_PX: Point[] = [
  { x: 145, y: 375 },
  { x: 370, y: 320 },
  { x: 550, y: 345 },
  { x: 335, y: 425 },
];
/** Chair floor anchor in source pixels (anchor 0.5, 0.98 of 578x615). */
const LEFT_CHAIR_FLOOR_PX = { x: 289, y: 603 };

export function isSeatDebugEnabled(): boolean {
  return import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === 'seat';
}

export function drawSeatDebug(seat: SeatLayout, furnitureScale: number): Graphics {
  const g = new Graphics();
  const toWorld = (p: Point) => ({
    x: seat.position.x + (p.x - LEFT_CHAIR_FLOOR_PX.x) * furnitureScale,
    y: seat.position.y + (p.y - LEFT_CHAIR_FLOOR_PX.y) * furnitureScale,
  });
  const cushion = LEFT_CHAIR_CUSHION_PX.map(toWorld);
  g.poly(cushion.flatMap((p) => [p.x, p.y])).stroke({ width: 1.2, color: 0x00c2ff });
  const sit = { x: seat.position.x + seat.sitOffset.x, y: seat.position.y + seat.sitOffset.y };
  const approach = { x: seat.position.x + seat.approachOffset.x, y: seat.position.y + seat.approachOffset.y };
  g.circle(sit.x, sit.y, 3).fill(0xff2d55); // hip anchor = sitPoint
  g.circle(approach.x, approach.y, 3).fill(0x22c55e); // approachPoint (standing feet)
  return g;
}
