export type RecentDirScenario = 'none' | 'few' | 'many'

const RECENT_DIR_SCENARIO_DATA: Record<RecentDirScenario, string[]> = {
  none: [],
  few: [
    '/Users/demo/projects/zhangyuge-agent',
    '/Users/demo/projects/zhangyuge-agent/apps/electron',
    '/Users/demo/projects/zhangyuge-agent/packages/shared',
  ],
  many: [
    '/Users/demo/projects/zhangyuge-agent',
    '/Users/demo/projects/zhangyuge-agent/apps/electron',
    '/Users/demo/projects/zhangyuge-agent/apps/viewer',
    '/Users/demo/projects/zhangyuge-agent/apps/cli',
    '/Users/demo/projects/zhangyuge-agent/packages/shared',
    '/Users/demo/projects/zhangyuge-agent/packages/server-core',
    '/Users/demo/projects/zhangyuge-agent/packages/pi-agent-server',
    '/Users/demo/projects/zhangyuge-agent/packages/ui',
    '/Users/demo/projects/zhangyuge-agent/scripts',
  ],
}

/** Return a copy of the fixture list for the selected scenario. */
export function getRecentDirsForScenario(scenario: RecentDirScenario): string[] {
  return [...RECENT_DIR_SCENARIO_DATA[scenario]]
}
