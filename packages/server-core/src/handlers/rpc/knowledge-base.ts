import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import {
  createDocumentIndexAsync,
  createKnowledgeBase,
  deleteDocumentIndex,
  deleteKnowledgeBase,
  getDocumentIndexList,
  getKnowledgeBaseList,
  getKnowledgeTaskStatus,
  updateKnowledgeBase,
  type KnowledgeBaseCreateForm,
  type KnowledgeBaseQueryParams,
  type KnowledgeBaseUpdateForm,
} from '@craft-agent/shared/account-api'
import { validateFilePath } from '@craft-agent/server-core/handlers'
import type { RpcServer } from '@craft-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.knowledgeBase.LIST,
  RPC_CHANNELS.knowledgeBase.CREATE,
  RPC_CHANNELS.knowledgeBase.UPDATE,
  RPC_CHANNELS.knowledgeBase.DELETE,
  RPC_CHANNELS.knowledgeBase.LIST_DOCUMENTS,
  RPC_CHANNELS.knowledgeBase.UPLOAD_DOCUMENT,
  RPC_CHANNELS.knowledgeBase.DELETE_DOCUMENT,
  RPC_CHANNELS.knowledgeBase.GET_TASK_STATUS,
] as const

export function registerKnowledgeBaseHandlers(server: RpcServer, deps: HandlerDeps): void {
  server.handle(RPC_CHANNELS.knowledgeBase.LIST, async (_ctx, params?: KnowledgeBaseQueryParams) => {
    return getKnowledgeBaseList(params)
  })

  server.handle(RPC_CHANNELS.knowledgeBase.CREATE, async (_ctx, input: KnowledgeBaseCreateForm) => {
    return createKnowledgeBase(input)
  })

  server.handle(RPC_CHANNELS.knowledgeBase.UPDATE, async (_ctx, id: number, input: KnowledgeBaseUpdateForm) => {
    await updateKnowledgeBase(id, input)
  })

  server.handle(RPC_CHANNELS.knowledgeBase.DELETE, async (_ctx, id: number) => {
    await deleteKnowledgeBase(id)
  })

  server.handle(RPC_CHANNELS.knowledgeBase.LIST_DOCUMENTS, async (_ctx, knowledgeBaseName: string) => {
    return getDocumentIndexList({
      knowledge_base_name: knowledgeBaseName,
      current: 1,
      pageSize: 1000,
    })
  })

  server.handle(RPC_CHANNELS.knowledgeBase.UPLOAD_DOCUMENT, async (_ctx, knowledgeBaseName: string, filePath: string) => {
    const safePath = await validateFilePath(filePath)
    return createDocumentIndexAsync(knowledgeBaseName, safePath)
  })

  server.handle(RPC_CHANNELS.knowledgeBase.DELETE_DOCUMENT, async (_ctx, documentId: number) => {
    await deleteDocumentIndex(documentId)
  })

  server.handle(RPC_CHANNELS.knowledgeBase.GET_TASK_STATUS, async (_ctx, taskId: string) => {
    return getKnowledgeTaskStatus(taskId)
  })

  deps.platform.logger.info('Knowledge base RPC handlers registered')
}
