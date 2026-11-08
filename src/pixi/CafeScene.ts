import { Application, Container, FederatedPointerEvent, Graphics, Sprite, Ticker } from 'pixi.js';
import { drawSeatDebug, isSeatDebugEnabled } from './debugOverlay';
import { loadSpriteTextures, spriteManifest, type SpriteKey, type SpriteTextures } from './assets';
import {
  createCamera,
  easeOutCubic,
  panCamera,
  revealX,
  resizeCamera,
  screenToWorld,
  worldToScreen,
  type Camera,
} from '../game/camera';
import type { GameState, GameStore } from '../game/gameState';
import {
  findSeatAt,
  sceneLayout as baseLayout,
  scaleFirstSeatSet,
  type Point,
  type SeatId,
  type SeatLayout,
} from '../game/sceneLayout';
import { SEAT_HINT_EMPHASIS_MS, isSeatHintSeen } from '../game/seatHint';

// Dev-only scale pilot: `?scale=1.25` enlarges the First Seat set and avatar. Ignored in production.
const devScale = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('scale')) : 0;
const scaledLayout = devScale > 0 ? scaleFirstSeatSet(baseLayout, devScale) : baseLayout;
// Dev-only `?spawn=counter`: stands the avatar in front of the order counter for scale screenshots.
const counterCheck = import.meta.env.DEV && new URLSearchParams(location.search).get('spawn') === 'counter';
// Dev-only `?avatar=2`: avatar scale as a multiple of the 0.204 baseline (scale pilot).
const devAvatar = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('avatar')) : 0;
const pilotLayout = devAvatar > 0 ? { ...scaledLayout, avatarScale: 0.204 * devAvatar } : scaledLayout;
const sceneLayout = counterCheck
  ? { ...pilotLayout, spawnPoint: { x: 700, y: 860 }, cameraStartX: 700 }
  : pilotLayout;
const interactiveSeats = sceneLayout.seats.filter((s) => s.interactive);
import {
  drawAvatarSitting,
  drawAvatarStanding,
  drawBackground,
  drawPlant,
  drawSeatGlow,
  drawSeatSelectedRing,
  drawStool,
  drawTable,
  drawContactShadow,
} from './placeholders';

/** Screen pixels a pointer may move before a press becomes a drag instead of a tap. */
export const TAP_MOVE_THRESHOLD = 10;
const SIT_TWEEN_MS = 280;
/**
 * First-visit hint anchor, relative to the left chair's floor point: the left end of its
 * backrest top bar (x ≈ −100), plus a small gap above it (the bar is ≈ 216 units up).
 */
const SEAT_HINT_OFFSET = { x: -100, y: -228 };
const SETTLE_MS = 160;
/** Automatic framing keeps targets this far (screen px) from the left/right edges. */
const CAMERA_SAFE_MARGIN_PX = 24;
const SELECT_FRAME_MS = 320;
/** Standing sprite extent around its feet, in world units (avatar x2.0). */
const AVATAR_SPAN = { left: -84, right: 64 };
/** Half-width of a First Seat chair in world units (furniture x1.75). */
const CHAIR_HALF_WIDTH = 110;
/** The fallback sitting graphic is drawn from the floor; this lifts it onto the seat-anchored pose. */
const PLACEHOLDER_SEAT_HEIGHT = 48;

interface Press {
  pointerId: number;
  start: Point;
  last: Point;
  dragging: boolean;
}

/** Read-only hook used by E2E tests to locate seats on screen. */
export interface CafeDebugHook {
  seatScreenPoint(id: SeatId): Point;
  cameraX(): number;
  avatarPose(): 'stand' | 'sit';
  /** Seat whose sitting pose is rendered (null while standing or walking). */
  avatarSeat(): SeatId | null;
  /** Avatar floor/hip point on screen. */
  avatarScreenPoint(): Point;
  /** True while an automatic camera move is running. */
  cameraMoving(): boolean;
}

declare global {
  interface Window {
    __cafe?: CafeDebugHook;
  }
}

/**
 * Owns the PixiJS application: renders the world from GameState and turns
 * pointer input into camera pans or seat selections. Gameplay rules live in the store.
 */
export class CafeScene {
  private app = new Application();
  private initialized = false;
  private destroyed = false;
  private camera!: Camera;
  private world = new Container();
  /** Per-seat affordance: a faint idle glow, and a ring shown only while selected. */
  private markers = new Map<SeatId, { glow: Graphics; ring: Graphics }>();
  private avatar = new Container();
  /** Pose containers; origin = floor point when standing, hip/seat point when sitting. */
  private standing = new Container();
  private sitting = new Container();
  private press: Press | null = null;
  /** Movement in progress; the pose for `seat` is applied when it completes. */
  private tween: { from: Point; to: Point; elapsed: number; seat: SeatLayout | null } | null = null;
  /** Seat whose sitting pose is currently shown (null = standing). */
  private poseSeat: SeatLayout | null = null;
  /** Chair foreground parts (near armrest) drawn over the avatar only while it sits there. */
  private chairFronts = new Map<SeatId, Sprite>();
  private settleMs = 0;
  /** Automatic camera move (x only). Cancelled as soon as the player drags. */
  private camTween: { from: number; to: number; elapsed: number; duration: number } | null = null;
  private renderedSelection: SeatId | null = null;
  private pulse = 0;
  /** Remaining time of the one-off chair emphasis that accompanies the first-visit hint. */
  private emphasisMs = isSeatHintSeen() ? 0 : SEAT_HINT_EMPHASIS_MS;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private unsubscribe: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  /** undefined = nothing rendered yet, so the first sync always applies the pose. */
  private renderedSeatId: SeatId | null | undefined = undefined;
  private host: HTMLElement;
  private store: GameStore;

  constructor(host: HTMLElement, store: GameStore) {
    this.host = host;
    this.store = store;
  }

  async init(): Promise<void> {
    await this.app.init({
      background: 0xf3dcc0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      width: Math.max(this.host.clientWidth, 1),
      height: Math.max(this.host.clientHeight, 1),
    });
    this.initialized = true;
    let textures: SpriteTextures | null = null;
    try {
      textures = await loadSpriteTextures();
    } catch (err) {
      console.error('Failed to load furniture sprites, using placeholders', err);
    }
    // React StrictMode may have unmounted us while init/loading was pending.
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }

    this.host.appendChild(this.app.canvas);
    this.camera = createCamera(
      sceneLayout.world,
      this.app.screen.width,
      this.app.screen.height,
      sceneLayout.cameraStartX,
    );
    this.buildWorld(textures);
    this.applyCamera();
    this.bindInput();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.host);
    this.app.ticker.add(this.update);
    this.unsubscribe = this.store.subscribe(() => this.sync(this.store.getState()));
    this.sync(this.store.getState(), true);

    window.__cafe = {
      seatScreenPoint: (id) => {
        const seat = sceneLayout.seats.find((s) => s.id === id)!;
        // Visual center of the chair (cushion height), above the bottom sheet on phones.
        return worldToScreen(this.camera, { x: seat.position.x, y: seat.position.y - 110 });
      },
      cameraX: () => this.camera.x,
      avatarPose: () => (this.poseSeat ? 'sit' : 'stand'),
      avatarSeat: () => this.poseSeat?.id ?? null,
      avatarScreenPoint: () => worldToScreen(this.camera, { x: this.avatar.x, y: this.avatar.y }),
      cameraMoving: () => this.camTween !== null,
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    delete window.__cafe;
    if (this.initialized) {
      this.app.ticker.remove(this.update);
      this.app.stage.removeAllListeners();
      this.app.destroy(true, { children: true });
    }
  }

  private buildWorld(textures: SpriteTextures | null): void {
    this.app.stage.addChild(this.world);
    if (!textures) this.world.addChild(drawBackground(sceneLayout));
    else {
      // Painted panorama covering the whole world; behind every prop and the seat hints.
      const { sprite, x, y, scale } = sceneLayout.background;
      const bg = new Sprite(textures[sprite as SpriteKey]);
      bg.position.set(x, y);
      bg.scale.set(scale);
      this.world.addChild(bg);
    }

    const floorMarks = new Container();
    const props = new Container();
    props.sortableChildren = true; // y-sort by floor contact point
    this.world.addChild(floorMarks, props);

    const addProp = (obj: Container, p: Point) => {
      obj.position.set(p.x, p.y);
      obj.zIndex = p.y;
      props.addChild(obj);
    };

    if (!textures) for (const p of sceneLayout.plants) addProp(drawPlant(), p);
    const furniture = (key: string, fallback: () => Container): Container => {
      if (!textures) return fallback();
      const k = key as SpriteKey;
      const sprite = new Sprite(textures[k]);
      sprite.anchor.set(spriteManifest[k].anchor.x, spriteManifest[k].anchor.y);
      sprite.scale.set(sceneLayout.furnitureScale);
      const wrapper = new Container();
      wrapper.addChild(drawContactShadow(sprite.width * 0.42), sprite);
      return wrapper;
    };

    addProp(furniture(sceneLayout.table.sprite, drawTable), sceneLayout.table);
    for (const seat of sceneLayout.seats) {
      addProp(furniture(seat.sprite, drawStool), seat.position);
      const frontKey = `${seat.sprite}-front`;
      if (textures && frontKey in spriteManifest) {
        const k = frontKey as SpriteKey;
        const front = new Sprite(textures[k]);
        front.anchor.set(spriteManifest[k].anchor.x, spriteManifest[k].anchor.y);
        front.scale.set(sceneLayout.furnitureScale);
        front.visible = false;
        addProp(front, seat.position);
        front.zIndex = seat.position.y + 2; // above the seated avatar (chair y + 1)
        this.chairFronts.set(seat.id, front);
      }
      if (!seat.interactive) continue; // decorative chair: no tap hint
      const marker = { glow: drawSeatGlow(), ring: drawSeatSelectedRing() };
      for (const g of [marker.glow, marker.ring]) {
        g.position.set(seat.position.x, seat.position.y);
        floorMarks.addChild(g);
      }
      this.markers.set(seat.id, marker);
    }

    this.buildAvatar(textures);
    this.avatar.addChild(this.standing, this.sitting);
    addProp(this.avatar, sceneLayout.spawnPoint);

    if (isSeatDebugEnabled()) {
      for (const seat of interactiveSeats.filter((s) => s.id === 'seat-left')) {
        // Cushion outline is measured for chair-fold-left only.
        const overlay = drawSeatDebug(seat, sceneLayout.furnitureScale);
        overlay.zIndex = 100_000;
        props.addChild(overlay);
      }
    }
  }

  private buildAvatar(textures: SpriteTextures | null): void {
    if (!textures) {
      this.standing.addChild(drawAvatarStanding());
      const placeholder = drawAvatarSitting();
      placeholder.y = PLACEHOLDER_SEAT_HEIGHT; // placeholder is drawn from the floor, not the hip
      this.sitting.addChild(placeholder);
      return;
    }
    const sprite = (k: SpriteKey) => {
      const s = new Sprite(textures[k]);
      s.anchor.set(spriteManifest[k].anchor.x, spriteManifest[k].anchor.y);
      s.scale.set(sceneLayout.avatarScale);
      return s;
    };
    this.standing.addChild(drawContactShadow(26), sprite('avatar-stand'));
    this.sitting.addChild(sprite('avatar-sit-left-chair'));
  }

  private bindInput(): void {
    const stage = this.app.stage;
    stage.eventMode = 'static';
    stage.hitArea = this.app.screen; // screen rectangle, kept in sync by Pixi on resize
    stage.on('pointerdown', this.onPointerDown);
    stage.on('globalpointermove', this.onPointerMove);
    stage.on('pointerup', this.onPointerUp);
    stage.on('pointerupoutside', this.onPointerCancel);
    stage.on('pointercancel', this.onPointerCancel);
  }

  private onPointerDown = (e: FederatedPointerEvent) => {
    if (this.press) return; // single pointer only
    const p = { x: e.global.x, y: e.global.y };
    this.press = { pointerId: e.pointerId, start: p, last: p, dragging: false };
  };

  private onPointerMove = (e: FederatedPointerEvent) => {
    const press = this.press;
    if (!press || e.pointerId !== press.pointerId) return;
    const p = { x: e.global.x, y: e.global.y };
    if (!press.dragging && Math.hypot(p.x - press.start.x, p.y - press.start.y) > TAP_MOVE_THRESHOLD) {
      press.dragging = true;
      this.camTween = null; // the player's pan always wins over automatic framing
    }
    if (press.dragging) {
      this.camera = panCamera(this.camera, p.x - press.last.x);
      this.applyCamera();
    }
    press.last = p;
  };

  private onPointerUp = (e: FederatedPointerEvent) => {
    const press = this.press;
    if (!press || e.pointerId !== press.pointerId) return;
    this.press = null;
    if (press.dragging) return;
    const seat = findSeatAt(interactiveSeats, screenToWorld(this.camera, { x: e.global.x, y: e.global.y }));
    this.store.dispatch(seat ? { type: 'selectSeat', seatId: seat.id } : { type: 'clearSelection' });
  };

  private onPointerCancel = () => {
    this.press = null;
  };

  private handleResize(): void {
    const w = Math.max(this.host.clientWidth, 1);
    const h = Math.max(this.host.clientHeight, 1);
    this.app.renderer.resize(w, h);
    this.camTween = null;
    this.camera = resizeCamera(this.camera, w, h);
    this.applyCamera();
  }

  private applyCamera(): void {
    this.world.scale.set(this.camera.scale);
    this.world.position.set(-this.camera.x * this.camera.scale, 0);
    // Anchor for the React seat hint (bottom-left of the pill): just above the left chair's backrest.
    // Updated on every camera change, so the hint follows pans and automatic framing.
    const chair = sceneLayout.seats[0].position;
    const hint = worldToScreen(this.camera, { x: chair.x + SEAT_HINT_OFFSET.x, y: chair.y + SEAT_HINT_OFFSET.y });
    const app = this.host.parentElement;
    app?.style.setProperty('--seat-hint-x', `${hint.x}px`);
    app?.style.setProperty('--seat-hint-y', `${hint.y}px`);
  }

  /** Mirrors game state into display objects. */
  private sync(state: GameState, immediate = false): void {
    for (const [id, { glow, ring }] of this.markers) {
      const free = state.avatar.seatId !== id;
      const selected = state.selectedSeatId === id;
      glow.visible = free && !selected;
      ring.visible = free && selected;
    }

    // A newly selected chair that is cut off slides into view (no move if it is already visible).
    if (state.selectedSeatId !== this.renderedSelection) {
      this.renderedSelection = state.selectedSeatId;
      const selected = sceneLayout.seats.find((s) => s.id === state.selectedSeatId);
      if (selected && !immediate) {
        this.frameSpan(chairSpan(selected), SELECT_FRAME_MS);
      }
    }

    const seatId = state.avatar.seatId;
    if (seatId === this.renderedSeatId) return;
    this.renderedSeatId = seatId;
    const seat = seatId ? sceneLayout.seats.find((s) => s.id === seatId)! : null;
    // Standing, the avatar walks to the seat's approachPoint (free floor beside the chair);
    // on arrival it switches to the sitting pose at the sitPoint.
    const approach = seat ? offsetFrom(seat, seat.approachOffset) : sceneLayout.spawnPoint;
    if (immediate) {
      this.avatar.position.set(approach.x, approach.y);
      this.applyPose(seat);
      return;
    }
    this.applyPose(null); // stand up first if needed
    this.tween = { from: { x: this.avatar.x, y: this.avatar.y }, to: approach, elapsed: 0, seat };
    // Camera follows on x only, in lockstep with the walk: it frames where the avatar will end up
    // (approach point plus the chair), so the avatar stays on screen for the whole move.
    if (seat) {
      const [a, b] = chairSpan(seat);
      this.frameSpan([Math.min(a, approach.x + AVATAR_SPAN.left), Math.max(b, approach.x + AVATAR_SPAN.right)], SIT_TWEEN_MS);
    }
  }

  /**
   * Shows the standing pose where the avatar is, or the sitting pose at the seat's sitPoint.
   * Standing up from a seat puts the avatar back on that seat's approachPoint.
   */
  private applyPose(seat: SeatLayout | null): void {
    if (seat) {
      const sit = offsetFrom(seat, seat.sitOffset);
      this.avatar.position.set(sit.x, sit.y);
      this.sitting.scale.x = seat.sitMirrored ? -1 : 1; // mirrored around the hip anchor
      this.avatar.zIndex = seat.position.y + 1; // just in front of its chair
    } else {
      if (this.poseSeat) {
        const a = offsetFrom(this.poseSeat, this.poseSeat.approachOffset);
        this.avatar.position.set(a.x, a.y);
      }
      this.avatar.zIndex = this.avatar.y + 1;
    }
    this.poseSeat = seat;
    for (const [id, front] of this.chairFronts) front.visible = seat?.id === id;
    this.standing.visible = seat === null;
    this.sitting.visible = seat !== null;
  }

  /** Starts an automatic pan that brings [minX, maxX] into the safe zone; no-op if already there. */
  private frameSpan([minX, maxX]: [number, number], duration: number): void {
    const to = revealX(this.camera, minX, maxX, CAMERA_SAFE_MARGIN_PX);
    if (Math.abs(to - this.camera.x) < 0.5) return;
    if (this.reducedMotion) {
      this.camTween = null;
      this.camera = { ...this.camera, x: to };
      this.applyCamera();
      return;
    }
    this.camTween = { from: this.camera.x, to, elapsed: 0, duration };
  }

  private update = (ticker: Ticker) => {
    if (this.camTween) {
      const ct = this.camTween;
      ct.elapsed += ticker.deltaMS;
      const t = Math.min(ct.elapsed / ct.duration, 1);
      this.camera = { ...this.camera, x: ct.from + (ct.to - ct.from) * easeOutCubic(t) };
      this.applyCamera();
      if (t >= 1) this.camTween = null;
    }
    this.pulse += ticker.deltaMS;
    const selected = this.store.getState().selectedSeatId;
    // First visit: both chairs swell once over ~2s (static highlight with reduced motion).
    this.emphasisMs = Math.max(this.emphasisMs - ticker.deltaMS, 0);
    const swell = this.emphasisMs > 0 && !this.reducedMotion
      ? Math.sin(Math.PI * (1 - this.emphasisMs / SEAT_HINT_EMPHASIS_MS))
      : 0;
    for (const [id, { glow }] of this.markers) {
      if (id === selected) continue;
      glow.alpha = this.emphasisMs > 0 ? 1 : 0.55 + 0.45 * Math.sin(this.pulse / 600);
      glow.scale.set(1 + 0.6 * swell);
    }

    if (this.tween) {
      this.tween.elapsed += ticker.deltaMS;
      const t = Math.min(this.tween.elapsed / SIT_TWEEN_MS, 1);
      const ease = easeOutCubic(t);
      const { from, to } = this.tween;
      this.avatar.position.set(from.x + (to.x - from.x) * ease, from.y + (to.y - from.y) * ease);
      this.avatar.zIndex = this.avatar.y + 1; // standing: depth follows the feet
      if (t >= 1) {
        const { seat } = this.tween;
        this.tween = null;
        this.applyPose(seat);
        if (seat) this.settleMs = SETTLE_MS;
      }
    }

    // Small squash as feedback for sitting down.
    if (this.settleMs > 0) {
      this.settleMs = Math.max(this.settleMs - ticker.deltaMS, 0);
      const k = this.settleMs / SETTLE_MS;
      this.avatar.scale.set(1 + 0.06 * k, 1 - 0.06 * k);
    }
  };
}

function chairSpan(seat: SeatLayout): [number, number] {
  return [seat.position.x - CHAIR_HALF_WIDTH, seat.position.x + CHAIR_HALF_WIDTH];
}

function offsetFrom(seat: SeatLayout, offset: Point): Point {
  return { x: seat.position.x + offset.x, y: seat.position.y + offset.y };
}
