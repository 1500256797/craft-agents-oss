import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { getCredentialManager } from './credentials/index.ts'

const DEFAULT_ACCOUNT_API_BASE_URL = 'https://api.agentwin.win'

export interface AccountLoginInput {
  username: string
  password: string
  captchaId: string
  captchaCode: string
}

export interface AccountLoginToken {
  accessToken: string
  tokenType: string
  expiresAt: number
}

export interface AccountUserRole {
  role_id?: string
  role_name?: string
}

export interface AccountUser {
  id: string
  username: string
  name: string
  status: string
  avatar?: string
  phone?: string
  email?: string
  remark?: string
  created_at?: string
  updated_at?: string
  roles?: AccountUserRole[]
}

export interface AccountSessionState {
  authenticated: boolean
  tokenType?: string
  expiresAt?: number
}

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

interface LoginTokenPayload {
  access_token: string
  token_type: string
  expires_at: number
}

function getAccountApiBaseUrl(): string {
  return process.env.CHAIN_AGENT_API_URL?.trim()
    || process.env.NEXT_PUBLIC_API_URL?.trim()
    || DEFAULT_ACCOUNT_API_BASE_URL
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !body?.success) {
    const message = body?.error?.detail
      || body?.error?.message
      || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return body.data
}

async function getStoredSession() {
  return getCredentialManager().getAccountSession()
}

function buildAuthHeader(tokenType: string | undefined, accessToken: string): string {
  return tokenType?.trim() ? `${tokenType.trim()} ${accessToken}` : accessToken
}

async function fetchWithSession<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await getStoredSession()
  if (!session?.accessToken) {
    throw new Error('Not authenticated')
  }

  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Authorization', buildAuthHeader(session.tokenType, session.accessToken))

  const response = await fetch(`${getAccountApiBaseUrl()}${path}`, {
    ...init,
    headers,
  })

  return parseApiResponse<T>(response)
}

export async function getCaptchaId(): Promise<string> {
  const response = await fetch(`${getAccountApiBaseUrl()}/api/v1/captcha/id`)
  const data = await parseApiResponse<{ captcha_id: string }>(response)
  return data.captcha_id
}

export async function getCaptchaImageDataUrl(captchaId: string, reload = false): Promise<string> {
  const params = new URLSearchParams({
    id: captchaId,
    reload: reload ? '1' : '0',
  })
  const response = await fetch(`${getAccountApiBaseUrl()}/api/v1/captcha/image?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`captcha image ${response.status}`)
  }

  const bytes = await response.arrayBuffer()
  const mimeType = response.headers.get('content-type') || 'image/png'
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`
}

export async function loginAccount(input: AccountLoginInput): Promise<AccountLoginToken> {
  const payload = {
    username: input.username.trim(),
    password: createHash('md5').update(input.password).digest('hex'),
    captcha_id: input.captchaId,
    captcha_code: input.captchaCode.trim(),
  }

  const response = await fetch(`${getAccountApiBaseUrl()}/api/v1/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const token = await parseApiResponse<LoginTokenPayload>(response)
  const normalized: AccountLoginToken = {
    accessToken: token.access_token,
    tokenType: token.token_type || 'Bearer',
    expiresAt: token.expires_at,
  }

  await getCredentialManager().setAccountSession(normalized)
  return normalized
}

export async function getCurrentAccountUser(): Promise<AccountUser> {
  return fetchWithSession<AccountUser>('/api/v1/current/user', { method: 'GET' })
}

export async function refreshAccountToken(): Promise<AccountLoginToken> {
  const token = await fetchWithSession<LoginTokenPayload>('/api/v1/current/refresh-token', { method: 'POST' })
  const normalized: AccountLoginToken = {
    accessToken: token.access_token,
    tokenType: token.token_type || 'Bearer',
    expiresAt: token.expires_at,
  }
  await getCredentialManager().setAccountSession(normalized)
  return normalized
}

export async function logoutAccount(): Promise<void> {
  try {
    await fetchWithSession<void>('/api/v1/current/logout', { method: 'POST' })
  } finally {
    await getCredentialManager().deleteAccountSession()
  }
}

export async function clearAccountSession(): Promise<void> {
  await getCredentialManager().deleteAccountSession()
}

export async function getAccountSessionState(): Promise<AccountSessionState> {
  const session = await getStoredSession()
  if (!session?.accessToken) {
    return { authenticated: false }
  }

  if (session.expiresAt && session.expiresAt <= Math.floor(Date.now() / 1000)) {
    return {
      authenticated: false,
      tokenType: session.tokenType,
      expiresAt: session.expiresAt,
    }
  }

  return {
    authenticated: true,
    tokenType: session.tokenType,
    expiresAt: session.expiresAt,
  }
}
