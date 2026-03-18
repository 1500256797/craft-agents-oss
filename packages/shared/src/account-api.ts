import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { getCredentialManager } from './credentials/index.ts'

const DEFAULT_ACCOUNT_API_BASE_URL = 'https://api.agentwin.win'

interface ApiErrorPayload {
  code?: number
  message?: string
  detail?: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  total?: number
  hasNext?: boolean
  error?: ApiErrorPayload
}

function getAccountApiBaseUrl(): string {
  return process.env.CHAIN_AGENT_API_URL?.trim()
    || process.env.NEXT_PUBLIC_API_URL?.trim()
    || DEFAULT_ACCOUNT_API_BASE_URL
}

async function getAuthorizationHeader(): Promise<string> {
  const session = await getCredentialManager().getAccountSession()
  if (!session?.accessToken) {
    throw new Error('Not authenticated')
  }

  return session.tokenType?.trim()
    ? `${session.tokenType.trim()} ${session.accessToken}`
    : session.accessToken
}

async function parseResponse<T>(response: Response): Promise<{ data: T; total?: number }> {
  const body = await response.json().catch(() => null) as ApiResponse<T> | null
  if (!response.ok || !body?.success) {
    const message = body?.error?.detail
      || body?.error?.message
      || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return { data: body.data, total: body.total }
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<{ data: T; total?: number }> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', await getAuthorizationHeader())
  headers.set('Content-Type', 'application/json')

  const response = await fetch(`${getAccountApiBaseUrl()}${path}`, {
    ...init,
    headers,
  })

  return parseResponse<T>(response)
}

async function requestFormData<T>(path: string, formData: FormData, init: RequestInit = {}): Promise<{ data: T; total?: number }> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', await getAuthorizationHeader())

  const response = await fetch(`${getAccountApiBaseUrl()}${path}`, {
    ...init,
    headers,
    body: formData,
  })

  return parseResponse<T>(response)
}

export type ProviderStatus = 1 | 2 | 3
export type ProviderModelStatus = 1 | 2 | 3

export interface ProviderModelItem {
  name: string
  status: ProviderModelStatus
  priority: number
  remark?: string
}

export interface ModelProviderItem {
  id: number
  provider_key: string
  display_name: string
  base_url: string
  api_key?: string
  models: ProviderModelItem[]
  status: ProviderStatus
  priority: number
  remark?: string
  created_by?: string
  updated_by?: string
  created_at?: string
  updated_at?: string
}

export interface ModelProviderListQueryParams {
  status?: ProviderStatus
}

export interface CreateModelProviderForm {
  provider_key: string
  display_name?: string
  base_url: string
  api_key: string
  models: ProviderModelItem[]
  status?: ProviderStatus
  priority?: number
  remark?: string
}

export type UpdateModelProviderForm = Omit<CreateModelProviderForm, 'provider_key' | 'api_key'> & {
  api_key?: string
}

export async function getModelProvidersList(params: ModelProviderListQueryParams = {}) {
  const query = new URLSearchParams()
  if (params.status) query.set('status', String(params.status))
  const queryString = query.toString()
  const response = await requestJson<ModelProviderItem[]>(
    `/api/v1/agents/model-providers${queryString ? `?${queryString}` : ''}`
  )
  return { data: response.data, total: response.total ?? response.data.length }
}

export async function createModelProvider(params: CreateModelProviderForm) {
  const response = await requestJson<ModelProviderItem>('/api/v1/agents/model-providers', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  return response.data
}

export async function updateModelProvider(id: number, params: UpdateModelProviderForm) {
  const response = await requestJson<ModelProviderItem>(`/api/v1/agents/model-providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  })
  return response.data
}

export async function deleteModelProvider(id: number) {
  await requestJson<void>(`/api/v1/agents/model-providers/${id}`, {
    method: 'DELETE',
  })
}

export async function updateModelProviderStatus(id: number, status: ProviderStatus) {
  await requestJson<void>(`/api/v1/agents/model-providers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export type KnowledgeBaseStatus = 1 | 2

export interface KnowledgeBaseItem {
  id: number
  name: string
  description: string
  category?: string
  status: KnowledgeBaseStatus
  documents_count?: number
  createTime?: string
  updateTime?: string
  created_at?: string
  updated_at?: string
}

export interface KnowledgeBaseQueryParams {
  name?: string
  status?: KnowledgeBaseStatus
  category?: string
  current?: number
  pageSize?: number
}

export interface KnowledgeBaseCreateForm {
  name: string
  description: string
  category?: string
}

export interface KnowledgeBaseUpdateForm {
  name?: string
  description?: string
  category?: string
  status?: KnowledgeBaseStatus
}

export type DocumentIndexStatus = 0 | 1 | 2 | 3

export interface DocumentIndexItem {
  id: number
  knowledge_base_id: number
  knowledge_base_name: string
  file_name: string
  status: DocumentIndexStatus
  chunks_count?: number
  created_at?: string
  updated_at?: string
  file_size?: number | string
  size?: number | string
  bytes?: number | string
  ext?: Record<string, unknown> | string
}

export interface DocumentIndexQueryParams {
  knowledge_base_name: string
  current?: number
  pageSize?: number
}

export interface KnowledgeTaskStatus {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  params: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
  created_at: number
  updated_at: number
}

export async function getKnowledgeBaseList(params: KnowledgeBaseQueryParams = {}) {
  const query = new URLSearchParams()
  if (params.name) query.set('name', params.name)
  if (params.status) query.set('status', String(params.status))
  if (params.category) query.set('category', params.category)
  if (params.current) query.set('current', String(params.current))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const response = await requestJson<{ data: KnowledgeBaseItem[]; total: number } | KnowledgeBaseItem[]>(
    `/api/v1/kb?${query.toString()}`
  )

  const list = Array.isArray(response.data) ? response.data : response.data?.data || []
  const total = Array.isArray(response.data)
    ? (response.total ?? list.length)
    : (response.data?.total ?? response.total ?? list.length)

  return { data: list, total }
}

export async function createKnowledgeBase(params: KnowledgeBaseCreateForm) {
  const response = await requestJson<{ id: number }>('/api/v1/kb', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  return response.data
}

export async function updateKnowledgeBase(id: number, params: KnowledgeBaseUpdateForm) {
  await requestJson<void>(`/api/v1/kb/${id}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  })
}

export async function deleteKnowledgeBase(id: number) {
  await requestJson<void>(`/api/v1/kb/${id}`, {
    method: 'DELETE',
  })
}

export async function getDocumentIndexList(params: DocumentIndexQueryParams) {
  const query = new URLSearchParams()
  query.set('knowledge_base_name', params.knowledge_base_name)
  if (params.current) query.set('current', String(params.current))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const response = await requestJson<DocumentIndexItem[]>(`/api/v1/rag/documents?${query.toString()}`)
  return { data: response.data, total: response.total ?? response.data.length }
}

export async function deleteDocumentIndex(documentId: number) {
  await requestJson<void>(`/api/v1/rag/documents/${documentId}`, {
    method: 'DELETE',
  })
}

export async function createDocumentIndexAsync(knowledgeBaseName: string, filePath: string) {
  const fileBuffer = await readFile(filePath)
  const fileName = basename(filePath)
  const formData = new FormData()
  formData.append('knowledge_name', knowledgeBaseName)
  formData.append('file', new Blob([fileBuffer]), fileName)

  const response = await requestFormData<{ task_id: string; message: string }>(
    '/api/v1/indexer/async',
    formData,
    { method: 'POST' },
  )
  return response.data
}

export async function getKnowledgeTaskStatus(taskId: string) {
  const response = await requestJson<KnowledgeTaskStatus>(`/api/v1/indexer/task/${taskId}`)
  return response.data
}

export interface ChannelTypeConfig {
  id: string
  name: string
  description: string
  icon_url?: string
  system_image: string
  enabled: boolean
  display_order: number
}

export interface UserChannelConfig {
  channel_type: string
  channel_name: string
  enabled: boolean
  config: Record<string, unknown>
  created_at: number
  updated_at: number
}

export interface ChannelAccount {
  account_id: string
  agent_id: string
  agent_name?: string
  account_name: string
  enabled: boolean
  configured?: boolean
  linked?: boolean
  running?: boolean
  connected?: boolean
  status?: string
  last_error?: string
  last_connected_at?: number
  last_start_at?: number
  last_stop_at?: number
  last_inbound_at?: number
  last_outbound_at?: number
  last_probe_at?: number
  reconnect_attempts?: number
  created_at: number
  updated_at: number
}

export interface ChannelStatusSummary {
  enabled: boolean
  account_count: number
  running_count: number
  connected_count: number
  last_error?: string
}

export interface AccountStatusSummary {
  account_id: string
  name?: string
  enabled: boolean
  running: boolean
  connected: boolean
  last_inbound_at?: number
  last_error?: string
}

export interface ChannelsStatusSnapshot {
  timestamp?: number
  ts?: number
  channel_order: string[]
  channel_labels: Record<string, string>
  channel_system_images?: Record<string, string>
  channels: Record<string, ChannelStatusSummary>
  channel_accounts: Record<string, AccountStatusSummary[]>
}

export async function getChannelTypes() {
  const response = await requestJson<ChannelTypeConfig[]>('/api/v1/channels/types')
  return response.data
}

export async function getUserChannels() {
  const response = await requestJson<UserChannelConfig[]>('/api/v1/channels')
  return response.data
}

export async function getChannelAccounts(channelType: string) {
  const response = await requestJson<ChannelAccount[]>(`/api/v1/channels/${channelType}/accounts`)
  return response.data
}

export async function getChannelsSnapshot() {
  const response = await requestJson<ChannelsStatusSnapshot>('/api/v1/channels/snapshot')
  return response.data
}
