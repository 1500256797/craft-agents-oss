/**
 * AppSettingsPage
 *
 * Global app-level settings that apply across all workspaces.
 *
 * Settings:
 * - Notifications
 * - Network (proxy)
 * - About (version, updates)
 *
 * Note: AI settings (connections, model, thinking) have been moved to AiSettingsPage.
 * Note: Appearance settings (theme, font) have been moved to AppearanceSettingsPage.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { routes } from '@/lib/navigate'
import { Spinner } from '@zhangyuge-agent/ui'
import type { DetailsPageMeta } from '@/lib/navigation-registry'
import type { NetworkProxySettings } from '../../../shared/types'

import {
  SettingsSection,
  SettingsCard,
  SettingsCardFooter,
  SettingsRow,
  SettingsToggle,
  SettingsInput,
} from '@/components/settings'
import { useUpdateChecker } from '@/hooks/useUpdateChecker'
import { useI18n } from '@/context/I18nContext'

export const meta: DetailsPageMeta = {
  navigator: 'settings',
  slug: 'app',
}

// ============================================
// Proxy form helpers
// ============================================

interface ProxyFormState {
  enabled: boolean
  httpProxy: string
  httpsProxy: string
  noProxy: string
}

const EMPTY_PROXY_FORM: ProxyFormState = {
  enabled: false,
  httpProxy: '',
  httpsProxy: '',
  noProxy: '',
}

function toProxyFormState(settings?: NetworkProxySettings): ProxyFormState {
  if (!settings) return EMPTY_PROXY_FORM
  return {
    enabled: settings.enabled,
    httpProxy: settings.httpProxy ?? '',
    httpsProxy: settings.httpsProxy ?? '',
    noProxy: settings.noProxy ?? '',
  }
}

function toNetworkProxySettings(form: ProxyFormState): NetworkProxySettings {
  return {
    enabled: form.enabled,
    httpProxy: form.httpProxy.trim() || undefined,
    httpsProxy: form.httpsProxy.trim() || undefined,
    noProxy: form.noProxy.trim() || undefined,
  }
}

function validateProxyUrl(url: string): string | undefined {
  if (!url.trim()) return undefined
  try {
    const parsed = new URL(url.trim())
    if (!['http:', 'https:', 'socks4:', 'socks5:'].includes(parsed.protocol)) {
      return 'Must be http://, https://, socks4://, or socks5:// URL'
    }
    return undefined
  } catch {
    return 'Invalid URL format'
  }
}

// ============================================
// Main Component
// ============================================

export default function AppSettingsPage() {
  const { t } = useI18n()
  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Power state
  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(false)

  // Proxy state
  const [proxyForm, setProxyForm] = useState<ProxyFormState>(EMPTY_PROXY_FORM)
  const [savedProxyForm, setSavedProxyForm] = useState<ProxyFormState>(EMPTY_PROXY_FORM)
  const [proxyError, setProxyError] = useState<string | undefined>()
  const [isSavingProxy, setIsSavingProxy] = useState(false)

  // Auto-update state
  const updateChecker = useUpdateChecker()
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false)

  const handleCheckForUpdates = useCallback(async () => {
    setIsCheckingForUpdates(true)
    try {
      await updateChecker.checkForUpdates()
    } finally {
      setIsCheckingForUpdates(false)
    }
  }, [updateChecker])

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      const [notificationsOn, keepAwakeOn, proxySettings] = await Promise.all([
        window.electronAPI.getNotificationsEnabled(),
        window.electronAPI.getKeepAwakeWhileRunning(),
        window.electronAPI.getNetworkProxySettings(),
      ])
      setNotificationsEnabled(notificationsOn)
      setKeepAwakeEnabled(keepAwakeOn)
      const form = toProxyFormState(proxySettings)
      setProxyForm(form)
      setSavedProxyForm(form)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [])

  const handleNotificationsEnabledChange = useCallback(async (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    await window.electronAPI.setNotificationsEnabled(enabled)
  }, [])

  const handleKeepAwakeEnabledChange = useCallback(async (enabled: boolean) => {
    setKeepAwakeEnabled(enabled)
    await window.electronAPI.setKeepAwakeWhileRunning(enabled)
  }, [])

  // Proxy handlers
  const isProxyDirty = useMemo(() => {
    return JSON.stringify(proxyForm) !== JSON.stringify(savedProxyForm)
  }, [proxyForm, savedProxyForm])

  const handleSaveProxy = useCallback(async () => {
    // Validate URLs
    const httpErr = validateProxyUrl(proxyForm.httpProxy)
    const httpsErr = validateProxyUrl(proxyForm.httpsProxy)
    if (httpErr || httpsErr) {
      setProxyError(httpErr || httpsErr)
      return
    }
    setProxyError(undefined)
    setIsSavingProxy(true)
    try {
      const settings = toNetworkProxySettings(proxyForm)
      await window.electronAPI.setNetworkProxySettings(settings)
      // Re-read persisted state to confirm
      const persisted = await window.electronAPI.getNetworkProxySettings()
      const form = toProxyFormState(persisted)
      setProxyForm(form)
      setSavedProxyForm(form)
    } catch (error) {
      setProxyError(error instanceof Error ? error.message : t('common.errors.failedToSave'))
    } finally {
      setIsSavingProxy(false)
    }
  }, [proxyForm, t])

  const handleResetProxy = useCallback(() => {
    setProxyForm(savedProxyForm)
    setProxyError(undefined)
  }, [savedProxyForm])

  return (
    <div className="h-full flex flex-col">
      <PanelHeader title={t('settings.pages.app.title')} actions={<HeaderMenu route={routes.view.settings('app')} helpFeature="app-settings" />} />
      <div className="flex-1 min-h-0 mask-fade-y">
        <ScrollArea className="h-full">
          <div className="px-5 py-7 max-w-3xl mx-auto">
            <div className="space-y-8">
              {/* Notifications */}
              <SettingsSection title={t('settings.app.sections.notifications')}>
                <SettingsCard>
                  <SettingsToggle
                    label={t('settings.app.rows.desktopNotifications')}
                    description={t('settings.app.rows.desktopNotificationsDescription')}
                    checked={notificationsEnabled}
                    onCheckedChange={handleNotificationsEnabledChange}
                  />
                </SettingsCard>
              </SettingsSection>

              {/* Power */}
              <SettingsSection title={t('settings.app.sections.power')}>
                <SettingsCard>
                  <SettingsToggle
                    label={t('settings.app.rows.keepScreenAwake')}
                    description={t('settings.app.rows.keepScreenAwakeDescription')}
                    checked={keepAwakeEnabled}
                    onCheckedChange={handleKeepAwakeEnabledChange}
                  />
                </SettingsCard>
              </SettingsSection>

              {/* Network */}
              <SettingsSection title={t('settings.app.sections.network')}>
                <SettingsCard>
                  <SettingsToggle
                    label={t('settings.app.rows.httpProxyEnabled')}
                    description={t('settings.app.rows.httpProxyEnabledDescription')}
                    checked={proxyForm.enabled}
                    onCheckedChange={(enabled) => setProxyForm(prev => ({ ...prev, enabled }))}
                  />
                  {proxyForm.enabled && (
                    <>
                      <SettingsInput
                        label={t('settings.app.rows.httpProxy')}
                        value={proxyForm.httpProxy}
                        onChange={(value) => setProxyForm(prev => ({ ...prev, httpProxy: value }))}
                        placeholder={t('settings.app.placeholders.proxyUrl')}
                        inCard
                      />
                      <SettingsInput
                        label={t('settings.app.rows.httpsProxy')}
                        value={proxyForm.httpsProxy}
                        onChange={(value) => setProxyForm(prev => ({ ...prev, httpsProxy: value }))}
                        placeholder={t('settings.app.placeholders.proxyUrl')}
                        inCard
                      />
                      <SettingsInput
                        label={t('settings.app.rows.bypassRules')}
                        value={proxyForm.noProxy}
                        onChange={(value) => setProxyForm(prev => ({ ...prev, noProxy: value }))}
                        placeholder={t('settings.app.placeholders.bypassRules')}
                        inCard
                      />
                    </>
                  )}
                  {(isProxyDirty || proxyError) && (
                    <SettingsCardFooter>
                      {proxyError && (
                        <span className="text-destructive text-sm mr-auto">{proxyError}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetProxy}
                        disabled={!isProxyDirty || isSavingProxy}
                      >
                        {t('common.actions.reset')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveProxy}
                        disabled={!isProxyDirty || isSavingProxy}
                      >
                        {isSavingProxy ? (
                          <>
                            <Spinner className="mr-1.5" />
                            {t('common.actions.saving')}
                          </>
                        ) : (
                          t('common.actions.save')
                        )}
                      </Button>
                    </SettingsCardFooter>
                  )}
                </SettingsCard>
              </SettingsSection>

              {/* About */}
              <SettingsSection title={t('settings.app.sections.about')}>
                <SettingsCard>
                  <SettingsRow label={t('settings.app.rows.version')}>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {updateChecker.updateInfo?.currentVersion ?? t('settings.app.rows.loadingVersion')}
                      </span>
                      {updateChecker.isDownloading && updateChecker.updateInfo?.latestVersion && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Spinner className="w-3 h-3" />
                          <span>
                            {t('settings.app.rows.downloadingVersion', {
                              version: updateChecker.updateInfo.latestVersion,
                              progress: updateChecker.downloadProgress,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </SettingsRow>
                  <SettingsRow label={t('settings.app.rows.checkForUpdates')}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckForUpdates}
                      disabled={isCheckingForUpdates}
                    >
                      {isCheckingForUpdates ? (
                        <>
                          <Spinner className="mr-1.5" />
                          {t('common.actions.checking')}
                        </>
                      ) : (
                        t('common.actions.checkNow')
                      )}
                    </Button>
                  </SettingsRow>
                  {updateChecker.isReadyToInstall && updateChecker.updateInfo?.latestVersion && (
                    <SettingsRow label={t('settings.app.rows.updateReady')}>
                      <Button
                        size="sm"
                        onClick={updateChecker.installUpdate}
                      >
                        {t('settings.app.rows.restartToUpdate', {
                          version: updateChecker.updateInfo.latestVersion,
                        })}
                      </Button>
                    </SettingsRow>
                  )}
                </SettingsCard>
              </SettingsSection>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
