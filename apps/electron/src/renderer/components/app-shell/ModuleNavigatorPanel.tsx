import * as React from 'react'
import { Bot, Radio } from 'lucide-react'
import { getModulePage, type ModuleSubpage } from '../../../shared/module-registry'
import { EntityList, type EntityListGroup } from '@/components/ui/entity-list'
import { EntityRow } from '@/components/ui/entity-row'
import { EntityListBadge } from '@/components/ui/entity-list-badge'
import { useAppShellContext } from '@/context/AppShellContext'
import { useI18n } from '@/context/I18nContext'
import { useTransportConnectionState } from '@/hooks/useTransportConnectionState'
import { ScheduledTasksModulePanel } from './ScheduledTasksModulePanel'

type AgentNavigatorItem =
  | {
      id: string
      kind: 'local'
      name: string
      subtitle: string
      isCurrent: boolean
      onClick: () => void
    }
  | {
      id: string
      kind: 'remote-placeholder'
      name: string
      subtitle: string
      statusLabel: string
    }

function getRemoteStatusTone(state: ReturnType<typeof useTransportConnectionState>): string {
  if (!state || state.mode !== 'remote') return 'bg-foreground/10 text-foreground/60'
  if (state.status === 'connected') return 'bg-success/10 text-success'
  if (state.status === 'connecting' || state.status === 'reconnecting') return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
  if (state.status === 'failed' || state.status === 'disconnected') return 'bg-destructive/10 text-destructive'
  return 'bg-foreground/10 text-foreground/60'
}

interface ModuleNavigatorPanelProps {
  subpage: ModuleSubpage
}

export function ModuleNavigatorPanel({ subpage }: ModuleNavigatorPanelProps) {
  const modulePage = getModulePage(subpage)
  const { workspaces, activeWorkspaceId, onSelectWorkspace } = useAppShellContext()
  const { t } = useI18n()
  const remoteState = useTransportConnectionState()
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(() => new Set(['agents:remote']))

  const getRemoteStatusLabel = React.useCallback((state: ReturnType<typeof useTransportConnectionState>): string => {
    if (!state) return t('settings.lists.agents.status.unavailable')
    if (state.mode !== 'remote') return t('settings.lists.agents.status.localMode')
    if (state.status === 'connected') return t('settings.lists.agents.status.connected')
    if (state.status === 'connecting') return t('settings.lists.agents.status.connecting')
    if (state.status === 'reconnecting') return t('settings.lists.agents.status.reconnecting')
    if (state.status === 'failed') return t('settings.lists.agents.status.failed')
    if (state.status === 'disconnected') return t('settings.lists.agents.status.disconnected')
    return t('settings.lists.agents.status.idle')
  }, [t])

  const toggleGroupCollapse = React.useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }, [])

  const collapseAllGroups = React.useCallback(() => {
    setCollapsedGroups(new Set(['agents:local', 'agents:remote']))
  }, [])

  const expandAllGroups = React.useCallback(() => {
    setCollapsedGroups(new Set())
  }, [])

  if (subpage === 'agents') {
    const localItems: AgentNavigatorItem[] = workspaces.map((workspace) => ({
      id: workspace.id,
      kind: 'local',
      name: workspace.name,
      subtitle: workspace.rootPath,
      isCurrent: workspace.id === activeWorkspaceId,
      onClick: () => onSelectWorkspace(workspace.id),
    }))

    const remoteItems: AgentNavigatorItem[] = [
      {
        id: 'remote-placeholder',
        kind: 'remote-placeholder',
        name: t('settings.lists.agents.remote.title'),
        subtitle: remoteState?.mode === 'remote'
          ? t('settings.lists.agents.remote.pendingConnected')
          : t('settings.lists.agents.remote.pendingUnavailable'),
        statusLabel: getRemoteStatusLabel(remoteState),
      },
    ]

    const groups: EntityListGroup<AgentNavigatorItem>[] = [
      {
        key: 'agents:local',
        label: t('settings.lists.agents.groups.local'),
        items: collapsedGroups.has('agents:local') ? [] : localItems,
        collapsible: true,
        collapsedCount: localItems.length,
      },
      {
        key: 'agents:remote',
        label: t('settings.lists.agents.groups.remote'),
        items: collapsedGroups.has('agents:remote') ? [] : remoteItems,
        collapsible: true,
        collapsedCount: remoteItems.length,
      },
    ]

    return (
      <EntityList
        groups={groups}
        getKey={(item) => item.id}
        collapsedGroups={collapsedGroups}
        onToggleCollapse={toggleGroupCollapse}
        onCollapseAll={collapseAllGroups}
        onExpandAll={expandAllGroups}
        renderItem={(item, _index, isFirstInGroup) => {
          if (item.kind === 'local') {
            return (
              <EntityRow
                icon={<Bot className="h-3.5 w-3.5" />}
                title={item.name}
                badges={(
                  <>
                    <EntityListBadge colorClass="bg-foreground/10 text-foreground/60">
                      {t('settings.lists.agents.badges.local')}
                    </EntityListBadge>
                    {item.isCurrent && (
                      <EntityListBadge colorClass="bg-success/10 text-success">
                        {t('settings.lists.agents.badges.current')}
                      </EntityListBadge>
                    )}
                    <span className="truncate">{item.subtitle}</span>
                  </>
                )}
                isSelected={item.isCurrent}
                onClick={item.onClick}
                showSeparator={!isFirstInGroup}
              />
            )
          }

          return (
            <EntityRow
              icon={<Radio className="h-3.5 w-3.5" />}
              title={item.name}
              badges={(
                <>
                  <EntityListBadge colorClass={getRemoteStatusTone(remoteState)}>
                    {item.statusLabel}
                  </EntityListBadge>
                  <span className="truncate">{item.subtitle}</span>
                </>
              )}
              onClick={() => {}}
              showSeparator={!isFirstInGroup}
            />
          )
        }}
      />
    )
  }

  if (subpage === 'scheduled-tasks') {
    return <ScheduledTasksModulePanel />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          <div className="rounded-[12px] border border-foreground/10 bg-background px-4 py-4 shadow-minimal">
            <p className="text-sm font-medium text-foreground">{modulePage.label}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {modulePage.description}
            </p>
            <p className="mt-4 text-xs leading-5 text-muted-foreground/80">
              This module is scaffolded in the desktop shell and will be filled with Client-native functionality next.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
