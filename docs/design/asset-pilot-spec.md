# Visual Prototype 01 — Asset Pilot Specification

Status: **waiting for artwork** (Checkpoint 1). Nothing in `src/` uses these files yet.

References, in priority order:
1. `cafe-layout-reference-v2.png` — layout, two rows of tables, materials, depth.
2. `cafe-visual-reference-v1.png` — line style, avatar, counter, cold room.

`cafe-concept.png` is historical only. Do **not** cut objects out of the reference images.

## 1. Global rules (apply to every file)

| Rule | Value |
|---|---|
| Style | Cozy 2D hand-painted game art, dark warm-brown line art (not black), soft painterly shading, light brush texture |
| View | 3/4 oblique: facade parallel to the image's bottom edge, camera ~30° above, table and seat tops visible as ellipses |
| Light | Late afternoon (4–5 pm), sun from the **upper left**. Material shading stays (folds, steel highlights, wood grain) |
| Not baked into sprites | Long cast shadows, dappled sun spots, colored light. A faint contact shadow under feet/legs is OK |
| Text | **No letters anywhere** (signs and menu boards blank — text is rendered by React) |
| Resolution | **1.75 px per world unit** for every file, so line weight matches after scaling |
| Sprites | Transparent PNG (RGBA), object fully inside canvas with ≥ 16 px padding, no halo/white fringe |
| Background | Opaque PNG or WebP |
| Naming | `kebab-case`, put in `public/assets/<group>/` exactly as listed below |

Palette: chair canvas ivory `#E5DCCB` (alt. sand `#D0C5B2`), charcoal matte metal frame, brown wooden armrests,
small round brown wooden table, neutral grey-beige pavers `#B9B1A4`, natural greens, red-and-cream awning.
Sun spots must be **subtler than in reference v2** — furniture and avatar must stay readable.

## 2. Files to provide (6 required + 1 optional)

Sizes are targets; ±10% is fine — the exact scale is tuned in the manifest, not in the image.
"Floor point" = where the object touches the ground, bottom-center of its footprint.

### 2.1 `public/assets/scene/bg-center.png` — background tile
- **2100 × 1750 px** (= 1200 × 1000 world units), opaque.
- Contents, top to bottom:
  - 0–~300 px: upper facade of a modern Saigon tube house (balcony, plants, AC unit, a few cables), tree leaves entering from the top-left are OK.
  - ~300–520 px: red-and-cream scalloped awning across the full width, soft folds. A blank wooden sign above it is OK.
  - ~520–820 px: ground-floor facade. **Left ~600 px**: wall with wall-mounted shelves (jars, cups) behind where the counter will stand — no counter itself. **From ~850 px to the right**: glass doors of the air-conditioned room, with a visible interior (wooden tables and chairs, warm pendant lamps, AC unit, framed pictures).
  - **Wall/floor line at ~820 px.**
  - 820–1580 px: pavement with neutral grey-beige pavers, **completely empty** — this is where both rows of tables and the aisle go.
  - ~1580 px: curb. Below: a strip of asphalt road.
- Must **not** contain: outdoor tables, chairs, counter, avatar, people, the big foreground tree trunk, motorbike, text.

### 2.2 `public/assets/props/table-round.png`
- Small round wooden table on four splayed wooden legs (as in reference v2), top seen as an ellipse.
- Object ≈ **230 px wide × 200 px tall** (130 × 115 units). Canvas ≈ 270 × 240 px.

### 2.3 `public/assets/props/chair-fold-left.png` and `chair-fold-right.png`
- Low folding chair: charcoal metal frame, ivory canvas seat and backrest, brown wooden armrests.
- **Left chair** stands left of the table and **faces right-and-slightly-toward-camera** (we see its seat, front edge and inner side).
  **Right chair** is its mirror arrangement: faces left-and-slightly-toward-camera. Paint both — do **not** just flip, so shading stays lit from the upper left.
  (This matches the back-row chairs in reference v2.)
- Object ≈ **245 px tall** (140 units), seat surface at ≈ **40%** of the height from the floor.
- Same canvas size for both, ≈ 300 × 290 px.

### 2.4 `public/assets/props/chair-fold-left-front.png` (optional but recommended)
- **Same canvas, same position** as `chair-fold-left.png`, containing **only** the parts that should appear in front of a seated person: the near (camera-side) armrest and the front frame/legs. Everything else transparent.
- Needed only for the First Seat chair. If missing, the avatar is drawn fully in front of the chair (acceptable for the pilot).

### 2.5 `public/assets/characters/avatar-stand.png`
- Chibi character from reference v1: brown flat cap, olive-green overshirt jacket, white tee, dark-blue jeans rolled at the ankle, white sneakers, brown crossbody bag. Head:body ≈ 1:2.
- Standing 3/4 toward the camera, relaxed, hands in pockets or at the sides.
- Object ≈ **400 px tall** (≈ 230 units, i.e. ~1.65× chair height). Canvas ≈ 260 × 440 px.

### 2.6 `public/assets/characters/avatar-sit-left-chair.png`
- Same character, **seated on `chair-fold-left`**, facing right toward the table, relaxed (e.g. one hand resting on the armrest or holding an iced coffee).
- Paint it **at the same scale as the chair** (best: paint it sitting in the chair, then remove the chair). Buttocks on the seat, feet on the floor, knees just above seat height.
- Canvas ≈ 300 × 400 px; floor point = the chair's floor point.

### 2.7 `public/assets/props/counter.png`
- Cô Bảy's mobile wooden coffee cart/counter (reference v1/v2): wooden front panels, small casters, on top: aluminium phin filters, glass cups, a big blue water jug, a folded white towel. A small blank chalkboard on an easel beside it is OK.
- Seen from the front (facade-parallel). Object ≈ **600 px wide × 520 px tall** (≈ 340 × 300 units).

## 3. Scale & consistency check before integration

Lay all sprites on `bg-center` at 1.75 px/unit (any image editor):
- Avatar seat height: chair seat ≈ avatar knee; table top ≈ seated avatar's elbow.
- Table/seat ellipses as flat as the pavers at the same depth.
- Legs of table and both chairs end on the same horizontal floor line.
- Line weight looks identical at 100% zoom.
- Highlights on steel, wood, leaves all from the upper left.
- Check edges on both a dark and a light background (no white fringe).

## 4. Planned integration (Checkpoint 2, after files exist)

- `src/game/sceneLayout.ts` gets a data-driven list of placed objects: `{ id, sprite, x, y (floor point), scale, zOffset }`, plus seats with an explicit `hitbox` (never derived from the image size). Only the First Seat (`chair-fold-left` at the back-row table next to the counter) is interactive; other tables/chairs are decoration reusing the same sprites.
- A small asset manifest maps sprite keys → file + anchor (floor point in px). Loaded once with `Assets.load()` before the world is built; React shows a short loading line and an error message if loading fails.
- Depth: existing y-sort by floor point. Seated avatar uses `zIndex = chair.y`, chair `y − 1`, chair front layer `y + 1`.
- Camera/game state stay as they are; only `cameraStartX`, world positions and the seat id list change.
