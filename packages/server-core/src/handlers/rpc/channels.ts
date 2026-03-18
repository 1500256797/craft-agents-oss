import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import {
  getChannelAccounts,
  getChannelsSnapshot,
  getChannelTypes,
  getUserChannels,
} from '@craft-agent/shared/account-api'
import type { RpcServer } from '@craft-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.channels.GET_TYPES,
  RPC_CHANNELS.channels.GET_USER_CHANNELS,
  RPC_CHANNELS.channels.GET_ACCOUNTS,
  RPC_CHANNELS.channels.GET_SNAPSHOT,
] as const

export function registerChannelsHandlers(server: RpcServer, deps: HandlerDeps): void {
  server.handle(RPC_CHANNELS.channels.GET_TYPES, async () => {
    return getChannelTypes()
  })

  server.handle(RPC_CHANNELS.channels.GET_USER_CHANNELS, async () => {
    return getUserChannels()
  })

  server.handle(RPC_CHANNELS.channels.GET_ACCOUNTS, async (_ctx, channelType: string) => {
    return getChannelAccounts(channelType)
  })

  server.handle(RPC_CHANNELS.channels.GET_SNAPSHOT, async () => {
    return getChannelsSnapshot()
  })

  deps.platform.logger.info('Channels RPC handlers registered')
}
