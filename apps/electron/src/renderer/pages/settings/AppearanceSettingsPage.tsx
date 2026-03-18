/**
 * AppearanceSettingsPage
 *
 * Visual customization settings: theme mode, color theme, font,
 * workspace-specific theme overrides, and CLI tool icon mappings.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { EditPopover, EditButton, getEditConfig } from '@/components/ui/EditPopover'
import { useTheme } from '@/context/ThemeContext'
import { useI18n } from '@/context/I18nContext'
import { useAppShellContext } from '@/context/AppShellContext'
import { routes } from '@/lib/navigate'
import { Monitor, Sun, Moon } from 'lucide-react'
import type { DetailsPageMeta } from '@/lib/navigation-registry'
import type { ToolIconMapping } from '../../../shared/types'

import {
  SettingsSection,
  SettingsCard,
  SettingsRow,
  SettingsSegmentedControl,
  SettingsMenuSelect,
  SettingsToggle,
} from '@/components/settings'
import * as storage from '@/lib/local-storage'
import { useWorkspaceIcons } from '@/hooks/useWorkspaceIcon'
import { Info_DataTable, SortableHeader } from '@/components/info/Info_DataTable'
import { Info_Badge } from '@/components/info/Info_Badge'
import type { PresetTheme } from '@config/theme'
import { UI_LANGUAGE_OPTIONS } from '../../../shared/i18n'

export const meta: DetailsPageMeta = {
  navigator: 'settings',
  slug: 'appearance',
}

export default function AppearanceSettingsPage() {
  const { t, uiLanguage, setUiLanguage } = useI18n()
  const {
    mode,
    setMode,
    colorTheme,
    setColorTheme,
    font,
    setFont,
    activeWorkspaceId,
    setWorkspaceColorTheme,
    themeLoadError,
    themeResolvedFrom,
  } = useTheme()
  const { workspaces } = useAppShellContext()

  // Fetch workspace icons as data URLs (file:// URLs don't work in renderer)
  const workspaceIconMap = useWorkspaceIcons(workspaces)

  // Preset themes for the color theme dropdown
  const [presetThemes, setPresetThemes] = useState<PresetTheme[]>([])

  // Per-workspace theme overrides (workspaceId -> themeId or undefined)
  const [workspaceThemes, setWorkspaceThemes] = useState<Record<string, string | undefined>>({})

  // Tool icon mappings loaded from main process
  const [toolIcons, setToolIcons] = useState<ToolIconMapping[]>([])

  // Resolved path to tool-icons.json (needed for EditPopover and "Edit File" action)
  const [toolIconsJsonPath, setToolIconsJsonPath] = useState<string | null>(null)

  // Connection icon visibility toggle
  const [showConnectionIcons, setShowConnectionIcons] = useState(() =>
    storage.get(storage.KEYS.showConnectionIcons, true)
  )
  const handleConnectionIconsChange = useCallback((checked: boolean) => {
    setShowConnectionIcons(checked)
    storage.set(storage.KEYS.showConnectionIcons, checked)
  }, [])

  // Rich tool descriptions toggle (persisted in config.json, read by SDK subprocess)
  const [richToolDescriptions, setRichToolDescriptions] = useState(true)
  useEffect(() => {
    window.electronAPI?.getRichToolDescriptions?.().then(setRichToolDescriptions)
  }, [])
  const handleRichToolDescriptionsChange = useCallback(async (checked: boolean) => {
    setRichToolDescriptions(checked)
    await window.electronAPI?.setRichToolDescriptions?.(checked)
  }, [])

  // Load preset themes on mount
  useEffect(() => {
    const loadThemes = async () => {
      if (!window.electronAPI) {
        setPresetThemes([])
        return
      }
      try {
        const themes = await window.electronAPI.loadPresetThemes()
        setPresetThemes(themes)
      } catch (error) {
        console.error('Failed to load preset themes:', error)
        setPresetThemes([])
      }
    }
    loadThemes()
  }, [])

  // Load workspace themes on mount
  useEffect(() => {
    const loadWorkspaceThemes = async () => {
      if (!window.electronAPI?.getAllWorkspaceThemes) return
      try {
        const themes = await window.electronAPI.getAllWorkspaceThemes()
        setWorkspaceThemes(themes)
      } catch (error) {
        console.error('Failed to load workspace themes:', error)
      }
    }
    loadWorkspaceThemes()
  }, [])

  // Load tool icon mappings and resolve the config file path on mount
  useEffect(() => {
    const load = async () => {
      if (!window.electronAPI) return
      try {
        const [mappings, homeDir] = await Promise.all([
          window.electronAPI.getToolIconMappings(),
          window.electronAPI.getHomeDir(),
        ])
        setToolIcons(mappings)
        setToolIconsJsonPath(`${homeDir}/.zhangyuge-agent/tool-icons/tool-icons.json`)
      } catch (error) {
        console.error('Failed to load tool icon mappings:', error)
      }
    }
    load()
  }, [])

  // Handler for workspace theme change
  // Uses ThemeContext for the active workspace (immediate visual update) and IPC for other workspaces
  const handleWorkspaceThemeChange = useCallback(
    async (workspaceId: string, value: string) => {
      // 'default' means inherit from app default (null in storage)
      const themeId = value === 'default' ? null : value

      // If changing the current workspace, use context for immediate update
      if (workspaceId === activeWorkspaceId) {
        setWorkspaceColorTheme(themeId)
      } else {
        // For other workspaces, just persist via IPC
        await window.electronAPI?.setWorkspaceColorTheme?.(workspaceId, themeId)
      }

      // Update local state for UI
      setWorkspaceThemes(prev => ({
        ...prev,
        [workspaceId]: themeId ?? undefined
      }))
    },
    [activeWorkspaceId, setWorkspaceColorTheme]
  )

  // Theme options for dropdowns
  const themeOptions = useMemo(() => [
    { value: 'default', label: t('settings.appearance.options.useDefault') },
    ...presetThemes
      .filter(t => t.id !== 'default')
      .map(t => ({
        value: t.id,
        label: t.theme.name || t.id,
      })),
  ], [presetThemes, t])

  const languageOptions = useMemo(() => UI_LANGUAGE_OPTIONS.map((value) => {
    if (value === 'system') {
      return {
        value,
        label: t('common.language.system'),
        description: t('common.language.systemDescription'),
      }
    }
    if (value === 'zh-CN') {
      return {
        value,
        label: t('common.language.zhCN'),
        description: t('common.language.zhCNDescription'),
      }
    }
    return {
      value,
      label: t('common.language.en'),
      description: t('common.language.enDescription'),
    }
  }), [t])

  // Get current app default theme label for display (null when using 'default' to avoid redundant "Use Default (Default)")
  const appDefaultLabel = useMemo(() => {
    if (colorTheme === 'default') return null
    const preset = presetThemes.find(t => t.id === colorTheme)
    return preset?.theme.name || colorTheme
  }, [colorTheme, presetThemes])

  const toolIconColumns = useMemo<ColumnDef<ToolIconMapping>[]>(() => [
    {
      accessorKey: 'iconDataUrl',
      header: () => <span className="p-1.5 pl-2.5">{t('settings.appearance.table.icon')}</span>,
      cell: ({ row }) => (
        <div className="p-1.5 pl-2.5">
          <img
            src={row.original.iconDataUrl}
            alt={row.original.displayName}
            className="w-5 h-5 object-contain"
          />
        </div>
      ),
      size: 60,
      enableSorting: false,
    },
    {
      accessorKey: 'displayName',
      header: ({ column }) => <SortableHeader column={column} title={t('settings.appearance.table.tool')} />,
      cell: ({ row }) => (
        <div className="p-1.5 pl-2.5 font-medium">
          {row.original.displayName}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: 'commands',
      header: () => <span className="p-1.5 pl-2.5">{t('settings.appearance.table.commands')}</span>,
      cell: ({ row }) => (
        <div className="p-1.5 pl-2.5 flex flex-wrap gap-1">
          {row.original.commands.map(cmd => (
            <Info_Badge key={cmd} color="muted" className="font-mono">
              {cmd}
            </Info_Badge>
          ))}
        </div>
      ),
      meta: { fillWidth: true },
      enableSorting: false,
    },
  ], [t])

  return (
    <div className="h-full flex flex-col">
      <PanelHeader
        title={t('settings.pages.appearance.title')}
        actions={<HeaderMenu route={routes.view.settings('appearance')} helpFeature="themes" />}
      />
      <div className="flex-1 min-h-0 mask-fade-y">
        <ScrollArea className="h-full">
          <div className="px-5 py-7 max-w-3xl mx-auto">
            <div className="space-y-8">

              {/* Default Theme */}
              <SettingsSection title={t('settings.appearance.sections.defaultTheme')}>
                <SettingsCard>
                  <SettingsRow label={t('settings.appearance.rows.mode')}>
                    <SettingsSegmentedControl
                      value={mode}
                      onValueChange={setMode}
                      options={[
                        { value: 'system', label: t('settings.appearance.options.modeSystem'), icon: <Monitor className="w-4 h-4" /> },
                        { value: 'light', label: t('settings.appearance.options.modeLight'), icon: <Sun className="w-4 h-4" /> },
                        { value: 'dark', label: t('settings.appearance.options.modeDark'), icon: <Moon className="w-4 h-4" /> },
                      ]}
                    />
                  </SettingsRow>
                  <SettingsRow label={t('settings.appearance.rows.colorTheme')}>
                    <SettingsMenuSelect
                      value={colorTheme}
                      onValueChange={setColorTheme}
                      options={themeOptions}
                    />
                  </SettingsRow>
                  <SettingsRow label={t('settings.appearance.rows.font')}>
                    <SettingsSegmentedControl
                      value={font}
                      onValueChange={setFont}
                      options={[
                        { value: 'inter', label: t('settings.appearance.options.fontInter') },
                        { value: 'system', label: t('settings.appearance.options.fontSystem') },
                      ]}
                    />
                  </SettingsRow>
                </SettingsCard>
                {themeLoadError && (
                  <p className="mt-2 text-xs text-info">
                    {t('settings.appearance.rows.themeWarning', {
                      message: themeLoadError,
                      fallback: themeResolvedFrom === 'fallback'
                        ? t('settings.appearance.rows.fallbackBundled')
                        : t('settings.appearance.rows.fallbackDefault'),
                    })}
                  </p>
                )}
              </SettingsSection>

              {/* Workspace Themes */}
              {workspaces.length > 0 && (
                <SettingsSection
                  title={t('settings.appearance.sections.workspaceThemes')}
                  description={t('settings.appearance.descriptions.workspaceThemes')}
                >
                  <SettingsCard>
                    {workspaces.map((workspace) => {
                      const wsTheme = workspaceThemes[workspace.id]
                      const hasCustomTheme = wsTheme !== undefined
                      return (
                        <SettingsRow
                          key={workspace.id}
                          label={
                            <div className="flex items-center gap-2">
                              {workspaceIconMap.get(workspace.id) ? (
                                <img
                                  src={workspaceIconMap.get(workspace.id)}
                                  alt=""
                                  className="w-4 h-4 rounded object-cover"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded bg-foreground/10" />
                              )}
                              <span>{workspace.name}</span>
                            </div>
                          }
                        >
                          <SettingsMenuSelect
                            value={hasCustomTheme ? wsTheme : 'default'}
                            onValueChange={(value) => handleWorkspaceThemeChange(workspace.id, value)}
                            options={[
                              {
                                value: 'default',
                                label: appDefaultLabel
                                  ? t('settings.appearance.options.useDefaultWithName', { name: appDefaultLabel })
                                  : t('settings.appearance.options.useDefault'),
                              },
                              ...presetThemes
                                .filter(t => t.id !== 'default')
                                .map(t => ({
                                  value: t.id,
                                  label: t.theme.name || t.id,
                                })),
                            ]}
                          />
                        </SettingsRow>
                      )
                    })}
                  </SettingsCard>
                </SettingsSection>
              )}

              {/* Interface */}
              <SettingsSection title={t('settings.appearance.sections.interface')}>
                <SettingsCard>
                  <SettingsRow
                    label={t('common.language.selectorLabel')}
                    description={t('common.language.selectorDescription')}
                  >
                    <SettingsMenuSelect
                      value={uiLanguage}
                      onValueChange={(value) => void setUiLanguage(value as typeof uiLanguage)}
                      options={languageOptions}
                      searchable={false}
                    />
                  </SettingsRow>
                  <SettingsToggle
                    label={t('settings.appearance.rows.connectionIcons')}
                    description={t('settings.appearance.descriptions.connectionIcons')}
                    checked={showConnectionIcons}
                    onCheckedChange={handleConnectionIconsChange}
                  />
                  <SettingsToggle
                    label={t('settings.appearance.rows.richToolDescriptions')}
                    description={t('settings.appearance.descriptions.richToolDescriptions')}
                    checked={richToolDescriptions}
                    onCheckedChange={handleRichToolDescriptionsChange}
                  />
                </SettingsCard>
              </SettingsSection>

              {/* Tool Icons — shows the command → icon mapping used in turn cards */}
              <SettingsSection
                title={t('settings.appearance.sections.toolIcons')}
                description={t('settings.appearance.descriptions.toolIcons')}
                action={
                  toolIconsJsonPath ? (
                    <EditPopover
                      trigger={<EditButton />}
                      {...getEditConfig('edit-tool-icons', toolIconsJsonPath, t)}
                      secondaryAction={{
                        label: t('settings.appearance.rows.editFile'),
                        filePath: toolIconsJsonPath,
                      }}
                    />
                  ) : undefined
                }
              >
                <SettingsCard>
                  <Info_DataTable
                    columns={toolIconColumns}
                    data={toolIcons}
                    searchable={{ placeholder: t('settings.appearance.rows.searchTools') }}
                    maxHeight={480}
                    emptyContent={t('settings.appearance.rows.emptyToolIcons')}
                  />
                </SettingsCard>
              </SettingsSection>

            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
