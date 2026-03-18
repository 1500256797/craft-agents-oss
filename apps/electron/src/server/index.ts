/**
 * Headless Bun entry point — runs the 章鱼哥AI server without Electron.
 *
 * Usage:
 *   ZHANGYUGE_AGENT_SERVER_TOKEN=<secret> bun run src/server/index.ts
 *
 * Environment:
 *   ZHANGYUGE_AGENT_SERVER_TOKEN   — required unless options override in host bootstrap
 *   ZHANGYUGE_AGENT_RPC_HOST       — bind address (default: 127.0.0.1)
 *   ZHANGYUGE_AGENT_RPC_PORT       — bind port (default: 9100)
 *   ZHANGYUGE_AGENT_APP_ROOT       — app root path (default: cwd)
 *   ZHANGYUGE_AGENT_RESOURCES_PATH — resources path (default: cwd/resources)
 *   ZHANGYUGE_AGENT_IS_PACKAGED    — 'true' for production (default: false)
 *   ZHANGYUGE_AGENT_VERSION        — app version (default: 0.0.0-dev)
 *   ZHANGYUGE_AGENT_DEBUG          — 'true' for debug logging
 */

process.env.ZHANGYUGE_AGENT_IS_PACKAGED ??= 'false'

await import('./start.ts')
