/**
 * Stale Session Recovery Watchdog
 *
 * Safety net for edge cases the reconnect replay protocol cannot catch:
 * - Events lost during React useEffect re-registration
 * - Single dropped event without a full WS disconnect
 * - Server crash mid-stream where disconnect is never signaled cleanly
 *
 * Periodically checks for sessions stuck in isProcessing=true with no
 * recent events, and refreshes them from server-persisted state.
 */

import { useCallback, useEffect, useRef } from 'react'
import { getDefaultStore } from 'jotai'
import { sessionMetaMapAtom } from '@/atoms/sessions'

type JotaiStore = ReturnType<typeof getDefaultStore>

const STALE_THRESHOLD_MS = 120_000
const CHECK_INTERVAL_MS = 30_000

interface UseStaleSessionRecoveryOptions {
  store: JotaiStore
  refreshSessionFromServer: (sessionId: string) => Promise<boolean>
}

export function useStaleSessionRecovery({
  store,
  refreshSessionFromServer,
}: UseStaleSessionRecoveryOptions): {
  trackSessionActivity: (sessionId: string) => void
} {
  const lastEventTimestamps = useRef<Map<string, number>>(new Map())
  const refreshingSessionIds = useRef<Set<string>>(new Set())

  const trackSessionActivity = useCallback((sessionId: string) => {
    lastEventTimestamps.current.set(sessionId, Date.now())
  }, [])

  useEffect(() => {
    const timer = setInterval(async () => {
      const now = Date.now()
      const allMeta = store.get(sessionMetaMapAtom)

      for (const [sessionId, meta] of allMeta) {
        if (!meta.isProcessing) {
          lastEventTimestamps.current.delete(sessionId)
          continue
        }

        const lastEvent = lastEventTimestamps.current.get(sessionId)
        if (!lastEvent) {
          lastEventTimestamps.current.set(sessionId, now)
          continue
        }

        if (now - lastEvent < STALE_THRESHOLD_MS) {
          continue
        }

        if (refreshingSessionIds.current.has(sessionId)) {
          continue
        }

        console.warn(`[StaleRecovery] Session ${sessionId} stuck in processing for ${Math.round((now - lastEvent) / 1000)}s — refreshing`)

        refreshingSessionIds.current.add(sessionId)
        try {
          const refreshed = await refreshSessionFromServer(sessionId)
          if (refreshed) {
            lastEventTimestamps.current.delete(sessionId)
          }
        } catch (err) {
          console.error(`[StaleRecovery] Failed to refresh session ${sessionId}:`, err)
        } finally {
          refreshingSessionIds.current.delete(sessionId)
        }
      }
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [store, refreshSessionFromServer])

  return { trackSessionActivity }
}
