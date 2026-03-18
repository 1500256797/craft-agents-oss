import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Bot, Radio, RefreshCw } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SettingsPageFrame } from '@/components/settings'
import { useI18n } from '@/context/I18nContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { routes } from '@/lib/navigate'
import type {
  ChannelAccount,
  ChannelsStatusSnapshot,
  ChannelTypeConfig,
  UserChannelConfig,
} from '../../../shared/types'

export const meta = {
  navigator: 'settings',
  slug: 'channels',
}

interface ChannelCardViewModel {
  id: string
  name: string
  description: string
  enabled: boolean
  configured: boolean
  accountCount: number
  runningCount: number
  connectedCount: number
  lastError?: string
}

function buildChannelViewModel(
  channelType: ChannelTypeConfig,
  userChannel: UserChannelConfig | undefined,
  snapshot: ChannelsStatusSnapshot | null,
): ChannelCardViewModel {
  const summary = snapshot?.channels[channelType.id]
  return {
    id: channelType.id,
    name: userChannel?.channel_name || channelType.name,
    description: channelType.description,
    enabled: userChannel?.enabled || false,
    configured: !!userChannel,
    accountCount: summary?.account_count || 0,
    runningCount: summary?.running_count || 0,
    connectedCount: summary?.connected_count || 0,
    lastError: summary?.last_error,
  }
}

export default function ChannelsSettingsPage() {
  const { t } = useI18n()
  const [channelTypes, setChannelTypes] = useState<ChannelTypeConfig[]>([])
  const [userChannels, setUserChannels] = useState<UserChannelConfig[]>([])
  const [snapshot, setSnapshot] = useState<ChannelsStatusSnapshot | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<ChannelCardViewModel | null>(null)
  const [accounts, setAccounts] = useState<ChannelAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAccountsLoading, setIsAccountsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const channelCards = useMemo(() => {
    return channelTypes
      .map((channelType) => buildChannelViewModel(
        channelType,
        userChannels.find((channel) => channel.channel_type === channelType.id),
        snapshot,
      ))
      .sort((left, right) => {
        if (left.configured !== right.configured) return left.configured ? -1 : 1
        if (left.enabled !== right.enabled) return left.enabled ? -1 : 1
        return left.name.localeCompare(right.name)
      })
  }, [channelTypes, snapshot, userChannels])

  const metrics = useMemo(() => {
    const totalChannels = userChannels.length
    const enabledChannels = userChannels.filter((channel) => channel.enabled).length
    const channelSummaries = snapshot ? Object.values(snapshot.channels) : []
    const totalRunning = channelSummaries.reduce((sum, item) => sum + (item.running_count || 0), 0)
    const totalConnected = channelSummaries.reduce((sum, item) => sum + (item.connected_count || 0), 0)

    return [
      { label: t('settings.channels.metrics.configuredChannels'), value: totalChannels, className: 'text-foreground' },
      { label: t('settings.channels.metrics.enabledChannels'), value: enabledChannels, className: 'text-info' },
      { label: t('settings.channels.metrics.runningAccounts'), value: totalRunning, className: 'text-success' },
      { label: t('settings.channels.metrics.connectedAccounts'), value: totalConnected, className: 'text-accent' },
    ]
  }, [snapshot, t, userChannels])

  const loadChannels = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [types, channels, nextSnapshot] = await Promise.all([
        window.electronAPI.getChannelTypes(),
        window.electronAPI.getUserChannels(),
        window.electronAPI.getChannelsSnapshot(),
      ])
      setChannelTypes(types)
      setUserChannels(channels)
      setSnapshot(nextSnapshot)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load channels')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadChannels()
  }, [loadChannels])

  const loadAccounts = useCallback(async (channelType: string) => {
    setIsAccountsLoading(true)
    setError(null)
    try {
      const nextAccounts = await window.electronAPI.getChannelAccounts(channelType)
      setAccounts(nextAccounts)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load channel accounts')
      setAccounts([])
    } finally {
      setIsAccountsLoading(false)
    }
  }, [])

  const openChannel = useCallback(async (channel: ChannelCardViewModel) => {
    setSelectedChannel(channel)
    setDialogOpen(true)
    await loadAccounts(channel.id)
  }, [loadAccounts])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await loadChannels()
      if (selectedChannel) {
        await loadAccounts(selectedChannel.id)
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [loadAccounts, loadChannels, selectedChannel])

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title={t('settings.pages.channels.title')}
        actions={<HeaderMenu route={routes.view.settings('channels')} />}
      />

      <SettingsPageFrame contentClassName="space-y-4">
        <div className="flex flex-col gap-3 rounded-[14px] border border-foreground/10 bg-background px-5 py-4 shadow-minimal sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t('settings.channels.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('settings.channels.subtitle')}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void handleRefresh()} disabled={isRefreshing}>
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('common.actions.refresh')}
          </Button>
        </div>

        {error && (
          <div className="rounded-[12px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-[14px] border border-foreground/10 bg-background px-5 py-4 shadow-minimal">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className={`mt-3 text-2xl font-semibold ${metric.className}`}>{metric.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="rounded-[14px] border border-foreground/10 bg-background px-5 py-8 text-sm text-muted-foreground shadow-minimal">
            {t('settings.channels.cards.loading')}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {channelCards.map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => void openChannel(channel)}
                className="rounded-[14px] border border-foreground/10 bg-background px-5 py-5 text-left shadow-minimal transition-colors hover:bg-foreground/[0.02]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Radio className="size-4 text-muted-foreground" />
                      <h3 className="truncate text-sm font-semibold text-foreground">{channel.name}</h3>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{channel.description}</p>
                  </div>
                  <Badge className={channel.enabled ? 'bg-success/10 text-success border-success/20' : 'bg-foreground/5 text-muted-foreground border-foreground/10'}>
                    {channel.enabled ? t('settings.channels.cards.enabled') : t('settings.channels.cards.off')}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">{channel.configured ? t('settings.channels.cards.configured') : t('settings.channels.cards.notConfigured')}</Badge>
                  <Badge variant="secondary">{t('settings.channels.cards.accounts', { count: channel.accountCount })}</Badge>
                  <Badge variant="secondary">{t('settings.channels.cards.running', { count: channel.runningCount })}</Badge>
                  <Badge variant="secondary">{t('settings.channels.cards.connected', { count: channel.connectedCount })}</Badge>
                </div>

                {channel.lastError && (
                  <p className="mt-3 text-xs text-destructive">{channel.lastError}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </SettingsPageFrame>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedChannel?.name || t('settings.channels.dialog.titleFallback')}</DialogTitle>
            <DialogDescription>
              {t('settings.channels.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-[12px] border border-foreground/10 px-4 py-3">
                <p className="text-xs text-muted-foreground">{t('settings.channels.dialog.configured')}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{selectedChannel?.configured ? t('common.labels.yes') : t('common.labels.no')}</p>
              </div>
              <div className="rounded-[12px] border border-foreground/10 px-4 py-3">
                <p className="text-xs text-muted-foreground">{t('settings.channels.dialog.accounts')}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{selectedChannel?.accountCount ?? 0}</p>
              </div>
              <div className="rounded-[12px] border border-foreground/10 px-4 py-3">
                <p className="text-xs text-muted-foreground">{t('settings.channels.dialog.running')}</p>
                <p className="mt-2 text-lg font-semibold text-success">{selectedChannel?.runningCount ?? 0}</p>
              </div>
              <div className="rounded-[12px] border border-foreground/10 px-4 py-3">
                <p className="text-xs text-muted-foreground">{t('settings.channels.dialog.connected')}</p>
                <p className="mt-2 text-lg font-semibold text-accent">{selectedChannel?.connectedCount ?? 0}</p>
              </div>
            </div>

            {isAccountsLoading ? (
              <div className="rounded-[12px] border border-foreground/10 px-4 py-8 text-sm text-muted-foreground">
                {t('settings.channels.dialog.loadingAccounts')}
              </div>
            ) : accounts.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-foreground/15 px-4 py-8 text-sm text-muted-foreground">
                {t('settings.channels.dialog.noAccounts')}
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.account_id} className="rounded-[12px] border border-foreground/10 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Bot className="size-4 text-muted-foreground" />
                          <p className="truncate text-sm font-medium text-foreground">{account.account_name}</p>
                          <Badge variant="secondary">{account.status || t('settings.channels.dialog.unknown')}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{t('settings.channels.dialog.agent', { value: account.agent_name || account.agent_id || '-' })}</span>
                          <span>{t('settings.channels.dialog.connectedStatus', { value: account.connected ? t('common.labels.yes') : t('common.labels.no') })}</span>
                          <span>{t('settings.channels.dialog.runningStatus', { value: account.running ? t('common.labels.yes') : t('common.labels.no') })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Activity className="size-3.5" />
                        <span>{account.last_inbound_at ? new Date(account.last_inbound_at * 1000).toLocaleString() : t('settings.channels.dialog.noActivity')}</span>
                      </div>
                    </div>

                    {account.last_error && (
                      <p className="mt-3 text-xs text-destructive">{account.last_error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
