/**
 * Centralized branding assets for 章鱼哥AI
 * Used by OAuth callback pages
 */

export const ZHANGYUGE_AGENT_LOGO = [
  '  ████████ █████████    ██████   ██████████ ██████████',
  '██████████ ██████████ ██████████ █████████  ██████████',
  '██████     ██████████ ██████████ ████████   ██████████',
  '██████████ ████████   ██████████ ███████      ██████  ',
  '  ████████ ████  ████ ████  ████ █████        ██████  ',
] as const;

/** Logo as a single string for HTML templates */
export const ZHANGYUGE_AGENT_LOGO_HTML = ZHANGYUGE_AGENT_LOGO.map((line) => line.trimEnd()).join('\n');

/** Session viewer base URL */
export const VIEWER_URL = 'https://agents.zhangyuge-agent.local';
