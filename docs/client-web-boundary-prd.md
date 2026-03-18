# Client / Web Boundary PRD

## 1. Goal

Define a clear boundary between:

- `chain-agent-client`: desktop client
- `chain-agent-web`: browser client

The goal is to keep them separate for now, while preventing duplicated product ownership, protocol drift, and architectural confusion.

## 2. Decision

Current decision:

- `Client` and `Web` stay as separate projects.
- They do not share a repo for now.
- They do not share UI code for now.
- They may align on backend contracts, domain concepts, and feature semantics.

This is the correct short-term decision because the two apps currently have different runtime assumptions, UI frameworks, state models, and release modes.

## 3. Product Role Split

### Client

`Client` is the desktop-first local workspace.

Primary role:

- local-first agent workspace,
- desktop-grade interaction,
- filesystem-heavy workflows,
- multi-window / native shell integration,
- richer local tooling and system integrations.

Typical strengths:

- local file access,
- native menus and shortcuts,
- desktop notifications,
- local process / terminal integration,
- multiple panels and windows,
- stronger offline-ish ergonomics.

### Web

`Web` is the browser-first remote workspace.

Primary role:

- lightweight access from browser,
- remote agent operations,
- account-based access and sharing,
- link-driven workflows,
- team-facing and remotely accessible surfaces.

Typical strengths:

- login + account flows,
- sharable URLs,
- remote access from any machine,
- lower install friction,
- public/private share surfaces,
- browser-friendly operations like VNC and hosted session views.

## 4. Ownership Boundary

### Client should own

- local workspace experience,
- native OS integrations,
- desktop productivity flows,
- local file browsing and opening,
- desktop-specific settings,
- local permissions UX,
- multi-window overlays and previews,
- desktop runtime packaging and update behavior.

### Web should own

- browser login and auth pages,
- account/profile/session access from browser,
- browser share flows,
- public or semi-public shared session pages,
- remote operations that do not require native desktop integration,
- hosted/browser VNC access,
- web-first onboarding.

### Shared at concept level, not code level

- agent
- session
- message
- tool event
- attachment
- share state
- permission state
- model selection semantics

That means:

- same business meaning,
- same backend contract if possible,
- different frontend implementation is acceptable.

## 5. Technical Boundary

### Do not share now

- UI components
- page routing
- state management implementation
- app shell layout
- theme system
- form components
- desktop/web interaction patterns

Reason:

- the cost of forced abstraction is higher than the benefit right now.

### Must align

- API schema
- websocket / SSE event schema
- core domain types
- error codes
- auth token semantics
- share/link semantics
- file metadata shape
- session status semantics

Reason:

- this is where divergence becomes expensive.

## 6. Recommended Contract Layer

Even with separate repos, these should be treated as shared contracts:

### Backend contract

- session CRUD
- session event streaming
- resume / interrupt behavior
- file upload / download / preview metadata
- share / revoke share
- model catalog and session model selection
- agent detail / agent workspace endpoints

### Domain vocabulary

Use the same names for the same things:

- `agent`
- `session`
- `turn`
- `tool_use`
- `attachment`
- `share_mode`
- `permission_request`
- `sandbox_status`

### Event model

If one app says:

- `running`
- `interrupted`
- `completed`
- `failed`

the other app should not invent parallel semantics unless there is a backend reason.

## 7. Anti-Patterns To Avoid

### Anti-pattern 1: UI reuse too early

Do not try to make the same component tree work in both Electron and Next right now.

Why:

- the surface similarities are misleading,
- runtime assumptions are different,
- the abstractions will be leaky.

### Anti-pattern 2: same feature, different meaning

Do not let `Client` and `Web` define different meanings for:

- session state,
- share state,
- model selection,
- tool event rendering rules.

Why:

- product inconsistency is worse than code duplication.

### Anti-pattern 3: backend contract drift

Do not let each frontend privately adapt to backend responses in incompatible ways.

Why:

- once both apps exist, backend drift becomes the highest-maintenance part.

## 8. Practical Working Model

### Client team mindset

Ask:

- does this require native desktop capabilities?
- is this primarily a local workspace interaction?
- does this improve heavy daily use on desktop?

If yes, it belongs primarily to `Client`.

### Web team mindset

Ask:

- does this need to work from a browser with no install?
- is this account-driven or share-driven?
- is this primarily remote access or link-based access?

If yes, it belongs primarily to `Web`.

### When both need it

Split it into:

1. shared backend semantics,
2. separate frontend implementation.

This is the default rule for now.

## 9. Feature Classification Rule

Use this rule when deciding ownership:

### Client-first features

- local workspace selection
- open in editor / reveal in finder
- native shortcut systems
- desktop overlays
- local permission controls
- local session file inspection tied to OS behavior

### Web-first features

- login / registration / OAuth callback pages
- browser share links
- public shared session view
- browser-hosted VNC/session access
- account and tenant oriented access flows

### Dual-surface features

- session list
- chat timeline
- tool event display
- model selection
- attachments
- session interruption/resume

For these:

- align data and semantics,
- allow separate UX and component implementation.

## 10. Minimal Governance

To keep the two projects separate without chaos, enforce these lightweight rules:

1. Backend API changes require checking both Client and Web impact.
2. New domain fields should be named consistently across both apps.
3. Event payload changes should be versioned or at least documented.
4. Shared feature semantics should be written down before implementation diverges.
5. UI does not need to match exactly, but user-facing meaning must match.

## 11. Near-Term Recommendation

For the next phase:

- keep `Client` focused on desktop execution quality,
- keep `Web` focused on browser access and remote workflows,
- invest in contract consistency rather than UI unification,
- defer code sharing until repeated pain proves a stable shared layer exists.

## 12. Summary

Short version:

- `Client` = desktop-native workbench
- `Web` = browser-native remote surface
- shared now = contracts and semantics
- not shared now = UI, routing, state, shell

That is the cleanest boundary for the current stage.
