# 章鱼哥AI CLI Guide

`zhangyuge-agent` is the preferred interface for managing workspace config domains such as labels, sources, skills, and automations.

## Usage

```bash
zhangyuge-agent <entity> <action> [args] [--flags] [--json '<json>'] [--stdin]
```

### Global flags
- `zhangyuge-agent --help`
- `zhangyuge-agent --version`
- `zhangyuge-agent --discover`

### Input modes
- Flat flags for simple values
- `--json` for structured inputs
- `--stdin` for piped JSON object input

---

<!-- cli:label:start -->
## Label

Manage workspace labels stored under `labels/`.

### Commands
- `zhangyuge-agent label list`
- `zhangyuge-agent label get <id>`
- `zhangyuge-agent label create --name "<name>" [--color "<color>"] [--parent-id <id|root>] [--value-type string|number|date]`
- `zhangyuge-agent label update <id> [--name "<name>"] [--color "<color>"] [--value-type string|number|date|none] [--clear-value-type]`
- `zhangyuge-agent label delete <id>`
- `zhangyuge-agent label move <id> --parent <id|root>`
- `zhangyuge-agent label reorder [--parent <id|root>] <ordered-id-1> <ordered-id-2> ...`
- `zhangyuge-agent label auto-rule-list <id>`
- `zhangyuge-agent label auto-rule-add <id> --pattern "<regex>" [--flags "gi"] [--value-template "$1"] [--description "..."]`
- `zhangyuge-agent label auto-rule-remove <id> --index <n>`
- `zhangyuge-agent label auto-rule-clear <id>`
- `zhangyuge-agent label auto-rule-validate <id>`

### Examples

```bash
zhangyuge-agent label list
zhangyuge-agent label get bug
zhangyuge-agent label create --name "Bug" --color "accent"
zhangyuge-agent label create --name "Priority" --value-type number
zhangyuge-agent label update bug --json '{"name":"Bug Report","color":"destructive"}'
zhangyuge-agent label update priority --value-type none
zhangyuge-agent label move bug --parent root
zhangyuge-agent label reorder --parent root development content bug
zhangyuge-agent label auto-rule-add linear-issue --pattern "\\b([A-Z]{2,5}-\\d+)\\b" --value-template "$1"
zhangyuge-agent label auto-rule-list linear-issue
zhangyuge-agent label auto-rule-validate linear-issue
```

### Notes
- Use `--json` / `--stdin` for nested or bulk updates.
- IDs are stable slugs generated from name on create.
- Use `--value-type none` or `--clear-value-type` to remove a label value type.
<!-- cli:label:end -->

---

<!-- cli:source:start -->
## Source

Manage workspace sources stored under `sources/{slug}/`.

### Commands
- `zhangyuge-agent source list [--include-builtins true|false]`
- `zhangyuge-agent source get <slug>`
- `zhangyuge-agent source create` (see flags below)
- `zhangyuge-agent source update <slug> --json '{...}'`
- `zhangyuge-agent source delete <slug>`
- `zhangyuge-agent source validate <slug>`
- `zhangyuge-agent source test <slug>`
- `zhangyuge-agent source init-guide <slug> [--template generic|mcp|api|local]`
- `zhangyuge-agent source init-permissions <slug> [--mode read-only]`
- `zhangyuge-agent source auth-help <slug>`

### Flags for `source create`

| Flag | Description |
|------|-------------|
| `--name "<name>"` | **(required)** Source display name |
| `--provider "<provider>"` | **(required)** Provider identifier (e.g., `linear`, `github`) |
| `--type mcp\|api\|local` | **(required)** Source type |
| `--enabled true\|false` | Enable/disable source (default: `true`) |
| `--icon "<url-or-emoji>"` | Icon URL (auto-downloaded) or emoji |
| **MCP-specific** | |
| `--url "<url>"` | MCP server URL |
| `--transport http\|stdio` | MCP transport type |
| `--auth-type oauth\|bearer\|none` | MCP authentication type |
| **API-specific** | |
| `--base-url "<url>"` | **(required for api)** API base URL (must have trailing slash) |
| `--auth-type bearer\|header\|query\|basic\|none` | **(required for api)** API auth type |
| **Local-specific** | |
| `--path "<path>"` | **(required for local)** Filesystem path |

### Examples

```bash
zhangyuge-agent source list
zhangyuge-agent source get linear
# MCP source with flat flags
zhangyuge-agent source create --name "Linear" --provider "linear" --type mcp --url "https://mcp.linear.app/sse" --auth-type oauth
# MCP source with --json for nested config
zhangyuge-agent source create --name "Linear" --provider "linear" --type mcp --json '{"mcp":{"transport":"http","url":"https://mcp.linear.app/sse","authType":"oauth"}}'
# API source
zhangyuge-agent source create --name "Exa" --provider "exa" --type api --base-url "https://api.exa.ai/" --auth-type header
# Local source
zhangyuge-agent source create --name "Docs Folder" --provider "filesystem" --type local --path "~/Documents"
zhangyuge-agent source update linear --json '{"enabled":false}'
zhangyuge-agent source validate linear
zhangyuge-agent source test linear
zhangyuge-agent source init-guide linear --template mcp
zhangyuge-agent source init-permissions linear --mode read-only
zhangyuge-agent source auth-help linear
```

### Notes
- Use flat flags for simple values or `--json` for type-specific nested config fields (`mcp`, `api`, `local`).
- `init-guide` scaffolds a practical `guide.md` based on source type.
- `init-permissions` scaffolds read-only `permissions.json` patterns for Explore mode.
- `auth-help` returns the recommended in-session auth tool and mode.
- `test` is lightweight CLI validation; for full in-session auth/connection probing use `source_test` MCP tool.
<!-- cli:source:end -->

---

<!-- cli:skill:start -->
## Skill

Manage workspace skills stored under `skills/{slug}/SKILL.md`.

### Commands
- `zhangyuge-agent skill list [--workspace-only] [--project-root <path>]`
- `zhangyuge-agent skill get <slug> [--project-root <path>]`
- `zhangyuge-agent skill where <slug> [--project-root <path>]`
- `zhangyuge-agent skill create` (see flags below)
- `zhangyuge-agent skill update <slug> --json '{...}' [--project-root <path>]`
- `zhangyuge-agent skill delete <slug>`
- `zhangyuge-agent skill validate <slug> [--source workspace|project|global] [--project-root <path>]`

### Flags for `skill create`

| Flag | Description |
|------|-------------|
| `--name "<name>"` | **(required)** Skill display name |
| `--description "<desc>"` | **(required)** Brief description (1-2 sentences) |
| `--slug "<slug>"` | Custom slug (auto-generated from name if omitted) |
| `--body "..."` | Skill content/instructions (markdown body) |
| `--icon "<url>"` | Icon URL (auto-downloaded to `icon.*`) |
| `--globs "*.ts,*.tsx"` | Comma-separated glob patterns for auto-suggestion |
| `--always-allow "Bash,Write"` | Comma-separated tool names to always allow |
| `--required-sources "linear,github"` | Comma-separated source slugs to auto-enable |

### Examples

```bash
zhangyuge-agent skill list
zhangyuge-agent skill list --workspace-only
zhangyuge-agent skill where commit-helper
zhangyuge-agent skill create --name "Commit Helper" --description "Generate conventional commits" --slug commit-helper
zhangyuge-agent skill create --name "Code Review" --description "Review PRs" --globs "*.ts,*.tsx" --always-allow "Bash" --required-sources "github"
zhangyuge-agent skill update commit-helper --json '{"requiredSources":["github"],"body":"Use concise, imperative commit messages."}'
zhangyuge-agent skill validate commit-helper
zhangyuge-agent skill validate commit-helper --source global
zhangyuge-agent skill delete commit-helper
```

### Notes
- `create` / `update` write `SKILL.md` frontmatter and content body.
- Use `where` to inspect project/workspace/global resolution precedence.
- `--project-root` scopes resolution to a project directory (defaults to cwd).
<!-- cli:skill:end -->

---

<!-- cli:automation:start -->
## Automation

Manage workspace automations stored in `automations.json`.

### Commands
- `zhangyuge-agent automation list`
- `zhangyuge-agent automation get <id>`
- `zhangyuge-agent automation create` (see flags below)
- `zhangyuge-agent automation update <id>` (same flags as create, all optional)
- `zhangyuge-agent automation delete <id>`
- `zhangyuge-agent automation enable <id>`
- `zhangyuge-agent automation disable <id>`
- `zhangyuge-agent automation duplicate <id>`
- `zhangyuge-agent automation history [<id>] [--limit <n>]`
- `zhangyuge-agent automation last-executed <id>`
- `zhangyuge-agent automation test <id> [--match "..."]`
- `zhangyuge-agent automation lint`
- `zhangyuge-agent automation validate`

### Flags for `automation create` / `update`

| Flag | Description |
|------|-------------|
| `--event <EventName>` | **(required for create)** Event trigger (e.g., `UserPromptSubmit`, `SchedulerTick`, `LabelAdd`) |
| `--name "<name>"` | Display name for the automation |
| `--matcher "<regex>"` | Regex pattern for event matching |
| `--cron "<expression>"` | Cron expression (for `SchedulerTick` events) |
| `--timezone "<tz>"` | IANA timezone (e.g., `Europe/Budapest`) |
| `--permission-mode safe\|ask\|allow-all` | Permission level for created sessions |
| `--enabled true\|false` | Enable/disable the automation |
| `--labels "label1,label2"` | Comma-separated labels for created sessions |
| `--prompt "..."` | Prompt text (creates a prompt action automatically) |
| `--llm-connection "<slug>"` | LLM connection slug for the created session |
| `--model "<model-id>"` | Model ID for the created session |

### Examples

```bash
zhangyuge-agent automation list
zhangyuge-agent automation validate
# Simple prompt automation with flat flags
zhangyuge-agent automation create --event UserPromptSubmit --prompt "Summarize this prompt"
# Scheduled automation with flat flags
zhangyuge-agent automation create --event SchedulerTick --cron "0 9 * * 1-5" --timezone "Europe/Budapest" --prompt "Give me a morning briefing" --labels "Scheduled" --permission-mode safe
# Complex automation with --json
zhangyuge-agent automation create --event SchedulerTick --json '{"cron":"0 9 * * 1-5","actions":[{"type":"prompt","prompt":"Daily summary"}]}'
zhangyuge-agent automation update abc123 --name "Morning Report" --prompt "Updated prompt"
zhangyuge-agent automation update abc123 --enabled false
zhangyuge-agent automation enable abc123
zhangyuge-agent automation duplicate abc123
zhangyuge-agent automation history abc123 --limit 10
zhangyuge-agent automation last-executed abc123
zhangyuge-agent automation test abc123 --match "UserPromptSubmit"
zhangyuge-agent automation lint
zhangyuge-agent automation delete abc123
```

### Notes
- Use flat flags for simple automations or `--json` for complex matchers with multiple `actions`.
- `--prompt` is a shortcut that auto-wraps the text as a prompt action. Use `--json` with `actions` for multi-action automations.
- `lint` provides quick matcher/action hygiene checks (regex validity, missing actions, oversized prompt mention sets).
- `history` and `last-executed` read from `automations-history.jsonl` when present.
- `validate` runs full schema and semantic checks.
<!-- cli:automation:end -->

---

<!-- cli:permission:start -->
## Permission

Manage Explore mode permissions stored in `permissions.json` (workspace-level and per-source).

### Commands
- `zhangyuge-agent permission list`
- `zhangyuge-agent permission get [--source <slug>]`
- `zhangyuge-agent permission set [--source <slug>] --json '{...}'`
- `zhangyuge-agent permission add-mcp-pattern "<pattern>" [--comment "..."] [--source <slug>]`
- `zhangyuge-agent permission add-api-endpoint --method GET|POST|... --path "<regex>" [--comment "..."] [--source <slug>]`
- `zhangyuge-agent permission add-bash-pattern "<pattern>" [--comment "..."] [--source <slug>]`
- `zhangyuge-agent permission add-write-path "<glob>" [--source <slug>]`
- `zhangyuge-agent permission remove <index> --type mcp|api|bash|write-path|blocked [--source <slug>]`
- `zhangyuge-agent permission validate [--source <slug>]`
- `zhangyuge-agent permission reset [--source <slug>]`

### Scope

Without `--source`: operates on workspace-level `permissions.json` (global rules).
With `--source <slug>`: operates on that source's `permissions.json` (auto-scoped).

### Examples

```bash
# List all permissions files (workspace + sources)
zhangyuge-agent permission list
# Get workspace permissions
zhangyuge-agent permission get
# Get source-specific permissions
zhangyuge-agent permission get --source linear
# Add read-only MCP patterns for a source
zhangyuge-agent permission add-mcp-pattern "list" --comment "List operations" --source linear
zhangyuge-agent permission add-mcp-pattern "get" --comment "Get operations" --source linear
zhangyuge-agent permission add-mcp-pattern "search" --comment "Search operations" --source linear
# Add API endpoint rules
zhangyuge-agent permission add-api-endpoint --method GET --path ".*" --comment "All GET requests" --source stripe
# Add bash patterns
zhangyuge-agent permission add-bash-pattern "^ls\\s" --comment "Allow ls"
# Add write path globs
zhangyuge-agent permission add-write-path "/tmp/**"
# Remove a rule by index and type
zhangyuge-agent permission remove 1 --type mcp --source linear
# Replace entire config
zhangyuge-agent permission set --source github --json '{"allowedMcpPatterns":[{"pattern":"list","comment":"List ops"}]}'
# Validate all permissions
zhangyuge-agent permission validate
# Validate source-specific
zhangyuge-agent permission validate --source linear
# Delete permissions file (revert to defaults)
zhangyuge-agent permission reset --source linear
```

### Notes
- Source-level MCP patterns are auto-scoped at runtime (e.g., `list` becomes `mcp__<slug>__.*list`).
- `remove` uses 0-based index within the specified rule type array. Use `get` to see indices.
- `validate` runs schema + regex validation. Without `--source`, validates workspace + all sources.
- `reset` deletes the permissions file, reverting to defaults.
<!-- cli:permission:end -->

---

<!-- cli:theme:start -->
## Theme

Manage app-level and workspace-level theme settings.

### Commands
- `zhangyuge-agent theme get`
- `zhangyuge-agent theme validate [--preset <id>]`
- `zhangyuge-agent theme list-presets`
- `zhangyuge-agent theme get-preset <id>`
- `zhangyuge-agent theme set-color-theme <id>`
- `zhangyuge-agent theme set-workspace-color-theme <id|default>`
- `zhangyuge-agent theme set-override --json '{...}'`
- `zhangyuge-agent theme reset-override`

### Examples

```bash
# Inspect current theme state
zhangyuge-agent theme get

# Validate app override file
zhangyuge-agent theme validate

# Validate one preset file
zhangyuge-agent theme validate --preset nord

# List available presets
zhangyuge-agent theme list-presets

# Inspect a specific preset
zhangyuge-agent theme get-preset dracula

# Set app default preset
zhangyuge-agent theme set-color-theme nord

# Set workspace override
zhangyuge-agent theme set-workspace-color-theme dracula

# Clear workspace override (inherit app default)
zhangyuge-agent theme set-workspace-color-theme default

# Replace app-level theme.json override
zhangyuge-agent theme set-override --json '{"accent":"oklch(0.62 0.21 293)","dark":{"accent":"oklch(0.68 0.21 293)"}}'

# Remove app-level override file
zhangyuge-agent theme reset-override
```

### Notes
- `set-color-theme` and `set-workspace-color-theme` require an existing preset ID (`default` is always valid).
- `set-override` validates `theme.json` shape before writing.
- Workspace override is stored in `workspace/config.json` under `defaults.colorTheme`.
- App override is stored in `~/.zhangyuge-agent/theme.json`.
<!-- cli:theme:end -->

---

## Output contract

All commands return a single JSON envelope on stdout.

### Success
```json
{ "ok": true, "data": {}, "warnings": [] }
```

### Error
```json
{
  "ok": false,
  "error": {
    "code": "USAGE_ERROR",
    "message": "...",
    "suggestion": "..."
  },
  "warnings": []
}
```

Exit codes:
- `0` success
- `1` execution/internal failure
- `2` usage/validation/input failure
