import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { FolderCog, Plus, Radio, RefreshCw, Settings2 } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { Button } from '@/components/ui/button'
import { CrossfadeAvatar } from '@/components/ui/avatar'
import { WorkspaceCreationScreen } from '@/components/workspace'
import { useAppShellContext } from '@/context/AppShellContext'
import { useI18n } from '@/context/I18nContext'
import { useWorkspaceIcons } from '@/hooks/useWorkspaceIcon'
import { useTransportConnectionState } from '@/hooks/useTransportConnectionState'
import { navigate, routes } from '@/lib/navigate'
import { cn } from '@/lib/utils'
import type { PermissionMode, WorkspaceSettings } from '../../../shared/types'

function formatDate(timestamp: number | undefined, fallback: string): string {
  if (!timestamp) return fallback
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function formatMode(mode: PermissionMode | undefined, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (mode === 'safe') return t('settings.workspace.modes.safeLabel')
  if (mode === 'allow-all') return t('settings.workspace.modes.allowAllLabel')
  if (mode === 'ask') return t('settings.workspace.modes.askLabel')
  return t('settings.lists.agents.values.notAvailable')
}

function getRemoteStatusLabel(
  state: ReturnType<typeof useTransportConnectionState>,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!state) return t('settings.lists.agents.status.unavailable')
  if (state.mode !== 'remote') return t('settings.lists.agents.status.localMode')
  if (state.status === 'connected') return t('settings.lists.agents.status.connected')
  if (state.status === 'connecting') return t('settings.lists.agents.status.connecting')
  if (state.status === 'reconnecting') return t('settings.lists.agents.status.reconnecting')
  if (state.status === 'failed') return t('settings.lists.agents.status.failed')
  if (state.status === 'disconnected') return t('settings.lists.agents.status.disconnected')
  return t('settings.lists.agents.status.idle')
}

function getRemoteStatusTone(state: ReturnType<typeof useTransportConnectionState>): string {
  if (!state || state.mode !== 'remote') return 'bg-muted text-muted-foreground'
  if (state.status === 'connected') return 'bg-success/10 text-success'
  if (state.status === 'connecting' || state.status === 'reconnecting') return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
  if (state.status === 'failed' || state.status === 'disconnected') return 'bg-destructive/10 text-destructive'
  return 'bg-muted text-muted-foreground'
}

function getRemoteDescription(
  state: ReturnType<typeof useTransportConnectionState>,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!state) {
    return t('settings.lists.agents.remote.descriptionUnavailable')
  }

  if (state.mode !== 'remote') {
    return t('settings.lists.agents.remote.descriptionLocalMode')
  }

  if (state.status === 'connected') {
    return t('settings.lists.agents.remote.descriptionConnected')
  }

  if (state.lastError?.message) {
    return state.lastError.message
  }

  return t('settings.lists.agents.remote.descriptionFallback')
}

export default function AgentsPage() {
  const {
    workspaces,
    activeWorkspaceId,
    onSelectWorkspace,
    onRefreshWorkspaces,
  } = useAppShellContext()
  const { t } = useI18n()
  const workspaceIcons = useWorkspaceIcons(workspaces)
  const remoteState = useTransportConnectionState()
  const activeWorkspace = useMemo(() => {
    return workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null
  }, [activeWorkspaceId, workspaces])

  const [selectedSettings, setSelectedSettings] = useState<WorkspaceSettings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [showCreationScreen, setShowCreationScreen] = useState(false)

  useEffect(() => {
    if (!activeWorkspaceId) {
      setSelectedSettings(null)
      return
    }

    let cancelled = false

    const loadSettings = async () => {
      setIsLoadingSettings(true)
      try {
        const settings = await window.electronAPI.getWorkspaceSettings(activeWorkspaceId)
        if (!cancelled) {
          setSelectedSettings(settings)
        }
      } catch (error) {
        console.error('[AgentsPage] failed to load workspace settings', error)
        if (!cancelled) {
          setSelectedSettings(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSettings(false)
        }
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId])

  const handleOpenSettings = useCallback(() => {
    if (!activeWorkspaceId) return
    navigate(routes.view.settings('workspace'))
  }, [activeWorkspaceId])

  const handleWorkspaceCreated = useCallback((workspace: { id: string }) => {
    setShowCreationScreen(false)
    onRefreshWorkspaces?.()
    onSelectWorkspace(workspace.id)
  }, [onRefreshWorkspaces, onSelectWorkspace])

  const canRetryRemote = remoteState?.mode === 'remote'
    && remoteState.status !== 'connected'
    && remoteState.status !== 'idle'

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence>
        {showCreationScreen && (
          <WorkspaceCreationScreen
            onWorkspaceCreated={handleWorkspaceCreated}
            onClose={() => setShowCreationScreen(false)}
          />
        )}
      </AnimatePresence>

      <PanelHeader
        title={t('common.sidebar.nav.agents')}
        actions={(
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowCreationScreen(true)}>
              <Plus className="size-4" />
              {t('settings.lists.agents.actions.newLocal')}
            </Button>
            <HeaderMenu route={routes.view.module('agents')} />
          </div>
        )}
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          <div className="rounded-[14px] border border-foreground/10 bg-background px-5 py-4 shadow-minimal">
            <h2 className="text-base font-semibold text-foreground">{t('settings.lists.agents.introTitle')}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t('settings.lists.agents.introDescription')}
            </p>
          </div>

          <section className="rounded-[14px] border border-foreground/10 bg-background px-5 py-5 shadow-minimal">
            {!activeWorkspace ? (
              <div className="rounded-[12px] border border-dashed border-foreground/15 bg-foreground/[0.02] px-4 py-6 text-sm text-muted-foreground">
                {t('settings.lists.agents.emptySelection')}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CrossfadeAvatar
                      src={workspaceIcons.get(activeWorkspace.id)}
                      alt={activeWorkspace.name}
                      className="h-14 w-14 rounded-full ring-1 ring-border/50"
                      fallbackClassName="bg-foreground text-background text-base rounded-full"
                      fallback={activeWorkspace.name.charAt(0).toUpperCase()}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{activeWorkspace.name}</h3>
                        <span className="rounded-full bg-foreground/6 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {t('settings.lists.agents.badges.localAgent')}
                        </span>
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] text-success">
                          {t('settings.lists.agents.badges.currentAgent')}
                        </span>
                      </div>
                      <p className="mt-2 break-all text-sm leading-6 text-muted-foreground">
                        {activeWorkspace.rootPath}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={handleOpenSettings}>
                      <Settings2 className="size-4" />
                      {t('settings.lists.agents.actions.openSettings')}
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[12px] border border-foreground/10 bg-foreground/[0.02] px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('settings.lists.agents.fields.environment')}</div>
                    <div className="mt-2 text-sm text-foreground">
                      {selectedSettings?.workingDirectory || activeWorkspace.rootPath}
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-foreground/10 bg-foreground/[0.02] px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('settings.lists.agents.fields.permissionMode')}</div>
                    <div className="mt-2 text-sm text-foreground">
                      {isLoadingSettings ? t('settings.lists.agents.values.loading') : formatMode(selectedSettings?.permissionMode, t)}
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-foreground/10 bg-foreground/[0.02] px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('settings.lists.agents.fields.defaultSources')}</div>
                    <div className="mt-2 text-sm text-foreground">
                      {isLoadingSettings ? t('settings.lists.agents.values.loading') : String(selectedSettings?.enabledSourceSlugs?.length ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-foreground/10 bg-foreground/[0.02] px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('settings.lists.agents.fields.localMcp')}</div>
                    <div className="mt-2 text-sm text-foreground">
                      {isLoadingSettings ? t('settings.lists.agents.values.loading') : selectedSettings?.localMcpEnabled === false ? t('settings.lists.agents.values.disabled') : t('settings.lists.agents.values.enabled')}
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-foreground/10 bg-foreground/[0.02] px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('settings.lists.agents.fields.created')}</div>
                    <div className="mt-2 text-sm text-foreground">{formatDate(activeWorkspace.createdAt, t('settings.lists.agents.values.notAvailable'))}</div>
                  </div>
                  <div className="rounded-[12px] border border-foreground/10 bg-foreground/[0.02] px-4 py-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('settings.lists.agents.fields.lastActive')}</div>
                    <div className="mt-2 text-sm text-foreground">{formatDate(activeWorkspace.lastAccessedAt, t('settings.lists.agents.values.notAvailable'))}</div>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="rounded-[14px] border border-foreground/10 bg-background px-5 py-5 shadow-minimal">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 text-foreground/70">
                  <Radio className="size-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{t('settings.lists.agents.remote.title')}</h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px]', getRemoteStatusTone(remoteState))}>
                      {getRemoteStatusLabel(remoteState, t)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {getRemoteDescription(remoteState, t)}
                  </p>
                  {remoteState?.mode === 'remote' && (
                    <p className="mt-2 break-all text-xs text-muted-foreground">
                      {t('settings.lists.agents.remote.endpoint', { url: remoteState.url })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => void window.electronAPI.reconnectTransport()}
                  disabled={!canRetryRemote}
                >
                  <RefreshCw className="size-4" />
                  {t('settings.lists.agents.actions.retryConnection')}
                </Button>
                <Button variant="outline" disabled>
                  <FolderCog className="size-4" />
                  {t('settings.lists.agents.actions.apiPending')}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
