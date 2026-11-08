import { Container, Graphics } from 'pixi.js';
import type { SceneLayout } from '../game/sceneLayout';

// Placeholder drawings. Each function returns a display object anchored at its
// bottom-center (0,0 = floor contact point) so it can later be swapped for a Sprite.

const palette = {
  wall: 0xf3dcc0,
  wallShade: 0xe8c9a6,
  floor: 0xd99a7a,
  floorLine: 0xc98467,
  curb: 0xb9a99a,
  road: 0x6f6a72,
  wood: 0x9a6440,
  woodDark: 0x77482c,
  awningRed: 0xd9534a,
  awningCream: 0xfff1dc,
  stool: 0x3f7fd9,
  stoolDark: 0x2c5fa8,
  steel: 0xc9ccd3,
  steelDark: 0x9aa0aa,
  leaf: 0x6fa463,
  pot: 0xc9764f,
  shadow: 0x5a3a2a,
};

export function drawBackground(layout: SceneLayout): Container {
  const { width, height } = layout.world;
  const bg = new Container();
  const g = new Graphics();

  // Wall with a soft lower band.
  g.rect(0, 0, width, layout.floorY).fill(palette.wall);
  g.rect(0, layout.floorY - 60, width, 60).fill(palette.wallShade);

  // Sidewalk tiles.
  g.rect(0, layout.floorY, width, layout.curbY - layout.floorY).fill(palette.floor);
  for (let y = layout.floorY + 60; y < layout.curbY; y += 70) {
    g.rect(0, y, width, 3).fill(palette.floorLine);
  }
  for (let x = 0; x < width; x += 120) {
    g.rect(x, layout.floorY, 3, layout.curbY - layout.floorY).fill(palette.floorLine);
  }

  // Curb and road.
  g.rect(0, layout.curbY, width, 18).fill(palette.curb);
  g.rect(0, layout.curbY + 18, width, height - layout.curbY - 18).fill(palette.road);

  // Counter: front face, top, and a striped awning above it.
  const c = layout.counter;
  const top = c.y - c.height;
  g.rect(c.x, top, c.width, c.height).fill(palette.wood);
  g.rect(c.x - 10, top - 18, c.width + 20, 22).fill(palette.woodDark);
  for (let x = c.x + 40; x < c.x + c.width; x += 80) {
    g.rect(x, top + 20, 6, c.height - 30).fill(palette.woodDark);
  }
  const awningTop = 110;
  const stripe = 52;
  const awningRight = c.x + c.width + 60;
  for (let i = 0, x = c.x - 60; x < awningRight; i++, x += stripe) {
    const w = Math.min(stripe, awningRight - x);
    g.rect(x, awningTop, w, 90).fill(i % 2 === 0 ? palette.awningRed : palette.awningCream);
  }
  g.rect(c.x - 60, awningTop + 90, c.width + 120, 10).fill(palette.awningRed);

  bg.addChild(g);
  return bg;
}

function groundShadow(g: Graphics, rx: number, ry: number) {
  g.ellipse(0, 0, rx, ry).fill({ color: palette.shadow, alpha: 0.18 });
}

export function drawTable(): Graphics {
  const g = new Graphics();
  groundShadow(g, 80, 18);
  g.rect(-6, -95, 12, 95).fill(palette.steelDark);
  g.ellipse(0, -2, 34, 8).fill(palette.steelDark);
  g.ellipse(0, -100, 85, 24).fill(palette.steelDark);
  g.ellipse(0, -106, 85, 24).fill(palette.steel);
  return g;
}

export function drawStool(): Graphics {
  const g = new Graphics();
  groundShadow(g, 46, 12);
  g.poly([-36, -62, 36, -62, 30, 0, 18, 0, 20, -44, -20, -44, -18, 0, -30, 0]).fill(palette.stoolDark);
  g.roundRect(-38, -74, 76, 16, 6).fill(palette.stool);
  return g;
}

export function drawPlant(): Graphics {
  const g = new Graphics();
  groundShadow(g, 40, 10);
  g.poly([-30, -60, 30, -60, 22, 0, -22, 0]).fill(palette.pot);
  g.circle(-18, -90, 28).fill(palette.leaf);
  g.circle(16, -100, 32).fill(palette.leaf);
  g.circle(0, -128, 26).fill(palette.leaf);
  return g;
}

/** Faint warm glow on the floor under a free seat; pulses gently as a tap hint. */
export function drawSeatGlow(): Graphics {
  const g = new Graphics();
  g.ellipse(0, -4, 62, 20).fill({ color: 0xfff1c9, alpha: 0.1 });
  g.ellipse(0, -4, 48, 15).fill({ color: 0xfff1c9, alpha: 0.12 });
  return g;
}

/** Clear selection ring, shown only for the selected seat. */
export function drawSeatSelectedRing(): Graphics {
  const g = new Graphics();
  g.ellipse(0, -4, 60, 19).fill({ color: 0xffc94a, alpha: 0.18 });
  g.ellipse(0, -4, 60, 19).stroke({ width: 4, color: 0xffc94a });
  return g;
}

const skin = 0xf2c7a0;
const hair = 0x3b2a22;
const shirt = 0x7a9a5a;
const pants = 0x4b5568;

export function drawAvatarStanding(): Graphics {
  const g = new Graphics();
  groundShadow(g, 34, 9);
  g.roundRect(-18, -70, 15, 70, 6).fill(pants);
  g.roundRect(3, -70, 15, 70, 6).fill(pants);
  g.roundRect(-26, -135, 52, 72, 16).fill(shirt);
  g.circle(0, -165, 32).fill(skin);
  g.ellipse(0, -186, 34, 18).fill(hair);
  g.circle(-10, -162, 3.5).fill(hair);
  g.circle(10, -162, 3.5).fill(hair);
  return g;
}

/** Seated pose: anchored at the stool's floor point, sitting on a ~74-unit stool. */
export function drawAvatarSitting(): Graphics {
  const g = new Graphics();
  // Thighs forward and shins down in front of the stool.
  g.roundRect(-22, -86, 52, 18, 8).fill(pants);
  g.roundRect(16, -80, 15, 66, 6).fill(pants);
  g.roundRect(-26, -150, 52, 70, 16).fill(shirt);
  g.circle(0, -180, 32).fill(skin);
  g.ellipse(0, -201, 34, 18).fill(hair);
  // Closed, smiling eyes: relaxed.
  g.moveTo(-15, -176).arc(-10, -176, 5, Math.PI, 0).stroke({ width: 3, color: hair });
  g.moveTo(5, -176).arc(10, -176, 5, Math.PI, 0).stroke({ width: 3, color: hair });
  return g;
}

/** Soft ground shadow for painted sprites, which carry no cast shadow of their own. */
export function drawContactShadow(radiusX: number): Graphics {
  // Stacked ellipses fake a soft falloff: wide and faint outside, tighter and darker at the core.
  const g = new Graphics();
  const ry = radiusX * 0.24;
  g.ellipse(0, -2, radiusX, ry).fill({ color: palette.shadow, alpha: 0.1 });
  g.ellipse(0, -2, radiusX * 0.78, ry * 0.75).fill({ color: palette.shadow, alpha: 0.12 });
  g.ellipse(0, -2, radiusX * 0.55, ry * 0.5).fill({ color: palette.shadow, alpha: 0.12 });
  return g;
}
