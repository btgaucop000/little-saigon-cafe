// Derives near-armrest foreground overlays for the folding chairs (same size, same anchor).
// Pixels are copied untouched, so an overlay matches its chair exactly when drawn on top of it.
// Run: node scripts/extract-chair-front.mjs
import sharp from 'sharp';

// Near armrest (canvas keyed out around it) and the front post below it, in source pixels.
// The far-side frame never overlaps a seated avatar, so it stays out of the overlay.
const CHAIRS = [
  {
    src: 'public/assets/props/chair-fold-left.png',
    out: 'public/assets/props/chair-fold-left-front.png',
    armrest: [[50, 242], [264, 242], [264, 334], [50, 334]],
    post: [[200, 318], [231, 318], [320, 575], [292, 600]],
  },
  {
    src: 'public/assets/props/chair-fold-right.png',
    out: 'public/assets/props/chair-fold-right-front.png',
    armrest: [[362, 240], [572, 240], [572, 330], [362, 330]],
    post: [[402, 318], [436, 318], [322, 580], [282, 594]],
  },
];

const inside = (poly, x, y) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const isCanvas = (r, g, b) => r + g + b > 480 && r - b >= 22 && r - b <= 95 && g > 150;

for (const chair of CHAIRS) {
  const { data, info } = await sharp(chair.src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      // Key canvas out around the armrest and the top of the post, where fabric shows through;
      // lower down the post's pale metal highlight would be mistaken for canvas.
      const canvas = y < 360 && isCanvas(data[i], data[i + 1], data[i + 2]);
      const keep = (inside(chair.post, x, y) || inside(chair.armrest, x, y)) && !canvas;
      if (!keep) data[i + 3] = 0;
    }
  await sharp(data, { raw: info }).png().toFile(chair.out);
  console.log('wrote', chair.out, info.width, info.height);
}
