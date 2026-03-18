# Local-First Agent / Workspace Unification PRD

## 1. Background

The product is moving toward a local-first model:

- a user logs in and starts with a local agent,
- when needed, the user creates a remote agent on the server,
- both local and remote agents should feel like part of one coherent product model.

Today the desktop client still uses `Workspace` as the primary local object, while the sidebar also exposes an `Agents` module. This creates a vocabulary conflict:

- a `Workspace` is effectively a local agent container,
- the user also sees `Agents` as a top-level area,
- the same account can therefore appear to have both "workspaces" and "agents" as first-class nouns.

This conflict increases cognitive load and makes the local-first strategy harder to explain.

## 2. Problem Statement

The product currently mixes two different primary nouns:

- `Workspace` for local scope, local files, settings, and switching,
- `Agent` for the account-level entity list and future remote capabilities.

As a result, users cannot easily answer:

- Am I switching environments, or switching agents?
- Is a local workspace different from a local agent?
- Why are server-side entities called agents, but local entities called workspaces?

## 3. Goals

- Define one user-facing primary noun across local and remote modes.
- Preserve the local-first product model.
- Avoid a risky, large-scale internal rename of stable storage and runtime models.
- Make room for future remote-agent features without semantic drift.

## 4. Non-Goals

- Rewriting all internal type names from `Workspace` to `Agent`.
- Changing storage layout, folder structure, or session persistence model in phase 1.
- Implementing full remote-agent management in this PRD.

## 5. Current State

### Product / UX signals

- The client has a workspace switcher and workspace creation flow.
- The sidebar exposes an `Agents` module as a first-class navigation item.
- The `Agents` module is currently a desktop placeholder, which means naming can still be corrected before full feature porting.

### Technical signals

- `Workspace` is a real core model with local path semantics (`rootPath`, local config, local settings).
- Existing settings, permissions, sources, and sessions are scoped to a workspace.
- Shared vocabulary docs already lean toward `agent` as the domain noun for cross-surface consistency.

## 6. Options Considered

### Option A: Workspace-first everywhere

Use `Workspace` as the single primary noun and rename agent-facing surfaces accordingly.

Pros:

- aligns with current desktop storage model,
- minimizes local UI rename risk,
- preserves current topbar and settings terminology.

Cons:

- remote/server entities are not naturally "workspaces",
- "create remote workspace" is semantically awkward,
- cross-platform domain language becomes less consistent,
- future web and backend surfaces will still tend to use `agent`.

### Option B: Agent-first in product, Workspace as implementation detail

Use `Agent` as the product noun, while retaining `Workspace` internally for local environment/container semantics.

Pros:

- matches the local-first story directly,
- makes local and remote entities symmetrical,
- fits remote/server capabilities naturally,
- avoids large internal migration,
- aligns with shared domain vocabulary.

Cons:

- requires user-facing renames in desktop,
- needs a clear relationship model between local agent and workspace,
- needs careful copy updates to avoid breaking current user intuition.

### Option C: Keep both nouns as co-equal

Continue using `Workspace` and `Agent` as separate first-class concepts.

Pros:

- lowest immediate change cost,
- no migration work.

Cons:

- preserves the current confusion,
- weakens local-first product clarity,
- makes future documentation and onboarding harder.

## 7. Recommendation

Adopt **Option B**.

### Core principle

`Agent` is the product-level object.

`Workspace` is the local environment/container of a local agent.

### Canonical relationship model

- `Local Agent = 1 Workspace`
- `Remote Agent != Workspace`
- `Workspace` should not compete with `Agent` as a top-level user-facing noun

This keeps the model simple:

- users chat with an agent,
- some agents are local,
- some agents are remote,
- local agents happen to own a workspace on disk.

## 8. Terminology Model

### User-facing terms

- `智能体 / Agent`: the primary entity
- `本地智能体 / Local Agent`: an agent backed by local workspace/runtime
- `远程智能体 / Remote Agent`: an agent backed by server runtime
- `工作区 / Workspace`: an advanced environment term used only when discussing files, directory, permissions, and local environment settings

### Internal terms

- keep `Workspace` in data models, storage, IPC, and config for now
- introduce optional UI-level view models or adapters where needed:
  - `AgentListItem`
  - `AgentKind = 'local' | 'remote'`
  - `LocalAgentWorkspaceBinding`

## 9. Information Architecture

### Top-level navigation

Use `智能体` as the primary noun for the entity layer.

Suggested model:

- sidebar `智能体`
- list contains both local and remote agents
- each row carries a badge: `本地` or `远程`
- creation action offers:
  - `创建本地智能体`
  - `创建远程智能体`

### Top bar switcher

Current `WorkspaceSwitcher` should become an agent-oriented selector in product copy.

Recommended labels:

- title: `当前智能体`
- empty state: `选择智能体`
- add action: `新增本地智能体`

Behavior:

- if it only switches local items in phase 1, label it `本地智能体`
- once remote fast-switch is supported, promote it to `智能体`

### Settings architecture

Do not keep `Workspace` as a peer top-level noun in user mental model.

Recommended structure:

- `智能体设置`
- section: `环境与目录`
- section: `权限`
- section: `默认 Sources`
- section: `高级`

In implementation, the existing workspace settings page can remain, but UI copy should shift from "workspace as product object" to "workspace as local environment details".

## 10. Copy Mapping

### Phase 1 copy changes

| Current copy | New copy | Notes |
| --- | --- | --- |
| Workspace | 本地智能体 / 智能体 | depends on context |
| Add Workspace | 新增本地智能体 | creation flow |
| Select workspace | 选择本地智能体 | topbar phase 1 |
| Workspace Settings | 智能体设置 | product-level title |
| Workspace Info | 智能体信息 | if user-facing summary is agent-oriented |
| Default working directory | 默认工作目录 | keep unchanged |
| Workspace permissions | 智能体环境权限 / 工作区权限 | choose one consistent term |

### Where `Workspace` should remain visible

- advanced/local-environment contexts,
- file-path and working-directory explanations,
- migration/debug/engineering surfaces,
- internal config docs where precision matters more than product polish.

## 11. UI Behavior Rules

### Agent list

Each item should show:

- name,
- kind badge (`本地` / `远程`),
- status if remote transport exists,
- optional local path hint only inside detail or settings views.

### Local agent detail

Show:

- agent name,
- linked local directory,
- local permissions mode,
- enabled sources,
- local tools/runtime details.

### Remote agent detail

Show:

- agent name,
- owner/account metadata,
- channel bindings,
- model/runtime configuration,
- remote-only capabilities.

### Avoid

- showing both "workspace" and "agent" as parallel first-level headings in the same flow,
- forcing remote entities into workspace metaphors,
- leaking `rootPath` and storage concepts into general navigation copy.

## 12. Implementation Strategy

### Phase 1: Vocabulary alignment

Goal:

- unify visible copy without changing core data models.

Changes:

- rename sidebar, switcher, creation flow, and settings copy,
- define agent-vs-workspace terminology rules in docs,
- add local/remote badges in any future agent lists.

Likely file areas:

- `apps/electron/src/renderer/components/app-shell/WorkspaceSwitcher.tsx`
- `apps/electron/src/renderer/components/workspace/*`
- `apps/electron/src/locales/en.json`
- `apps/electron/src/locales/zh-CN.json`
- `apps/electron/src/shared/module-registry.ts`
- `apps/electron/src/shared/settings-registry.ts`

### Phase 2: IA alignment

Goal:

- make `Agents` the coherent home for entity management.

Changes:

- implement the desktop `Agents` page,
- show local and remote agents in one list,
- keep workspace-only controls inside local-agent detail/settings,
- add explicit create-local/create-remote entry points.

### Phase 3: Data adapter layer

Goal:

- reduce future confusion between UI terminology and storage terminology.

Changes:

- add UI view models that map `Workspace` to `LocalAgent`,
- define shared DTOs for agent list and detail rendering,
- preserve backward compatibility for IPC and persistence.

## 13. Risks

### Risk: over-renaming causes implementation churn

Mitigation:

- keep internal `Workspace` names stable,
- limit phase 1 to copy and view-model terminology.

### Risk: users still need to understand local directory semantics

Mitigation:

- keep `工作区` only in environment-specific settings/help text,
- explicitly show "本地智能体绑定到一个本地工作区目录" where needed.

### Risk: partial rename creates more inconsistency

Mitigation:

- use a single terminology table as the source of truth,
- update nav, settings, onboarding, and creation flow together.

## 14. Success Criteria

- A new user can understand that they start with a local agent by default.
- A user can distinguish local vs remote agents without learning workspace internals first.
- The desktop client no longer presents `Workspace` and `Agent` as competing top-level nouns.
- Internal storage/runtime code remains stable through phase 1.

## 15. Immediate Next Actions

1. Approve the terminology decision: `Agent` user-facing, `Workspace` implementation-facing.
2. Apply copy changes in desktop shell and localization files.
3. Convert the current `Agents` placeholder into the actual unified agent entry point.
4. Add a small terminology note to onboarding/help docs so the model is explicit.
