import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import {
  createModelProvider,
  deleteModelProvider,
  getModelProvidersList,
  updateModelProvider,
  updateModelProviderStatus,
  type CreateModelProviderForm,
  type ModelProviderListQueryParams,
  type ProviderStatus,
  type UpdateModelProviderForm,
} from '@craft-agent/shared/account-api'
import type { RpcServer } from '@craft-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.modelProviders.LIST,
  RPC_CHANNELS.modelProviders.CREATE,
  RPC_CHANNELS.modelProviders.UPDATE,
  RPC_CHANNELS.modelProviders.DELETE,
  RPC_CHANNELS.modelProviders.SET_STATUS,
] as const

export function registerModelProvidersHandlers(server: RpcServer, deps: HandlerDeps): void {
  server.handle(RPC_CHANNELS.modelProviders.LIST, async (_ctx, params?: ModelProviderListQueryParams) => {
    return getModelProvidersList(params)
  })

  server.handle(RPC_CHANNELS.modelProviders.CREATE, async (_ctx, input: CreateModelProviderForm) => {
    return createModelProvider(input)
  })

  server.handle(RPC_CHANNELS.modelProviders.UPDATE, async (_ctx, id: number, input: UpdateModelProviderForm) => {
    return updateModelProvider(id, input)
  })

  server.handle(RPC_CHANNELS.modelProviders.DELETE, async (_ctx, id: number) => {
    await deleteModelProvider(id)
  })

  server.handle(RPC_CHANNELS.modelProviders.SET_STATUS, async (_ctx, id: number, status: ProviderStatus) => {
    await updateModelProviderStatus(id, status)
  })

  deps.platform.logger.info('Model providers RPC handlers registered')
}
