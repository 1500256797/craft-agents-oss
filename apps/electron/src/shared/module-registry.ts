export interface ModulePageDefinition {
  id: string
  label: string
  description: string
}

export const MODULE_PAGES = [
  { id: 'scheduled-tasks', label: 'Scheduled Tasks', description: 'Manage recurring jobs for agents' },
  { id: 'agents', label: 'Agents', description: 'Manage local and remote agents' },
  { id: 'channels', label: 'Channels', description: 'Manage channel connections and account status' },
  { id: 'models', label: 'Models', description: 'Manage model providers and model availability' },
  { id: 'knowledge-base', label: 'Knowledge Base', description: 'Manage indexed documents and retrieval sources' },
] as const satisfies readonly ModulePageDefinition[]

export type ModuleSubpage = (typeof MODULE_PAGES)[number]['id']

export const VALID_MODULE_SUBPAGES: readonly ModuleSubpage[] = MODULE_PAGES.map(page => page.id)

export function isValidModuleSubpage(value: string): value is ModuleSubpage {
  return VALID_MODULE_SUBPAGES.includes(value as ModuleSubpage)
}

export function getModulePage(id: ModuleSubpage): ModulePageDefinition {
  const page = MODULE_PAGES.find(page => page.id === id)
  if (!page) throw new Error(`Unknown module page: ${id}`)
  return page
}
