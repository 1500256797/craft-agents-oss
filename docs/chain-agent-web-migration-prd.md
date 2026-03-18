# Chain Agent Web Migration PRD

## 1. Goal

Move `../chain-agent-web` into the `chain-agent-client` monorepo in a way that:

- keeps the existing Chain Agent Web features working,
- avoids blocking on a full rewrite,
- creates a path to gradually share code with the current client repo.

## 2. Current State

### Target repo: `chain-agent-client`

- Monorepo based on workspace packages and `apps/*`.
- Main product is Electron, but the repo already contains a separate web app (`apps/viewer`).
- Shared layers already exist in `packages/*`, especially UI and business logic packages.
- `packages/ui` already exposes a `PlatformContext` abstraction designed for both Electron and web.

Implication:

- This repo is structurally suitable for hosting another web app.
- It is not just an Electron-only repo anymore.

### Source repo: `chain-agent-web`

- Single-app Next.js App Router project.
- Uses `next@16.1.0`, `react@19.2.3`, `react-dom@19.2.3`.
- Most business pages are client components (`'use client'`).
- Does not contain its own backend API routes under `app/api`; frontend talks directly to backend `http://localhost:6799`.
- Core business logic is concentrated in:
  - `app/(agent)/agent-module/_components/*`
  - `app/(agent)/agent-module/_lib/*`
  - `lib/api/*`
  - `lib/store/*`

Implication:

- It behaves more like a browser SPA hosted by Next than a heavily SSR-dependent app.
- The real migration difficulty is not SSR, but the app's custom state model, API layer, and websocket/SSE behavior.

## 3. Key Compatibility Findings

### What helps

1. `chain-agent-client` already supports multiple apps in one repo.
2. `chain-agent-client` already has a web app example (`apps/viewer`).
3. `packages/ui` was explicitly written with web/Electron platform abstraction in mind.
4. `chain-agent-web` is mostly client-side logic, so it can be migrated without preserving much server-side rendering behavior.

### What makes migration non-trivial

1. Framework mismatch:
   - target repo is centered around Bun workspaces + Vite/Electron + React 18,
   - source repo is Next 16 + React 19.
2. UI stack mismatch:
   - current repo UI centers on `@craft-agent/ui`, Radix, Jotai, custom renderer shell,
   - source repo uses TDesign, Zustand, Next navigation, Monaco, xterm, VNC, custom CSS.
3. State and protocol are app-specific:
   - `chain-agent-web` uses many dedicated Zustand stores and websocket helpers for agents, sessions, skills, models, connectors, and file panels.
4. Source app currently ignores TypeScript build errors in Next config.
5. Source app assumes browser-local auth storage and direct redirects to `/login`.

## 4. Feasibility Conclusion

### Verdict

It is convenient to migrate `Chain Agent Web` into this repo **as a separate web app inside the monorepo**.

It is **not convenient** to directly merge it into the existing Electron renderer or force it onto the existing shared UI architecture in one step.

In short:

- **Easy enough**: repo-level consolidation.
- **Not easy**: immediate deep architecture unification.

## 5. Options

### Option A: Direct Monorepo Import

Approach:

- Create `apps/chain-agent-web`.
- Move the current Next app in with minimal code changes.
- Keep its own routing, auth flow, Zustand stores, TDesign stack, and backend API contract.

Pros:

- Fastest path.
- Lowest functional risk.
- Lets you manage Electron client and Web client in one repo quickly.

Cons:

- Keeps two frontend stacks in one monorepo.
- React 19 / Next 16 will coexist with React 18 / Vite apps.
- Code sharing with existing `packages/ui` will remain limited at first.

When to choose:

- If your main goal is "put both projects in one repo soon".

### Option B: Staged Import + Gradual Extraction

Approach:

1. First perform Option A.
2. Then extract reusable parts from `chain-agent-web` into new packages:
   - API client
   - agent session stores/types
   - reusable business widgets
3. Only after that evaluate whether some UI should move toward existing shared packages.

Pros:

- Best balance between delivery speed and long-term maintainability.
- Avoids a rewrite-first trap.
- Gives you real runtime validation before deciding what deserves abstraction.

Cons:

- Still carries temporary duplication.
- Requires discipline to avoid "copy now, never refactor later".

When to choose:

- If your goal is "one repo now, gradual convergence later".

### Option C: Full Rewrite onto Current Client Architecture

Approach:

- Rebuild Chain Agent Web on top of the current repo's shared layers, renderer patterns, and package structure from day one.

Pros:

- Cleanest architecture if it succeeds.
- Maximizes long-term reuse.

Cons:

- Highest risk.
- Slowest path.
- Very likely to regress features such as terminal, VNC, file panel, share page, and session streaming.

When to choose:

- Only if you intentionally want a rewrite project, not a migration project.

## 6. Recommended Option

Recommend **Option B: Staged Import + Gradual Extraction**.

Reason:

- The repo structure already supports multiple apps.
- The source app is mostly client-side and can be preserved with relatively low framework friction.
- Forcing immediate unification would cost much more than the value it brings in the first phase.

## 7. Recommended Target Layout

### Phase 1 layout

```text
apps/
  electron/
  viewer/
  chain-agent-web/
packages/
  core/
  shared/
  ui/
```

Notes:

- Keep the imported app largely self-contained at first.
- Do not move its components into `packages/ui` immediately.
- Do not force Zustand-to-Jotai migration in phase 1.

### Phase 2 possible extraction

```text
packages/
  chain-agent-api/
  chain-agent-types/
  chain-agent-web-core/
```

Candidate extraction areas:

- `../chain-agent-web/app/(agent)/agent-module/_lib/api.ts`
- `../chain-agent-web/lib/api/*`
- `../chain-agent-web/app/(agent)/agent-module/_lib/types.ts`
- stable stores or protocol helpers used by multiple pages

## 8. Implementation Plan

### Phase 0: Baseline Inventory

1. Freeze the current `chain-agent-web` feature set and routes.
2. Record environment variables and backend dependencies.
3. Record the pages that must work on day one:
   - login
   - session list
   - chat
   - agent detail
   - share page
   - file upload / file panel
   - terminal
   - VNC

### Phase 1: Import as a New App

1. Create `apps/chain-agent-web` in this repo.
2. Move these directories first:
   - `app/`
   - `components/`
   - `hooks/`
   - `lib/`
   - `public/`
   - `types/`
3. Copy and adapt:
   - `package.json`
   - `next.config.ts`
   - `tsconfig.json`
   - `postcss.config.mjs`
4. Add root scripts:
   - `web:dev`
   - `web:build`
   - `web:start`
5. Keep `NEXT_PUBLIC_API_URL` unchanged initially.

### Phase 2: Make It Run Inside the Monorepo

1. Resolve workspace install behavior for Next 16 + React 19.
2. Ensure the app can run without breaking root Electron/Vite installs.
3. Fix path aliases and lint/typecheck scripts.
4. Remove obvious unsafe shortcuts such as ignored build errors if possible.

### Phase 3: Stabilize Runtime Behavior

1. Verify auth flow and local storage behavior.
2. Verify SSE/WebSocket session streaming.
3. Verify session list realtime reconciliation.
4. Verify terminal websocket path and VNC page.
5. Verify share page and file viewing/downloading.

### Phase 4: Extract Shared Business Modules

1. Extract API contracts and request helpers.
2. Extract protocol types.
3. Extract websocket/session helpers only after they are stable in the new location.
4. Keep UI extraction for last.

### Phase 5: Evaluate Architecture Convergence

Decide one of:

- keep `apps/chain-agent-web` as an independent web app in the monorepo,
- gradually align it with existing shared packages,
- or later replace selected pages with shared components from the current repo.

## 9. Major Risks

### Risk 1: React version split

- Current repo uses React 18 in existing apps.
- `chain-agent-web` uses React 19.
- If you try to share UI packages too early, you may hit duplicate React or incompatible peer dependency issues.

Mitigation:

- Keep the imported app isolated in phase 1.
- Do not depend on `@craft-agent/ui` immediately.

### Risk 2: Next-specific runtime assumptions

- The source app uses `next/navigation`, `next/image`, `next/font`, App Router layouts, and route groups.

Mitigation:

- Keep Next during initial import.
- Do not convert to Vite during the first migration step.

### Risk 3: Source app hides type errors

- `next.config.ts` currently sets `typescript.ignoreBuildErrors = true`.

Mitigation:

- Keep this only during bootstrap.
- Open a cleanup task to reduce hidden type debt after the app runs inside the monorepo.

### Risk 4: Backend contract is hard-coded around `localhost:6799`

- This is fine for local development, but fragile for integrated environments.

Mitigation:

- Standardize env handling after the app is imported and running.

## 10. First Concrete Actions

If we start implementation next, the first five actions should be:

1. create `apps/chain-agent-web/`,
2. copy the current Next app into it with minimal edits,
3. add root workspace scripts for Next dev/build/start,
4. run the imported app in isolation and fix path/env/install issues,
5. verify the login -> sessions -> chat path end to end.

## 11. Decision

Recommended migration strategy:

- **Move it in as an independent Next app first.**
- **Do not merge it into Electron renderer now.**
- **Do not force shared UI abstraction in phase 1.**
- **Extract reusable logic only after the imported app runs stably inside this monorepo.**
