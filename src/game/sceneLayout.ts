// Scene layout data in world units. All positions use a bottom-center anchor
// (the point where an object touches the floor), which is also its depth (y-sort).

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SeatId = 'seat-left' | 'seat-right';

export interface SeatLayout {
  id: SeatId;
  position: Point;
  /** Sprite key (see src/pixi/assets.ts); each chair has its own painted facing, never flipped. */
  sprite: string;
  /** sitPoint: seat surface point where the seated avatar's hip anchor goes, relative to the chair's floor point. */
  sitOffset: Point;
  /** approachPoint: floor point where the standing avatar stops before sitting, relative to the chair's floor point. */
  approachOffset: Point;
  /** Whether the seat can be tapped. Decorative chairs keep their sprite but no hitbox or hint. */
  interactive: boolean;
  /** Seated sprite is mirrored to face left (the only sitting sprite faces right). */
  sitMirrored: boolean;
  /** Touch target, deliberately larger than the drawn stool. */
  hitbox: Rect;
}

const SEAT_HITBOX_WIDTH = 262.5;
const SEAT_HITBOX_HEIGHT = 297.5;
const SEAT_HITBOX_BELOW_FLOOR = 52.5;

function seat(
  id: SeatId,
  sprite: string,
  x: number,
  y: number,
  sitOffset: Point,
  approachOffset: Point,
  interactive: boolean,
  sitMirrored = false,
): SeatLayout {
  return {
    id,
    sprite,
    position: { x, y },
    sitOffset,
    approachOffset,
    interactive,
    sitMirrored,
    hitbox: {
      x: x - SEAT_HITBOX_WIDTH / 2,
      y: y - SEAT_HITBOX_HEIGHT + SEAT_HITBOX_BELOW_FLOOR,
      width: SEAT_HITBOX_WIDTH,
      height: SEAT_HITBOX_HEIGHT,
    },
  };
}

export const sceneLayout = {
  // Panorama is 2172x724 px; fit to 1000 units high -> 3000 units wide, so the camera never sees past it.
  world: { width: 3000, height: 1000 },
  /** Wall ends and sidewalk begins at this y. */
  floorY: 430,
  /** Curb line near the bottom of the scene. */
  curbY: 950,
  counter: { x: 640, y: 480, width: 520, height: 190 },
  /**
   * Painted panorama (world unit = 1.381 px). Landmarks in world units: counter x≈458–923,
   * glass door x≈945–1148, plant stool x≈1193–1305, large window x≈1343–1980,
   * wall base / pavement starts at y≈830.
   */
  background: { sprite: 'cafe-panorama', x: 0, y: 0, scale: 1000 / 724 },
  /** World units per sprite pixel for the First Seat furniture (x1.75 of the 0.21 baseline, matched to the panorama). */
  furnitureScale: 0.3675,
  /** World units per sprite pixel for the avatar; makes shoes reach the floor when seated. */
  avatarScale: 0.408,
  table: { x: 1660, y: 905, sprite: 'table-round' },
  seats: [
    // First Seat: two chairs facing each other across the table; one shared selection model.
    // sitOffset puts the avatar's seat-contact area (hip to mid-thigh) on the cushion centre.
    // approachOffset keeps the standing sprite clear of the chair: its right edge (feet x + 64)
    // stays left of the chair's leftmost pixel (x - 101).
    seat('seat-left', 'chair-fold-left', 1493.75, 926, { x: -7.3, y: -84 }, { x: -170, y: 17.5 }, true),
    // Faces left, so the seated sprite is mirrored; sitOffset mirrors the left seat's.
    seat('seat-right', 'chair-fold-right', 1826.25, 926, { x: 7.3, y: -84 }, { x: 175, y: 17.5 }, true, true),
  ] as SeatLayout[],
  /**
   * spawnPoint: on the pavement right of the plant stool and the door, left of the First Seat
   * approach point (x≈1324); the standing sprite spans x−84..x+64.
   */
  spawnPoint: { x: 1325, y: 930 },
  plants: [
    { x: 560, y: 490 },
    { x: 1700, y: 470 },
  ] as Point[],
  /** World x the camera centers on at startup: the spawn point and the First Seat set. */
  cameraStartX: 1460,
};

export type SceneLayout = typeof sceneLayout;

function contains(rect: Rect, p: Point): boolean {
  return p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height;
}

/** Returns the seat whose hitbox contains the world point; the closest one wins on overlap. */
export function findSeatAt(seats: readonly SeatLayout[], p: Point): SeatLayout | null {
  let best: SeatLayout | null = null;
  let bestDist = Infinity;
  for (const s of seats) {
    if (!contains(s.hitbox, p)) continue;
    const d = Math.hypot(s.position.x - p.x, s.position.y - p.y);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

/** Seats the player can tap. */
export const interactiveSeats = sceneLayout.seats.filter((s) => s.interactive);

/** The other First Seat chair (the set has exactly two). */
export function otherSeatId(id: SeatId): SeatId {
  return id === 'seat-left' ? 'seat-right' : 'seat-left';
}

/**
 * Scale-comparison helper (dev pilot only): returns a copy where avatar, furniture and every
 * seat-relative offset grow by `k` around the table, so alignment is preserved at any size.
 * Background, world and camera are untouched.
 */
export function scaleFirstSeatSet(layout: SceneLayout, k: number): SceneLayout {
  const t = layout.table;
  const sx = (x: number) => t.x + (x - t.x) * k;
  const mul = (p: Point): Point => ({ x: p.x * k, y: p.y * k });
  const seats = layout.seats.map((s): SeatLayout => {
    const position = { x: sx(s.position.x), y: t.y + (s.position.y - t.y) * k };
    const w = SEAT_HITBOX_WIDTH * k;
    const h = SEAT_HITBOX_HEIGHT * k;
    return {
      ...s,
      position,
      sitOffset: mul(s.sitOffset),
      approachOffset: mul(s.approachOffset),
      hitbox: { x: position.x - w / 2, y: position.y - h + SEAT_HITBOX_BELOW_FLOOR * k, width: w, height: h },
    };
  });
  return {
    ...layout,
    furnitureScale: layout.furnitureScale * k,
    avatarScale: layout.avatarScale * k,
    seats,
    spawnPoint: { x: sx(layout.spawnPoint.x), y: layout.spawnPoint.y },
  };
}
