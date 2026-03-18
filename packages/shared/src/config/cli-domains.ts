export type CliDomainNamespace = 'label' | 'source' | 'skill' | 'automation' | 'permission' | 'theme'

export interface CliDomainPolicy {
  namespace: CliDomainNamespace
  helpCommand: string
  workspacePathScopes: string[]
  readActions: string[]
  quickExamples: string[]
  /** Optional workspace-relative paths guarded for direct Bash operations */
  bashGuardPaths?: string[]
}

const POLICIES: Record<CliDomainNamespace, CliDomainPolicy> = {
  label: {
    namespace: 'label',
    helpCommand: 'zhangyuge-agent label --help',
    workspacePathScopes: ['labels/**'],
    readActions: ['list', 'get', 'auto-rule-list', 'auto-rule-validate'],
    quickExamples: [
      'zhangyuge-agent label list',
      'zhangyuge-agent label create --name "Bug" --color "accent"',
      'zhangyuge-agent label update bug --json \'{"name":"Bug Report"}\'',
    ],
    bashGuardPaths: ['labels/**'],
  },
  source: {
    namespace: 'source',
    helpCommand: 'zhangyuge-agent source --help',
    workspacePathScopes: ['sources/**'],
    readActions: ['list', 'get', 'validate', 'test', 'auth-help'],
    quickExamples: [
      'zhangyuge-agent source list',
      'zhangyuge-agent source get <slug>',
      'zhangyuge-agent source update <slug> --json "{...}"',
      'zhangyuge-agent source validate <slug>',
    ],
  },
  skill: {
    namespace: 'skill',
    helpCommand: 'zhangyuge-agent skill --help',
    workspacePathScopes: ['skills/**'],
    readActions: ['list', 'get', 'validate', 'where'],
    quickExamples: [
      'zhangyuge-agent skill list',
      'zhangyuge-agent skill get <slug>',
      'zhangyuge-agent skill update <slug> --json "{...}"',
      'zhangyuge-agent skill validate <slug>',
    ],
  },
  automation: {
    namespace: 'automation',
    helpCommand: 'zhangyuge-agent automation --help',
    workspacePathScopes: ['automations.json', 'automations-history.jsonl'],
    readActions: ['list', 'get', 'validate', 'history', 'last-executed', 'test', 'lint'],
    quickExamples: [
      'zhangyuge-agent automation list',
      'zhangyuge-agent automation create --event UserPromptSubmit --prompt "Summarize this prompt"',
      'zhangyuge-agent automation update <id> --json "{\"enabled\":false}"',
      'zhangyuge-agent automation history <id> --limit 20',
      'zhangyuge-agent automation validate',
    ],
    bashGuardPaths: ['automations.json', 'automations-history.jsonl'],
  },
  permission: {
    namespace: 'permission',
    helpCommand: 'zhangyuge-agent permission --help',
    workspacePathScopes: ['permissions.json', 'sources/*/permissions.json'],
    readActions: ['list', 'get', 'validate'],
    quickExamples: [
      'zhangyuge-agent permission list',
      'zhangyuge-agent permission get --source linear',
      'zhangyuge-agent permission add-mcp-pattern "list" --comment "All list ops" --source linear',
      'zhangyuge-agent permission validate',
    ],
    bashGuardPaths: ['permissions.json', 'sources/*/permissions.json'],
  },
  theme: {
    namespace: 'theme',
    helpCommand: 'zhangyuge-agent theme --help',
    workspacePathScopes: ['config.json', 'theme.json', 'themes/*.json'],
    readActions: ['get', 'validate', 'list-presets', 'get-preset'],
    quickExamples: [
      'zhangyuge-agent theme get',
      'zhangyuge-agent theme list-presets',
      'zhangyuge-agent theme set-color-theme nord',
      'zhangyuge-agent theme set-workspace-color-theme default',
      'zhangyuge-agent theme set-override --json "{\"accent\":\"#3b82f6\"}"',
    ],
    bashGuardPaths: ['config.json', 'theme.json', 'themes/*.json'],
  },
}

export const CLI_DOMAIN_POLICIES = POLICIES

export interface CliDomainScopeEntry {
  namespace: CliDomainNamespace
  scope: string
}

function dedupeScopes(scopes: string[]): string[] {
  return [...new Set(scopes)]
}

/**
 * Canonical workspace-relative path scopes owned by zhangyuge-agent CLI domains.
 * Use these for file-path ownership checks to avoid drift across call sites.
 */
export const ZHANGYUGE_AGENT_CLI_OWNED_WORKSPACE_PATH_SCOPES = dedupeScopes(
  Object.values(POLICIES).flatMap(policy => policy.workspacePathScopes)
)

/**
 * Canonical workspace-relative path scopes guarded for direct Bash operations.
 */
export const ZHANGYUGE_AGENT_CLI_OWNED_BASH_GUARD_PATH_SCOPES = dedupeScopes(
  Object.values(POLICIES).flatMap(policy => policy.bashGuardPaths ?? [])
)

/**
 * Namespace-aware workspace scope entries for zhangyuge-agent CLI owned paths.
 */
export const ZHANGYUGE_AGENT_CLI_WORKSPACE_SCOPE_ENTRIES: CliDomainScopeEntry[] = Object.values(POLICIES)
  .flatMap(policy => policy.workspacePathScopes.map(scope => ({ namespace: policy.namespace, scope })))

/**
 * Namespace-aware Bash guard scope entries.
 */
export const ZHANGYUGE_AGENT_CLI_BASH_GUARD_SCOPE_ENTRIES: CliDomainScopeEntry[] = Object.values(POLICIES)
  .flatMap(policy => (policy.bashGuardPaths ?? []).map(scope => ({ namespace: policy.namespace, scope })))

export interface BashPatternRule {
  pattern: string
  comment: string
}

/**
 * Derive the canonical Explore-mode read-only zhangyuge-agent bash patterns from
 * CLI domain policies. Keeps permissions regexes aligned with command metadata.
 */
export function getZhangyugeAgentReadOnlyBashPatterns(): BashPatternRule[] {
  const namespaces = Object.keys(POLICIES) as CliDomainNamespace[]
  const namespaceAlternation = namespaces.join('|')

  const rules: BashPatternRule[] = namespaces.map((namespace) => {
    const policy = POLICIES[namespace]
    const actions = policy.readActions.join('|')
    return {
      pattern: `^zhangyuge-agent\\s+${namespace}\\s+(${actions})\\b`,
      comment: `zhangyuge-agent ${namespace} read-only operations`,
    }
  })

  rules.push(
    { pattern: '^zhangyuge-agent\\s*$', comment: 'zhangyuge-agent bare invocation (prints help)' },
    { pattern: `^zhangyuge-agent\\s+(${namespaceAlternation})\\s*$`, comment: 'zhangyuge-agent entity help' },
    { pattern: `^zhangyuge-agent\\s+(${namespaceAlternation})\\s+--help\\b`, comment: 'zhangyuge-agent entity help flags' },
    { pattern: '^zhangyuge-agent\\s+--(help|version|discover)\\b', comment: 'zhangyuge-agent global flags' },
  )

  return rules
}

export function getCliDomainPolicy(namespace: CliDomainNamespace): CliDomainPolicy {
  return POLICIES[namespace]
}
