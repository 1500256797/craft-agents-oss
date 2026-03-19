import { normalizePath } from '@zhangyuge-agent/core/utils'
import { FILE_EXTENSIONS_PATTERN } from './file-classification'

const SESSION_PATH_TOKEN = '{{SESSION_PATH}}'
const FILE_URI_PREFIX = /^file:\/\//i
const EXPLICIT_LOCAL_PATH_TARGET_REGEX = /^(?:\{\{SESSION_PATH\}\}|\/(?!\/)|~\/|\.\/|\.\.\/|[A-Za-z]:[\\/]).+/i
const BARE_FILE_PATH_TARGET_REGEX = new RegExp(
  `^(?:[A-Za-z0-9_][\\w\\-./@]*)[\\w\\-./@]*\\.(?:${FILE_EXTENSIONS_PATTERN})$`,
  'i'
)

function fileUrlToPath(target: string): string | null {
  try {
    const parsed = new URL(target)
    if (parsed.protocol !== 'file:') return null

    let pathname = decodeURIComponent(parsed.pathname)
    if (/^\/[A-Za-z]:/.test(pathname)) {
      pathname = pathname.slice(1)
    }

    if (parsed.hostname && parsed.hostname !== 'localhost') {
      return `//${parsed.hostname}${pathname}`
    }

    return pathname || null
  } catch {
    return null
  }
}

export function resolveSessionPathToken(target: string, sessionFolderPath?: string): string {
  const trimmed = target.trim()
  if (!sessionFolderPath || !trimmed.includes(SESSION_PATH_TOKEN)) {
    return trimmed
  }
  return normalizePath(trimmed.replaceAll(SESSION_PATH_TOKEN, normalizePath(sessionFolderPath)))
}

export function normalizeLocalPathTarget(target: string, sessionFolderPath?: string): string {
  const trimmed = target.trim()
  const filePath = FILE_URI_PREFIX.test(trimmed) ? fileUrlToPath(trimmed) : null
  const normalized = filePath ?? trimmed
  return resolveSessionPathToken(normalized, sessionFolderPath)
}

export function isLocalPathTarget(target: string): boolean {
  const trimmed = target.trim()
  if (!trimmed) return false
  if (FILE_URI_PREFIX.test(trimmed)) return fileUrlToPath(trimmed) !== null
  if (EXPLICIT_LOCAL_PATH_TARGET_REGEX.test(trimmed)) return true
  return BARE_FILE_PATH_TARGET_REGEX.test(trimmed)
}
