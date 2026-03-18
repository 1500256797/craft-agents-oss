/**
 * @zhangyuge-agent/shared
 *
 * Shared business logic for 章鱼哥AI.
 * Used by the Electron app.
 *
 * Import specific modules via subpath exports:
 *   import { ZhangyugeAgent } from '@zhangyuge-agent/shared/agent';
 *   import { loadStoredConfig } from '@zhangyuge-agent/shared/config';
 *   import { getCredentialManager } from '@zhangyuge-agent/shared/credentials';
 *   import { 章鱼哥AIMcpClient } from '@zhangyuge-agent/shared/mcp';
 *   import { debug } from '@zhangyuge-agent/shared/utils';
 *   import { loadSource, createSource, getSourceCredentialManager } from '@zhangyuge-agent/shared/sources';
 *   import { createWorkspace, loadWorkspace } from '@zhangyuge-agent/shared/workspaces';
 *
 * Available modules:
 *   - agent: ZhangyugeAgent SDK wrapper, plan tools
 *   - auth: OAuth, token management, auth state
 *   - clients: 章鱼哥AI API client
 *   - config: Storage, models, preferences
 *   - credentials: Encrypted credential storage
 *   - mcp: MCP client, connection validation
 *   - prompts: System prompt generation
 *   - sources: Workspace-scoped source management (MCP, API, local)
 *   - utils: Debug logging, file handling, summarization
 *   - validation: URL validation
 *   - version: Version and installation management
 *   - workspaces: Workspace management (top-level organizational unit)
 */

// Export branding (standalone, no dependencies)
export * from './branding.ts';
