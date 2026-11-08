# Little Saigon Café — Cà Phê Vỉa Hè

> *"Ngoài kia vội quá, vào đây ngồi chút."*
> Out there everyone's in a hurry. Come in and sit for a while.

A cozy, mobile-first browser game inspired by Saigon's sidewalk cafés. There are no quests, timers or scores. You pull up a little folding chair under a striped awning, watch the street, and take a breather.

## What you can do right now

The first milestone, **First Seat**, is playable:

- **Wander the storefront.** A hand-painted café panorama, explored by dragging sideways.
- **Pick a chair.** Tap either chair at the little table, or switch your choice before you commit.
- **Sit down.** Your character walks over and settles into the chair. The armrest overlaps them, so they look like they sit *in* the chair, not on top of it.
- **Change seats.** Already sitting? Tap the other chair to move. You confirm first, so a stray tap never moves you.
- **A gentle camera.** It slides only when a chair or your character would leave the screen, and it never fights your own drag.
- **First-visit nudge.** A quiet "Chạm vào ghế để chọn chỗ ngồi" hint that shows once per session.
- **Considerate by default.** It respects `prefers-reduced-motion`, and the confirmation bar works with the keyboard (Esc closes it).

The interface speaks friendly Vietnamese, like the café itself. There is no sign-up, chat, payment or backend.

## Tech stack

- **React 19 + TypeScript** for UI overlays (hint, confirmation bar, toast).
- **PixiJS 8** for the 2D café scene and in-scene touch input, used directly without `@pixi/react`.
- **Vite 8** for dev server and build.
- **Vitest + React Testing Library** for unit and integration tests.
- **Playwright Test** for end-to-end tests on phone (360/390 px) and desktop (1440 px) viewports.
- **ESLint** and **GitHub Actions** CI (lint, typecheck, unit, build, E2E on every pull request).

Game logic (`src/game/`) is plain TypeScript and stays independent of PixiJS. The scene lives in `src/pixi/`, and the React UI in `src/ui/`. Artwork is in `public/assets/`, and design references are in `docs/design/`.

## Getting started

Requires **Node.js 26** (see `.nvmrc`).

```bash
npm install
npm run dev
```

Then open the URL Vite prints. The game is designed for portrait phones first, so try your browser's device mode.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run test:e2e` | Playwright E2E tests (builds and serves the app on port 4319) |

Before the first E2E run, install the browser with `npx playwright install chromium`.

## Status

**Early development.** First Seat is the first finished vertical slice.

**Next milestone: Order First Drink.** You'll be able to order a virtual drink from your seat. It isn't built yet.
