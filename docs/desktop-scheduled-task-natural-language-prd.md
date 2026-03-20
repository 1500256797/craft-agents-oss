# Desktop Scheduled Task Natural-Language UX PRD

## Background

The current `Scheduled Tasks` area is technically backed by `automations.json`, but the user-facing UX still behaves like a generic automation/config editor.

This creates three problems:

1. The page feels empty instead of actionable.
2. The primary creation path exposes implementation details (`automations.json`, `SchedulerTick`, generic automation concepts).
3. The existing interaction does not match the mental model of a domestic productivity tool where users expect to "create a scheduled task" in plain language.

The goal is to make `Scheduled Tasks` feel like a first-class product feature, while still persisting to the existing automations system underneath.

## Goals

1. Let users create a scheduled task in natural language.
2. Keep the main flow focused on `Scheduled Tasks`, not generic `Automations`.
3. Preserve the existing `automations.json` storage model under the hood.
4. Reuse as much of the current code structure as possible.

## Non-Goals

1. Redesign all automation types in this phase.
2. Replace `automations.json` storage in this phase.
3. Build a full visual automation builder for event-based and agentic automations in this phase.

## Options

### Option 1: Keep current generic automation editor

Pros:
- Lowest implementation cost

Cons:
- Still exposes technical concepts
- Does not solve the empty-state UX problem
- Not aligned with "scheduled task" mental model

### Option 2: Natural-language scheduled-task creation flow

Pros:
- Matches user expectation
- Fits current product style
- Can reuse current automation storage and runtime
- Allows a clear empty-state CTA

Cons:
- Requires a new dialog and task draft flow

Selected: Yes

### Option 3: Full structured task builder only

Pros:
- Strong validation and predictability

Cons:
- Higher interaction cost
- Worse first-run experience than natural language
- Less aligned with "similar to creating a data source" behavior

## Selected Approach

Use a dedicated `Create Scheduled Task` dialog with natural-language input as the primary interaction.

The core UX is:

1. User opens `Scheduled Tasks`
2. User clicks `Create Scheduled Task`
3. User types a natural-language instruction
4. System generates a task preview
5. User confirms creation
6. System writes a `SchedulerTick` matcher into `automations.json`

Advanced users can still access `Edit automations.json` as a secondary path.

## Information Architecture

Separate the product concept from the implementation concept:

- User-facing concept: `Scheduled Tasks`
- Implementation concept: `Automations > SchedulerTick`

The scheduled-task filtered view should have its own tone, copy, and primary action.

Event-based and agentic automations can remain under the generic automation model for now.

## Entry Points

### Scheduled Tasks Empty State

Primary button:
- `Create Scheduled Task`

Secondary action:
- `Advanced Configuration`

Empty-state copy:
- Title: `No scheduled tasks yet`
- Description: `Create recurring tasks in plain language, such as daily summaries, regular checks, or weekly reminders.`

### Scheduled Tasks Header

When the current automation filter is `scheduled`, the header `+` action should open the scheduled-task creation dialog instead of the generic automation editor.

### Automation Detail Page

For a scheduled task detail page:
- Keep `Edit` available
- Add `Advanced Configuration` as a secondary action

## Interaction Design

### 1. Create Scheduled Task Dialog

Dialog title:
- `Create Scheduled Task`

Top description:
- Keep minimal
- Example: `Describe what should run and when.`

Main input:
- Multi-line natural-language text area

Placeholder examples:
- `Every workday at 9:00, review new GitHub issues`
- `Every day at 18:30, summarize today's active sessions`
- `Every 30 minutes, check error logs in the workspace`

Suggested chips below input:
- `Every day at 9:00`
- `Every weekday at 18:00`
- `Every 30 minutes`

Primary button:
- `Generate Task`

Secondary button:
- `Cancel`

### 2. Generated Preview Card

After generation, show a structured preview inside the same dialog:

- Task name
- Repeat schedule
- Timezone
- Action summary
- Permission mode
- Labels
- Enabled status

Example preview:

- Name: `Morning GitHub Review`
- Repeats: `Every weekday at 09:00`
- Timezone: `Asia/Shanghai`
- Action: `Review new GitHub issues and summarize priorities`
- Permission mode: `Explore`
- Status: `Enabled`

Primary button:
- `Confirm Create`

Secondary buttons:
- `Back`
- `Cancel`

### 3. Ambiguous Input Handling

If the input is ambiguous, do not write immediately.

Show a clarification state in the dialog:

- `I need one more detail to finish this task`

Examples:
- Missing time: `When should this run?`
- Missing frequency: `Should this run once a day, every weekday, or every hour?`
- Missing action: `What should this task do at that time?`

This should behave like a focused assistant prompt, not a raw config edit.

## List View Design

The scheduled-task list should emphasize task operations, not automation internals.

Each row should show:

- Task name
- Next run time
- Last run time
- Short action summary
- Enabled toggle
- Overflow actions

Overflow actions:
- `Edit`
- `Run Test`
- `Pause` / `Enable`
- `Duplicate`
- `Delete`
- `Advanced Configuration`

Do not surface:
- `SchedulerTick`
- raw event names
- raw matcher index
- raw JSON structure

## Detail View Design

For scheduled tasks, the detail page should read like a task page.

Sections:

1. `Schedule`
2. `Action`
3. `Settings`
4. `Run History`
5. `Advanced Configuration`

Preferred labels:

- `Repeats`
- `Timezone`
- `Next runs`
- `What this task does`
- `Permission mode`
- `Labels`

Avoid leading with:
- `Event`
- `Automation`
- `Matcher`

## Copy Strategy

Use user-facing language:

- `Scheduled Task`
- `Create Scheduled Task`
- `Repeats`
- `Next run`
- `Last run`
- `Pause`
- `Resume`

Keep implementation language secondary:

- `Advanced Configuration`
- `Edit automations.json`

## Mapping to Existing Architecture

The current system already supports scheduled automations via `SchedulerTick`.

Persist the final task as a matcher under:

```json
{
  "version": 2,
  "automations": {
    "SchedulerTick": [
      {
        "id": "abc123",
        "name": "Morning GitHub Review",
        "cron": "0 9 * * 1-5",
        "timezone": "Asia/Shanghai",
        "permissionMode": "safe",
        "labels": ["scheduled"],
        "enabled": true,
        "actions": [
          {
            "type": "prompt",
            "prompt": "Review new GitHub issues and summarize priorities."
          }
        ]
      }
    ]
  }
}
```

If `automations.json` does not exist, the creation flow should create it automatically.

## Recommended Implementation Phasing

### Phase 1

Ship the new UX for scheduled tasks only.

Changes:

1. Add a dedicated `CreateScheduledTaskDialog`
2. Replace the scheduled-view empty state CTA
3. Replace the scheduled-view header `+` action
4. Keep advanced JSON editing as a secondary path

### Phase 2

Improve the preview and editing experience.

Changes:

1. Add editable structured fields in the preview step
2. Add suggested schedules and quick edits
3. Improve task row presentation

### Phase 3

Decide whether to bring the same pattern to event-based and agentic automations.

## Renderer Component Plan

Recommended new components:

- `ScheduledTasksEmptyState`
- `CreateScheduledTaskDialog`
- `ScheduledTaskDraftPreview`
- `ScheduledTaskRow`

Recommended integration points:

- Replace the scheduled-filter empty state in `AutomationsListPanel`
- Replace the scheduled-filter `+` behavior in `AppShell`
- Keep `AutomationInfoPage` but adjust labels when `event === 'SchedulerTick'`

## API / Data Flow Recommendation

### Minimal-change path

Reuse the existing mini-agent pattern under a dedicated scheduled-task dialog:

1. User writes natural language
2. A focused assistant generates or applies the task
3. The result is persisted to `automations.json`

This is the fastest path because it aligns with the current `EditPopover` architecture.

### Preferred long-term path

Add a dedicated create RPC:

- `automations:createScheduledTaskDraft`
- `automations:createScheduledTask`

Suggested flow:

1. Parse natural language into a structured draft
2. Show preview
3. Confirm
4. Persist

This gives stronger control and validation than direct file editing.

## Success Criteria

1. A first-time user can create a scheduled task without seeing `automations.json`.
2. The empty state feels actionable rather than blank.
3. Scheduled-task creation takes one primary flow, not multiple technical concepts.
4. The generated task appears immediately in the scheduled list after creation.
5. Advanced users can still edit the underlying config when needed.
