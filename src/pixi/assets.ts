import { Assets, Texture } from 'pixi.js';

// Sprite manifest: image file + anchor (normalized floor contact point).
// anchor.y is measured from each PNG's lowest opaque row, so transparent bottom padding
// does not make the object float: table 474/486, left chair 603/615, right chair 602/608.
// World placement, scale, depth and hitboxes live in sceneLayout, not here.
export const spriteManifest = {
  // Approved café panorama (copy of docs/design/cafe-panorama-master.png), top-left anchored, opaque 2172x724.
  'cafe-panorama': { url: 'assets/backgrounds/cafe-panorama.png', anchor: { x: 0, y: 0 } },
  'table-round': { url: 'assets/props/table-round.png', anchor: { x: 0.5, y: 0.975 } },
  'chair-fold-left': { url: 'assets/props/chair-fold-left.png', anchor: { x: 0.5, y: 0.98 } },
  // Near armrest + front post of each chair, cut from the same PNG (scripts/extract-chair-front.mjs).
  // Same size and anchor as the chair, drawn over a seated avatar.
  'chair-fold-left-front': { url: 'assets/props/chair-fold-left-front.png', anchor: { x: 0.5, y: 0.98 } },
  'chair-fold-right-front': { url: 'assets/props/chair-fold-right-front.png', anchor: { x: 0.5, y: 0.99 } },
  'chair-fold-right': { url: 'assets/props/chair-fold-right.png', anchor: { x: 0.5, y: 0.99 } },
  // Standing avatar: anchored between the shoes, on the sole line (y 1021 of 1070).
  'avatar-stand': { url: 'assets/characters/student/avatar-stand.png', anchor: { x: 0.55, y: 0.954 } },
  // Seated avatar: anchored at the hip where it rests on the seat (160,670 of 540x957), not at the feet.
  'avatar-sit-left-chair': {
    url: 'assets/characters/student/avatar-sit-left-chair.png',
    anchor: { x: 0.296, y: 0.7 },
  },
} as const;

export type SpriteKey = keyof typeof spriteManifest;

export type SpriteTextures = Record<SpriteKey, Texture>;

/** Loads every sprite in the manifest. Rejects if any file fails, so callers can fall back. */
export async function loadSpriteTextures(): Promise<SpriteTextures> {
  const base = import.meta.env.BASE_URL;
  const keys = Object.keys(spriteManifest) as SpriteKey[];
  // Sprites are drawn ~3x smaller than their source pixels; mipmaps avoid aliasing
  // (jagged wood grain, uneven outlines) that plain bilinear minification produces.
  const textures = await Promise.all(
    keys.map((k) =>
      Assets.load<Texture>({ src: base + spriteManifest[k].url, data: { autoGenerateMipmaps: true } }),
    ),
  );
  return Object.fromEntries(keys.map((k, i) => [k, textures[i]])) as SpriteTextures;
}
