/**
 * Centralized path configuration for 章鱼哥AI.
 *
 * Supports multi-instance development via ZHANGYUGE_AGENT_CONFIG_DIR environment variable.
 * When running from a numbered folder (e.g., zhangyuge-agent-tui-1), the detect-instance.sh
 * script sets ZHANGYUGE_AGENT_CONFIG_DIR to ~/.zhangyuge-agent-1, allowing multiple instances to run
 * simultaneously with separate configurations.
 *
 * Default (non-numbered folders): ~/.zhangyuge-agent/
 * Instance 1 (-1 suffix): ~/.zhangyuge-agent-1/
 * Instance 2 (-2 suffix): ~/.zhangyuge-agent-2/
 */

import { homedir } from 'os';
import { join } from 'path';

// Allow override via environment variable for multi-instance dev
// Falls back to default ~/.zhangyuge-agent/ for production and non-numbered dev folders
export const CONFIG_DIR = process.env.ZHANGYUGE_AGENT_CONFIG_DIR || join(homedir(), '.zhangyuge-agent');
