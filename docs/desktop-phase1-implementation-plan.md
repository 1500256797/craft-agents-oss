# Desktop Phase 1 Implementation Plan

## 1. Scope

Phase 1 covers two product corrections:

1. desktop homepage and bootstrap flow correction,
2. desktop feature-zone information architecture correction.

This phase does **not** aim to fully deliver all new business modules.

Phase 1 goal:

- make the desktop shell structurally correct,
- keep existing desktop UI language,
- prepare clean extension points for later module delivery.

## 2. Non-Negotiable Rule

Phase 1 implementation must follow:

- `Function follows Web`
- `UI/UX follows Client`

Meaning:

- product flow and feature grouping may reference Web,
- visual implementation must remain native to the current Client shell.

## 3. Deliverables

### Deliverable A: login becomes the real homepage

Expected result:

- app no longer opens directly into onboarding on first launch,
- account login is checked before setup needs,
- onboarding only appears after successful login when setup is incomplete.

### Deliverable B: feature zone IA is corrected

Expected result:

- remove `Labels` from visible primary navigation,
- keep `Sources`, `Skills`, `Settings`, `What's New`,
- change `All Sessions` to `Recent Sessions`,
- add first-class entries for:
  - `Scheduled Tasks`
  - `Agents`
  - `Channels`
  - `Models`
  - `Knowledge Base`

### Deliverable C: new modules can exist as placeholders

Expected result:

- desktop navigation can route to these business modules,
- right content area can show placeholder pages,
- no need to fully port all module internals in this phase.

## 4. Implementation Strategy

Do Phase 1 in this order:

1. bootstrap/login correction
2. navigation state extension
3. sidebar IA reshaping
4. placeholder module pages
5. labels visibility reduction

Reason:

- bootstrap and auth are top-level gates,
- navigation state must exist before sidebar links can target it,
- sidebar changes should not be done on top of unstable route/state assumptions.

## 5. Workstream A: Login Homepage

### A1. Add `login` to renderer app state

Primary file:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/App.tsx`

Current state enum:

- `loading`
- `onboarding`
- `reauth`
- `ready`

Target state enum:

- `loading`
- `login`
- `onboarding`
- `reauth`
- `ready`

Change needed:

- stop treating `getSetupNeeds()` as the first gate,
- insert an account-session bootstrap check before onboarding.

### A2. Add desktop login screen

Suggested new file:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/components/auth/LoginScreen.tsx`

Suggested reuse:

- visual composition can borrow structure from:
  - `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/components/onboarding/ReauthScreen.tsx`
  - `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/components/onboarding/primitives`

Important:

- do not visually clone Web login page,
- do not put provider/API-key onboarding controls into login.

### A3. Introduce account-session IPC surface

Current issue:

- desktop transport/channel map has:
  - `logout`
  - `getAuthState`
  - `getSetupNeeds`
- but no real:
  - `login`
  - `getCurrentUser`
  - `refreshAuthToken`
  - `getAccountSessionState`

Primary files:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/packages/shared/src/protocol/channels.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/shared/types.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/transport/channel-map.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/main/handlers/`

Minimum new RPCs recommended:

- `auth:login`
- `auth:getCurrentUser`
- `auth:getSessionState`
- `auth:refreshToken`

Keep existing:

- `auth:logout`

### A4. Implement backend-auth integration using Web auth contract

Reference contract:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/lib/api/rbac/auth.ts`

Reference endpoints:

- `POST /api/v1/login`
- `GET /api/v1/current/user`
- `POST /api/v1/current/logout`
- `POST /api/v1/current/refresh-token`

Desktop recommendation:

- implement these in main-process/server-owned code,
- do not make renderer own token truth directly.

### A5. Change startup state machine

Primary file:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/App.tsx`

Target startup flow:

1. `loading`
2. check account session
3. if no session -> `login`
4. if session exists -> fetch current user
5. if current user fails -> `reauth` or `login`
6. if current user succeeds -> call `getSetupNeeds()`
7. if setup incomplete -> `onboarding`
8. else -> `ready`

## 6. Workstream B: Navigation Architecture

### B1. Extend typed desktop navigation

Current desktop navigation model only supports:

- `sessions`
- `sources`
- `skills`
- `automations`
- `settings`

Primary files:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/shared/types.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/shared/routes.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/shared/route-parser.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/contexts/NavigationContext.tsx`

Recommended change:

- add a new navigation family for business modules.

Suggested module IDs:

- `recent-sessions`
- `scheduled-tasks`
- `agents`
- `channels`
- `models`
- `knowledge-base`

Suggested route shapes:

- `module/recent-sessions`
- `module/scheduled-tasks`
- `module/agents`
- `module/channels`
- `module/models`
- `module/knowledge-base`

### B2. Update main content routing

Primary file:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/components/app-shell/MainContentPanel.tsx`

Needed:

- support the new module navigation states,
- render placeholder module pages for now,
- keep existing renderers for:
  - sources
  - skills
  - settings
  - session chat

## 7. Workstream C: Left Sidebar IA Reshaping

### C1. Rebuild top-level nav groups

Primary file:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/components/app-shell/AppShell.tsx`

Current left nav is assembled inline there.

Target left nav order:

1. `Start Chat`
2. `Recent Sessions`
3. `Scheduled Tasks`
4. `Agents`
5. `Channels`
6. `Models`
7. `Knowledge Base`
8. `Sources`
9. `Skills`
10. `Settings`
11. `What's New`

### C2. Downgrade the current session-centric hierarchy

Primary file:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/components/app-shell/AppShell.tsx`

Change:

- replace visible `All Sessions` title with `Recent Sessions`,
- stop presenting labels as a peer top-level branch,
- move advanced session filtering emphasis out of primary IA.

Important:

- session filtering logic can remain under the hood in Phase 1,
- this is an IA reduction, not a data-model deletion.

### C3. Remove visible `Labels` navigation entry

Primary files:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/components/app-shell/AppShell.tsx`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/components/app-shell/SidebarMenu.tsx`

Phase 1 action:

- remove `nav:labels` from visible sidebar,
- stop exposing label editing from primary nav context menus,
- keep label internals intact for compatibility.

## 8. Workstream D: Settings Visibility Cleanup

### D1. Hide labels settings from the visible settings navigator

Primary files:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/shared/settings-registry.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/pages/settings/settings-pages.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/shared/route-parser.ts`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/components/app-shell/sidebar-types.ts`

Phase 1 recommendation:

- remove `labels` from the visible settings registry,
- keep the page component temporarily if compatibility requires it,
- do not hard-delete label management internals yet.

## 9. Workstream E: Placeholder Module Pages

### E1. Add placeholder business pages

Suggested new files:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/pages/modules/RecentSessionsPage.tsx`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/pages/modules/ScheduledTasksPage.tsx`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/pages/modules/AgentsPage.tsx`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/pages/modules/ChannelsPage.tsx`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/pages/modules/ModelsPage.tsx`
- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/pages/modules/KnowledgeBasePage.tsx`

Client-style rule:

- these should use existing Client panel/page patterns,
- they should not import Web page layout containers directly.

### E2. Early real-module candidates

After placeholders, these are the best first real ports:

1. `Models`
2. `Knowledge Base`

Reason:

- Web implementations are already panel-oriented:
  - `/Users/ouhuang/Desktop/agent_server/chain-agent-web/components/ModelManagementPanel.tsx`
  - `/Users/ouhuang/Desktop/agent_server/chain-agent-web/components/KnowledgeBasePanel.tsx`

## 10. Risk Controls

### Risk 1: login flow leaks Web visuals into desktop

Control:

- build login using Client-native shell and reusable desktop primitives.

### Risk 2: label removal breaks session features

Control:

- remove label navigation first,
- keep label storage/filter internals for now.

### Risk 3: navigation expansion becomes too invasive

Control:

- add a module-family abstraction instead of many unrelated navigator types.

### Risk 4: new modules are visible but non-functional

Control:

- make placeholder screens explicit and honest,
- then replace them incrementally in later phases.

## 11. Acceptance Criteria

Phase 1 is complete when:

1. launching desktop no longer goes directly to onboarding for logged-out users,
2. desktop shows a real login homepage,
3. successful login leads to onboarding only when setup is incomplete,
4. left sidebar no longer shows `Labels`,
5. left sidebar shows the requested new business entries,
6. `Sources`, `Skills`, `Settings`, `What's New` remain intact,
7. all new visible navigation entries can open valid desktop pages,
8. UI still feels like the existing Client, not like the Web app transplanted into Electron.

## 12. Recommended Next Step

If implementation starts next, the first coding batch should be:

1. add auth/login bootstrap state,
2. add desktop login screen,
3. add auth RPC contracts,
4. add module navigation type skeleton,
5. reshape sidebar links,
6. add placeholder module pages.
