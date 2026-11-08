import { createCamera, easeOutCubic, panCamera, resizeCamera, revealX, screenToWorld, worldToScreen } from './camera';

const world = { width: 2400, height: 1000 };

describe('camera', () => {
  it('fits world height without distortion and centers on the start x', () => {
    const cam = createCamera(world, 390, 844, 1300);
    expect(cam.scale).toBeCloseTo(0.844);
    expect(cam.x + 390 / cam.scale / 2).toBeCloseTo(1300);
  });

  it('clamps panning to the world edges', () => {
    const cam = createCamera(world, 390, 844, 1300);
    expect(panCamera(cam, 100_000).x).toBe(0);
    expect(panCamera(cam, -100_000).x).toBeCloseTo(2400 - 390 / cam.scale);
  });

  it('centers a world narrower than the viewport', () => {
    const cam = createCamera(world, 3000, 500, 1300); // sees 6000 world units
    expect(cam.x).toBeCloseTo(-1800);
    expect(panCamera(cam, 200).x).toBeCloseTo(-1800);
  });

  it('keeps the view center when resizing', () => {
    const cam = createCamera(world, 390, 844, 1300);
    const resized = resizeCamera(cam, 1440, 900);
    expect(resized.scale).toBeCloseTo(0.9);
    expect(resized.x + 1440 / resized.scale / 2).toBeCloseTo(1300);
  });

  it('round-trips screen and world coordinates after a pan', () => {
    const cam = panCamera(createCamera(world, 390, 844, 1300), -120);
    const p = { x: 150, y: 600 };
    const w = screenToWorld(cam, p);
    expect(w.x).toBeCloseTo(150 / cam.scale + cam.x);
    expect(worldToScreen(cam, w).x).toBeCloseTo(p.x);
    expect(worldToScreen(cam, w).y).toBeCloseTo(p.y);
  });
});

describe('revealX (dead zone)', () => {
  const cam = createCamera(world, 390, 844, 1300); // sees ~462 units from x≈1069
  const margin = 24; // px

  it('keeps the camera still when the span is already inside the safe zone', () => {
    expect(revealX(cam, 1200, 1400, margin)).toBe(cam.x);
  });

  it('pans just enough to reveal a span past the right or left edge', () => {
    const right = revealX(cam, 1450, 1600, margin);
    expect(right).toBeCloseTo(1600 - 390 / cam.scale + margin / cam.scale);
    const left = revealX(cam, 900, 1000, margin);
    expect(left).toBeCloseTo(900 - margin / cam.scale);
  });

  it('centers a span wider than the safe zone and respects world edges', () => {
    const wide = revealX(cam, 1000, 1600, margin);
    expect(wide + 390 / cam.scale / 2).toBeCloseTo(1300);
    expect(revealX(cam, 2350, 2400, margin)).toBeCloseTo(2400 - 390 / cam.scale);
    expect(revealX(cam, 0, 20, margin)).toBe(0);
  });

  it('eases from 0 to 1 without overshoot', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});
