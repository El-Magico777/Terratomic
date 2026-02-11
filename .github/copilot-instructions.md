# Terratomic – AI coding agent guide

This repo is a TypeScript, ESM-first mono-app: a browser client built with Webpack talking to a clustered Node server. The shared game logic lives in `src/core` and runs in both environments.

## Architecture map

- Client (entry: `src/client/Main.ts`)
  - Lit-based web components, PIXI rendering, Tailwind styles.
  - Dev server on port 9000; proxies to backend and worker websockets.
  - Example: joining games and UI wiring lives in `src/client/*Modal.ts`, networking/events in `src/client/Transport.ts`.
- Core shared logic (`src/core`)
  - Game model, executors, schemas, pathfinding, validations.
  - Example: `src/core/GameRunner.ts` drives turns and filters updates (e.g., submarine stealth via `filterUpdatesForClient`).
  - Lightweight event system: `src/core/EventBus.ts`.
- Server (entry: `src/server/Server.ts`)
  - Node cluster master/worker split (`Master.ts`, `Worker.ts`), game coordination in `GameManager.ts` and websocket handling in `GameServer.ts`/`Client.ts`.
  - Config comes from `src/core/configuration/ConfigLoader` and `Config` enums; `GAME_ENV=dev|prod` gates behavior.
  - Gatekeeping/rate-limits live under `src/server/gatekeeper` (lint-ignored for now).
- Assets & data
  - Static assets in `resources/` copied to `static/` on build (maps under `resources/maps` are excluded).
  - Proprietary images (optional) in `proprietary/images` also copied to `static/images`.

## Dev, build, test

- Install and run locally
  - `npm install`
  - `npm run dev` starts client (9000 with proxies to server) and server workers with `GAME_ENV=dev`.
- Server-only
  - `npm run start:server-dev` (dev env); `npm run start:server` (prod env, no proxies).
- Bundles
  - `npm run build-dev` | `npm run build-prod`. Outputs to `static/` with content-hashed filenames. Entry is `src/client/Main.ts`.
- Utilities
  - Generate terrain maps: `npm run build-map` (TS loader via ts-node/esm).
  - Perf micro-benchmarks: `npm run perf` runs `tests/perf/*.ts` via tsx.
- Tests & lint
  - `npm test` uses Jest + @swc/jest with ESM TS. Coverage thresholds set in `jest.config.ts`.
  - `npm run lint` (ESLint flat config + Prettier). Lint-staged + Husky enforce fixes on commit.

## Conventions and pitfalls specific to this repo

- ESM everywhere
  - `"type": "module"`; use `import`/`export` only—no `require`/`module.exports`.
  - Jest maps extensioned imports: `"^(\\.{1,2}/.*)\\.js$": "$1"`. In TS source, import without `.js` and let tooling handle it.
- Shared code boundaries
  - Code in `src/core` must stay isomorphic (no DOM/Node-only APIs). Server/client specifics live in `src/server` or `src/client`.
- Networking
  - Client dev server proxies: `/socket` → backend (ws:3000), `/w0|/w1|/w2` → worker processes (ws/http ports 3001–3003). Keep these paths stable when adding endpoints.
- Build wiring
  - Webpack copies `resources/**` to `static/` (except `resources/maps/**`) and `proprietary/images/**` to `static/images/`. Add new static assets under these roots.
- Logging/telemetry
  - Server uses Winston; optional OpenTelemetry exporters are present—prefer existing `OtelResource.ts` if instrumenting.

## Good starting points (examples)

- Add a new UI module: place a Lit element under `src/client/components/`, import it in `Main.ts`, wire events via `EventBus`.
- Extend game logic: add execution under `src/core/execution/**` and surface view updates through `GameUpdates` consumed by `GameRunner`.
- Add a server API: implement handler in `src/server/GameServer.ts` (or worker), ensure proxy path is listed in `webpack.config.js` devServer `proxy`.

## Licensing notes

- Code: AGPLv3 (see `LICENSE`).
- Assets in `resources/`: CC BY-SA 4.0; keep attribution; do not relicense.
- `proprietary/` has separate terms; see `CLA.md` and `proprietary/LICENSE`.

## Work tracking and validation requirements

### Progress file maintenance

- Update `PROGRESS.md` after completing each significant step
- Add entries under "Recent Work" section with date, status, summary, files modified, and type check result
- Update "Last Updated" timestamp and "Current Session" status
- Keep progress file current during multi-step tasks (not just at the end)

### Type checking requirements

- Run `npx tsc --noEmit` after any TypeScript file changes
- Run type check before marking implementation tasks as complete
- Run type check before committing or finalizing work
- Document type check results in PROGRESS.md entries
- If type errors are found, fix them before proceeding to next task
- Documentation-only changes (`.md` files) can skip type checks

### Validation workflow

1. Complete a work step (file edits, new files, etc.)
2. Run `npx tsc --noEmit` if any `.ts` files were modified
3. Fix any type errors that appear
4. Update PROGRESS.md with step completion and type check result
5. Proceed to next step only after validation passes

### When to skip type checks

- Documentation-only changes (markdown files)
- Configuration file changes (unless they affect TypeScript compilation)
- Asset or resource file changes
- Always document skip reason in PROGRESS.md as "⏭️ Skipped (reason)"
