# Little Saigon Café — Cà Phê Vỉa Hè

> "Ngoài kia vội quá, vào đây ngồi chút."

A cozy virtual Vietnamese sidewalk café where people can relax, spend time alone, or casually connect with others. The experience must feel **peaceful, welcoming, playful, and distinctly Vietnamese**.

## Visual Direction

- Cozy, hand-crafted 2D cartoon aesthetic in a slightly isometric / 3/4 perspective.
- Warm lighting, soft pastel palette.
- Sidewalk café details: blue plastic stools, small tables, iced coffee, motorbikes, plants, a sleeping cat.
- Visual quality, atmosphere, and delightful interactions come first.
- Avoid generic SaaS aesthetics, glassmorphism, and corporate dashboard patterns.
- Once the approved concept image is added to the repository, treat it as the primary visual reference.

## MVP Scope (first vertical slice)

In scope:
- Enter without registration.
- Choose a nickname and a simple avatar.
- Explore a small café scene.
- Select a chair and sit down.
- Order a virtual drink.
- Use simple emotes and predefined greetings.
- Responsive on desktop and mobile.

Out of scope (do not implement): multiplayer, free-form chat, authentication, payments, any backend.

## Tech Stack

- React + TypeScript + Vite (Node 26, see `.nvmrc`).
- **PixiJS v8** renders the 2D world and handles in-scene input; **React** renders UI overlays. No `@pixi/react` — `src/pixi/CafeScene.ts` is mounted/destroyed from `src/ui/CafeCanvas.tsx`.
- Game state (`src/game/gameState.ts`) and scene layout (`src/game/sceneLayout.ts`) are plain TS, independent of PixiJS. Camera math lives in `src/game/camera.ts` (world 2400×1000 units, fit-to-height, horizontal pan).
- **Mobile-first**: design and verify portrait phone (390×844) before desktop. Touch only, tap vs drag distinguished by a movement threshold.
- Game artwork goes in `public/assets/`; create subfolders only when needed. Variable text (menus, chalkboards) is rendered by React, never baked into images.
- Quality tooling: ESLint, Vitest + React Testing Library (unit/integration), Playwright Test (`e2e/`, E2E smoke tests), GitHub Actions (`.github/workflows/ci.yml`). Playwright Test is separate from the Playwright MCP used for manual visual checks.
- Prefer lightweight, browser-first solutions suited to an interactive scene.
- Keep the architecture simple and extensible.
- Do not add a library without explaining why it is needed.

## Development Workflow

- Use the `frontend-design` skill for significant UI implementation tasks.
- Use Playwright MCP (configured in `.mcp.json`) to inspect the rendered UI, test interactions, and capture screenshots.
- Compare UI screenshots against the approved visual reference.
- Never claim visual verification without actually inspecting the rendered UI.
- Read only the project guidance and files directly relevant to the task; do not restate project context in replies.
- Small, clear tasks: implement directly, no plan. Large tasks or architectural decisions: present a short plan first.
- Ask only when a key decision is missing or there is a real risk of going out of scope.
- Do not expand scope beyond the request.
- Prefer delivering a small, working, reviewable increment over a large unfinished one.
- Search for relevant symbols/files before reading large parts of the codebase; avoid repository-wide scans and verbose command output.

## Testing Strategy & Resource Efficiency

Test according to risk and scope — the smallest check that confirms the change works.

| Change type | Verification |
|---|---|
| Pure UI / visual | Playwright + screenshot of the affected screen |
| Interaction | Only the affected user flows |
| Logic | Related unit tests |
| Docs / non-UI config | No Playwright, no test run needed |

- Run typecheck, lint, or build only when relevant to the change.
- Do not automatically run the full test suite or E2E regression, and do not generate large numbers of test cases for small changes.
- Do not run tests in watch mode unless asked.
- Do not re-run passing tests when the related code has not changed.
- Before broad or time-consuming test runs, explain why and ask the developer for permission.
- Never claim something was tested unless it was actually run.

## Git Safety

- Never commit, push, force-push, or delete branches without explicit approval.
- Do not refactor unrelated files.
- Preserve existing repository configuration (`.gitignore`, `.mcp.json`, etc.).
- Never commit secrets, credentials, or generated Playwright artifacts (`.playwright-mcp/`, screenshots, traces).

## Language & Communication

- Communicate with the developer in **Vietnamese**; developer prompts may also be in Vietnamese.
- Keep source code, identifiers, comments, and technical documentation in **English**.
- Player-facing content (UI text, dialogue, menus, notifications) defaults to **natural, friendly Vietnamese** with the character of a sidewalk café.
- Never switch the game UI to English on your own initiative.
- Explain significant technical decisions concisely.

## Task Reports

Default report (Vietnamese, short):

- **Kết quả:** 1–3 sentences on the main change and completion status.
- **Đã sửa:** at most 3–5 important changes; do not re-explain agreed technical details.
- **Kiểm thử:** one line, e.g. `Lint ✓ · Typecheck ✓ · Unit 11/11 ✓ · Build ✓ · E2E 4/4 ✓`; details only on failure.
- **Cần duyệt:** the most important screenshot(s) (1–3) and any new issue or decision needed, else `Không có`.

Avoid repetition: do not list unchanged files/config/values, do not repeat known issues (only new, affected, or blocking ones), do not re-explain confirmed causes unless new evidence changes the conclusion, and mention Git status only when the task involves Git.

Long reports only for complex bugs, regressions, architecture changes, significant trade-offs, or when detailed analysis is requested — conclusion first, evidence after.

Brevity never justifies skipping needed tests or visual checks, or hiding errors, risks, or unexpected changes. Do not create separate report files unless asked.
