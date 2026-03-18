/**
 * Config Types (Browser-safe)
 *
 * Pure type definitions for configuration.
 * Re-exports from @zhangyuge-agent/core for compatibility.
 */

// Re-export all config types from core (single source of truth)
export type {
  Workspace,
  McpAuthType,
  AuthType,
  OAuthCredentials,
} from '@zhangyuge-agent/core/types';

export type UiLanguage = 'system' | 'en' | 'zh-CN';
export type ResolvedUiLanguage = Exclude<UiLanguage, 'system'>;

/** App-level network proxy configuration. */
export interface NetworkProxySettings {
  enabled: boolean;
  httpProxy?: string;
  httpsProxy?: string;
  noProxy?: string;
}
