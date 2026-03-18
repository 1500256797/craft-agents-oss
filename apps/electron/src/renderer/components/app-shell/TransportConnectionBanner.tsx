import { Button } from '@/components/ui/button'
import { useI18n } from '@/context/I18nContext'
import type { TransportConnectionState } from '../../../shared/types'

export function shouldShowTransportConnectionBanner(state: TransportConnectionState | null): boolean {
  if (!state) return false
  if (state.mode !== 'remote') return false
  return state.status !== 'connected' && state.status !== 'idle'
}

export interface TransportBannerCopy {
  title: string
  description: string
  showRetry: boolean
  tone: 'warning' | 'error' | 'info'
}

export function getTransportBannerCopy(state: TransportConnectionState, t: (key: string, params?: any) => string): TransportBannerCopy {
  switch (state.status) {
    case 'connecting':
      return {
        title: t('common.banners.connectingToRemote'),
        description: t('common.banners.connectingToUrl', { url: state.url }),
        showRetry: false,
        tone: 'info',
      }

    case 'reconnecting': {
      const retry = state.nextRetryInMs != null ? t('common.banners.retryIn', { ms: state.nextRetryInMs }) : 'retrying'
      return {
        title: t('common.banners.reconnectingToRemote'),
        description: `${getFailureReason(state, t)} (${retry}, ${t('common.banners.attempt', { count: state.attempt })})`,
        showRetry: true,
        tone: 'warning',
      }
    }

    case 'failed':
      return {
        title: t('common.banners.cannotConnectToRemote'),
        description: getFailureReason(state, t),
        showRetry: true,
        tone: 'error',
      }

    case 'disconnected':
      return {
        title: t('common.banners.connectionLost'),
        description: getFailureReason(state, t),
        showRetry: true,
        tone: 'warning',
      }

    default:
      return {
        title: t('common.banners.remoteServerStatus'),
        description: getFailureReason(state, t),
        showRetry: true,
        tone: 'info',
      }
  }
}

function getFailureReason(state: TransportConnectionState, t: (key: string, params?: any) => string): string {
  const err = state.lastError
  if (err) {
    if (err.kind === 'auth') return t('common.banners.authFailed')
    if (err.kind === 'protocol') return t('common.banners.protocolMismatch')
    if (err.kind === 'timeout') return t('common.banners.connectionTimeout', { url: state.url })
    if (err.kind === 'network') return t('common.banners.networkError', { url: state.url })
    return err.message
  }

  if (state.lastClose?.code != null) {
    const reason = state.lastClose.reason ? ` (${state.lastClose.reason})` : ''
    return t('common.banners.websocketClosed', { code: state.lastClose.code, reason })
  }

  return t('common.banners.waitingForConnection')
}

export function TransportConnectionBanner({
  state,
  onRetry,
}: {
  state: TransportConnectionState
  onRetry: () => void
}) {
  const { t } = useI18n()
  const copy = getTransportBannerCopy(state, t)

  const toneClasses = copy.tone === 'error'
    ? 'border-destructive/30 bg-destructive/10 text-destructive'
    : copy.tone === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'

  return (
    <div className={`shrink-0 border-b px-4 py-2 ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{copy.title}</p>
          <p className="text-xs opacity-90 truncate">{copy.description}</p>
        </div>
        {copy.showRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0 h-7">
            {t('common.actions.retry')}
          </Button>
        )}
      </div>
    </div>
  )
}
