# Desktop Feature Zone Alignment PRD

## 1. Problem

The current desktop client feature zone does not match the business structure of the Web app.

Current desktop primary navigation is centered on:

- `All Sessions`
- `Labels`
- `Sources`
- `Skills`
- `Automations`
- `Settings`
- `What's New`

The Web app feature zone is centered on:

- `Start Chat`
- `Scheduled Tasks`
- `My Agents`
- `Channel Management`
- `Model Management`
- `Knowledge Base`
- `Recent Sessions`

The user wants the desktop app to move closer to the Web information architecture, while keeping part of the existing desktop navigation:

Keep:

1. `Source`
2. `Skill`
3. `Settings`
4. `What's New`

Remove:

- `Labels`

Add:

- `Scheduled Tasks`
- `Agents`
- `Channels`
- `Models`
- `Knowledge Base`

Adjust:

- `All Sessions`

## 1.1 Non-Negotiable Design Constraint

The desktop app should follow this rule:

1. functionally reference the Web app,
2. visually and interaction-wise remain a desktop Client product.

That means:

- information architecture can be aligned with Web,
- business modules can be aligned with Web,
- naming and feature grouping can reference Web,
- but UI style, layout rhythm, component language, interaction feel, and visual system must remain consistent with the existing desktop Client.

In short:

- `Function follows Web`
- `UI/UX follows Client`

## 2. Current Code Reality

### Web navigation source

The Web feature zone is directly defined in:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/app/(agent)/agent-module/_components/LeftPanel.tsx`

It already contains the desired top-level business entries:

- `Start Chat`
- `Scheduled Tasks`
- `My Agents`
- `Channel Management`
- `Model Management`
- `Knowledge Base`

### Desktop navigation source

The desktop left sidebar is currently assembled in:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/components/app-shell/AppShell.tsx`

Current top-level nav is built around:

- sessions
- labels
- sources
- skills
- automations
- settings
- what's new

### Important architectural constraint

Desktop navigation is not only visual.

It is backed by typed navigation state, routes, and parsers in:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/shared/types.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/shared/routes.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/shared/route-parser.ts`

Today the desktop app only has first-class navigator types for:

- `sessions`
- `sources`
- `skills`
- `automations`
- `settings`

That means adding `Agents / Channels / Models / Knowledge Base / Scheduled Tasks` is not just adding buttons.

## 3. Key Findings

### Finding 0: Web is the product reference, not the visual reference

Web should be used as the reference for:

- which modules exist,
- how modules are grouped,
- what the product wants users to do.

Web should **not** be used as the reference for:

- visual styling,
- spacing system,
- component library choices,
- navigation chrome styling,
- page shell composition,
- motion language.

Recommendation:

- reuse Client-side shell and component patterns,
- avoid copying Web page markup or Web-specific visual treatments directly into desktop.

### Finding 1: `Labels` is easy to remove from IA, but should not be hard-deleted first

`Labels` is deeply wired into:

- session filtering,
- batch actions,
- sidebar tree rendering,
- settings pages,
- session metadata.

Recommendation:

- remove `Labels` from the visible desktop navigation first,
- keep the underlying label data model and compatibility code for now,
- only do full label feature removal as a separate cleanup task later.

This minimizes regression risk.

### Finding 2: `All Sessions` currently carries too much product weight

Desktop `All Sessions` currently acts as the main product root:

- all sessions
- per-status subviews
- flagged
- archived
- label views
- custom views

This is structurally different from the Web app, where recent sessions are only one part of the system area.

Recommendation:

- downgrade `All Sessions` from the entire navigation backbone,
- turn it into a simpler `Recent Sessions` entry,
- move advanced filters like status/flagged/archived into the list panel toolbar or overflow actions instead of keeping them as primary left-nav structure.

### Finding 3: Not all Web modules have the same porting cost

Lower-cost modules:

- `Model Management`
- `Knowledge Base`

Reason:

- Web pages for these two are already thin wrappers around reusable panel components:
  - `@/components/ModelManagementPanel`
  - `@/components/KnowledgeBasePanel`

Medium-cost module:

- `Scheduled Tasks`

Reason:

- the page is fairly self-contained, but depends on agent/session stores and agent-scoped APIs.

Higher-cost modules:

- `Agents`
- `Channels`

Reason:

- these depend more heavily on Web-side Zustand stores, page composition, and interaction flows.

## 4. Options

### Option A: Navigation-only reshuffle

What changes:

- Remove `Labels` from desktop left nav.
- Keep `Sources`, `Skills`, `Settings`, `What's New`.
- Rename `All Sessions` to `Recent Sessions`.
- Add placeholder entries for:
  - `Scheduled Tasks`
  - `Agents`
  - `Channels`
  - `Models`
  - `Knowledge Base`

Pros:

- Lowest engineering risk.
- Fastest way to align the desktop IA with Web.
- Good first milestone if product wants the desktop shell to “look right” quickly.

Cons:

- New business entries do not yet deliver real functionality.
- Still leaves old navigation model underneath.

When to choose:

- If the immediate goal is information architecture alignment, not feature completion.

### Option B: Feature-aligned navigation refactor

What changes:

- Remove `Labels` from primary navigation.
- Replace `All Sessions` with `Recent Sessions`.
- Add real desktop modules for:
  - `Scheduled Tasks`
  - `Agents`
  - `Channels`
  - `Models`
  - `Knowledge Base`
- Keep `Sources`, `Skills`, `Settings`, `What's New`.
- Refactor typed desktop navigation so these new modules are first-class navigation states.

Pros:

- Aligns desktop IA and desktop capabilities.
- Avoids “fake menu items”.
- Creates a scalable structure for future desktop business modules.

Cons:

- Requires touching typed route/parser/navigation code.
- Larger implementation surface.

When to choose:

- If the desktop app is intended to become a real business console, not only a chat shell.

### Option C: Full Web parity on desktop

What changes:

- Make desktop left nav and content architecture closely mirror the Web app.
- Port the relevant Web stores/pages/components aggressively.

Pros:

- Maximum product consistency.

Cons:

- Highest risk.
- Most expensive.
- Forces a lot of Web-page assumptions into the desktop shell too early.

When to choose:

- Not recommended for the current phase.

## 5. Recommended Option

Recommend **Option B: Feature-aligned navigation refactor**.

Reason:

- The user explicitly wants real business modules, not only renamed navigation.
- The desktop app already has a structured typed navigation system.
- A clean first-class module model will be cheaper than adding temporary hacks and redoing them later.

## 6. Recommended Information Architecture

### Left sidebar

#### Group A: Action entry

- `Start Chat`

This should remain a top CTA button, replacing the current product emphasis on `New Session` as the only primary action.

#### Group B: Core work area

- `Recent Sessions`
- `Scheduled Tasks`
- `Agents`
- `Channels`
- `Models`
- `Knowledge Base`

#### Group C: Agent capability / system tools

- `Sources`
- `Skills`

#### Group D: App/meta

- `Settings`
- `What's New`

### Explicitly removed from primary nav

- `Labels`
- `Automations`

Important note:

- `Automations` should not be blindly renamed to `Scheduled Tasks`.
- Current desktop `Automations` and Web `Scheduled Tasks` are not the same product concept.
- If automations still matter, they should be moved to a secondary surface later, not remain in the primary nav.

## 7. Recommended Behavior Per Entry

## 7.1 UI/UX Rule For Every New Desktop Module

For every module added from Web inspiration:

- keep Client panel headers,
- keep Client navigation behavior,
- keep Client spacing and typography system,
- keep Client icon sizing and sidebar treatment,
- keep Client empty states, menus, and detail panel patterns.

Do not:

- transplant Web page containers directly,
- transplant Web-specific sticky header styling directly,
- transplant Web-specific card/grid look and feel directly,
- mix TDesign-style page language into the Client shell.

Practical rule:

- migrate product capability,
- re-express it with Client-native UI.

### Start Chat

Desktop behavior:

- keep the current top CTA pattern,
- keep keyboard shortcut support,
- preserve the existing “new session” flow,
- only update the wording to align with Web if desired.

### Recent Sessions

Desktop behavior:

- this becomes the desktop replacement for `All Sessions`,
- the second column still shows the session list,
- the right pane still shows chat detail.

Recommended simplification:

- rename title from `All Sessions` to `Recent Sessions`,
- remove `Labels` as a sibling navigation concept,
- move advanced filters such as status/flagged/archived into:
  - list toolbar,
  - search/filter dropdown,
  - context menus.

This keeps the session system powerful without making it dominate the whole product IA.

### Scheduled Tasks

Desktop behavior:

- new business module page,
- should be agent-scoped when relevant,
- can reuse the Web task API layer semantics.

Suggested pane model:

- second column: optional agent selector / task summary list,
- right pane: scheduled task management page.

### Agents

Desktop behavior:

- new business module page,
- should support:
  - agent list,
  - agent detail,
  - create agent,
  - possibly channel bindings as a sub-tab or child action.

Suggested pane model:

- second column: agent list,
- right pane: agent detail / create flow.

### Channels

Desktop behavior:

- separate business module,
- should not be hidden inside `Agents` if the product wants it as a first-class area.

Suggested pane model:

- second column: channel types / channel list,
- right pane: channel grid / status overview / drawer detail.

### Models

Desktop behavior:

- full-page business module,
- second column may be minimal or omitted,
- easiest candidate for first real port from Web.

### Knowledge Base

Desktop behavior:

- full-page business module,
- second column may be minimal or omitted,
- also a strong early-port candidate from Web.

### Sources / Skills / Settings / What's New

Desktop behavior:

- keep current desktop implementations,
- keep their current data model and interaction patterns,
- only reposition them within the new information architecture.

## 8. Recommended Navigation Architecture

### Recommendation: introduce one new desktop module navigator family

Instead of adding five completely separate top-level navigator types, introduce a new family:

- `module`

Possible subpages:

- `recent-sessions`
- `scheduled-tasks`
- `agents`
- `channels`
- `models`
- `knowledge-base`

And keep existing navigator families:

- `sources`
- `skills`
- `settings`

Why this is better:

- less type churn than adding many unrelated navigator kinds,
- easier route parsing,
- easier sidebar highlighting logic,
- easier future expansion.

### Suggested route shapes

- `module/recent-sessions`
- `module/scheduled-tasks`
- `module/agents`
- `module/channels`
- `module/models`
- `module/knowledge-base`
- existing `sources/*`
- existing `skills/*`
- existing `settings/*`

## 9. UI/Engineering Strategy

### Phase 1: Information architecture alignment

Scope:

- Remove visible `Labels` entry from desktop nav.
- Hide `labels` from desktop settings navigation.
- Rename `All Sessions` to `Recent Sessions`.
- Add nav entries for:
  - `Scheduled Tasks`
  - `Agents`
  - `Channels`
  - `Models`
  - `Knowledge Base`
- Reposition `Sources`, `Skills`, `Settings`, `What's New`.
- Do not hard-delete label logic yet.

Result:

- Desktop shell matches the desired product IA.

### Phase 2: Module scaffolding

Scope:

- Extend:
  - `shared/types.ts`
  - `shared/routes.ts`
  - `shared/route-parser.ts`
  - `NavigationContext`
  - `MainContentPanel`
- Add placeholder desktop pages for the new modules.
- Add list-title mapping and selection behavior.

Result:

- New business modules become first-class in navigation.

### Phase 3: Real module delivery

Recommended order:

1. `Models`
2. `Knowledge Base`
3. `Agents`
4. `Scheduled Tasks`
5. `Channels`

Reason:

- `Models` and `Knowledge Base` are already panelized on Web.
- `Agents` and `Scheduled Tasks` are important but need more state/API porting.
- `Channels` has the heaviest operational state and should come after the navigation model is stable.

## 10. Reuse Guidance From Web

### Best reuse candidates

- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/components/ModelManagementPanel.tsx`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/components/KnowledgeBasePanel.tsx`

### Reuse with adaptation

- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/app/(agent)/agent-module/(main)/scheduled-tasks/page.tsx`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/app/(agent)/agent-module/_lib/agentsStore.ts`

### Reuse only after extracting state contracts

- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/app/(agent)/agent-module/(main)/agents/page.tsx`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/app/(agent)/agent-module/(main)/agents/channels/page.tsx`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/app/(agent)/agent-module/_lib/channelsStore.ts`

## 11. Concrete Recommendation

If implementation starts next, the recommended first milestone is:

1. desktop left nav IA refactor,
2. remove `Labels` from primary nav,
3. rename `All Sessions` to `Recent Sessions`,
4. add the five requested business entries as first-class module placeholders,
5. keep `Sources`, `Skills`, `Settings`, `What's New`,
6. then implement `Models` and `Knowledge Base` first.

## 12. Final Decision

The desktop app should move from:

- a chat-centric navigation shell

to:

- a business-module shell where `Recent Sessions` is one module among several.

That is the correct direction to align desktop with the Web product without forcing a full Web parity rewrite.
