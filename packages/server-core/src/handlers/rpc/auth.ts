import { RPC_CHANNELS } from '@zhangyuge-agent/shared/protocol'
import { getCredentialManager } from '@zhangyuge-agent/shared/credentials'
import {
  clearAccountSession,
  getAccountSessionState,
  getCaptchaId,
  getCaptchaImageDataUrl,
  getCurrentAccountUser,
  loginAccount,
  type AccountLoginInput,
} from '@zhangyuge-agent/shared/account-auth'
import { clearAllConfig } from '@zhangyuge-agent/shared/config'
import type { RpcServer } from '@zhangyuge-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'
import { requestClientConfirmDialog } from '@zhangyuge-agent/server-core/transport'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.auth.LOGIN,
  RPC_CHANNELS.auth.GET_CURRENT_USER,
  RPC_CHANNELS.auth.GET_SESSION_STATE,
  RPC_CHANNELS.auth.GET_CAPTCHA_ID,
  RPC_CHANNELS.auth.GET_CAPTCHA_IMAGE,
  RPC_CHANNELS.auth.LOGOUT,
  RPC_CHANNELS.auth.SHOW_LOGOUT_CONFIRMATION,
  RPC_CHANNELS.auth.SHOW_DELETE_SESSION_CONFIRMATION,
  RPC_CHANNELS.credentials.HEALTH_CHECK,
] as const

export function registerAuthHandlers(server: RpcServer, deps: HandlerDeps): void {
  server.handle(RPC_CHANNELS.auth.GET_SESSION_STATE, async () => {
    return getAccountSessionState()
  })

  server.handle(RPC_CHANNELS.auth.GET_CURRENT_USER, async () => {
    const session = await getAccountSessionState()
    if (!session.authenticated) {
      return null
    }

    try {
      return await getCurrentAccountUser()
    } catch (error) {
      deps.platform.logger.warn('Failed to fetch current account user, clearing desktop account session', error)
      await clearAccountSession()
      return null
    }
  })

  server.handle(RPC_CHANNELS.auth.GET_CAPTCHA_ID, async () => {
    return getCaptchaId()
  })

  server.handle(RPC_CHANNELS.auth.GET_CAPTCHA_IMAGE, async (_ctx, captchaId: string, reload?: boolean) => {
    return getCaptchaImageDataUrl(captchaId, Boolean(reload))
  })

  server.handle(RPC_CHANNELS.auth.LOGIN, async (_ctx, input: AccountLoginInput) => {
    try {
      await loginAccount(input)
      const user = await getCurrentAccountUser()
      return { success: true, user }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      deps.platform.logger.warn('Desktop account login failed', message)
      await clearAccountSession()
      return { success: false, error: message }
    }
  })

  // Show logout confirmation dialog (routed to client)
  server.handle(RPC_CHANNELS.auth.SHOW_LOGOUT_CONFIRMATION, async (ctx) => {
    const result = await requestClientConfirmDialog(server, ctx.clientId, {
      type: 'warning',
      buttons: ['Cancel', 'Log Out'],
      defaultId: 0,
      cancelId: 0,
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      detail: 'All conversations will be deleted. This action cannot be undone.',
    })
    // result.response is the index of the clicked button
    // 0 = Cancel, 1 = Log Out
    return result.response === 1
  })

  // Show delete session confirmation dialog (routed to client)
  server.handle(RPC_CHANNELS.auth.SHOW_DELETE_SESSION_CONFIRMATION, async (ctx, name: string) => {
    const result = await requestClientConfirmDialog(server, ctx.clientId, {
      type: 'warning',
      buttons: ['Cancel', 'Delete'],
      defaultId: 0,
      cancelId: 0,
      title: 'Delete Conversation',
      message: `Are you sure you want to delete: "${name}"?`,
      detail: 'This action cannot be undone.',
    })
    // result.response is the index of the clicked button
    // 0 = Cancel, 1 = Delete
    return result.response === 1
  })

  // Logout - clear all credentials and config
  server.handle(RPC_CHANNELS.auth.LOGOUT, async () => {
    try {
      await clearAccountSession()
      await clearAllConfig()

      deps.platform.logger.info('Logout complete - cleared all credentials and config')
    } catch (error) {
      deps.platform.logger.error('Logout error:', error)
      throw error
    }
  })

  // Credential health check - validates credential store is readable and usable
  // Called on app startup to detect corruption, machine migration, or missing credentials
  server.handle(RPC_CHANNELS.credentials.HEALTH_CHECK, async () => {
    const manager = getCredentialManager()
    return manager.checkHealth()
  })
}
