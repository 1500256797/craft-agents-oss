import * as React from 'react'
import { useAtomValue } from 'jotai'
import { Clock } from 'lucide-react'
import { automationsAtom } from '@/atoms/automations'
import { AutomationCard } from '@/components/automations/AutomationCard'
import { Button } from '@/components/ui/button'
import { EditPopover, getEditConfig } from '@/components/ui/EditPopover'
import { EntityListEmptyScreen } from '@/components/ui/entity-list-empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useActiveWorkspace, useAppShellContext } from '@/context/AppShellContext'
import { useI18n } from '@/context/I18nContext'

export function ScheduledTasksModulePanel() {
  const { t } = useI18n()
  const activeWorkspace = useActiveWorkspace()
  const automations = useAtomValue(automationsAtom)
  const { onTestAutomation, onToggleAutomation } = useAppShellContext()

  const scheduledTasks = React.useMemo(() => {
    return [...automations]
      .filter((automation) => automation.event === 'SchedulerTick')
      .sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
        return (b.lastExecutedAt ?? 0) - (a.lastExecutedAt ?? 0)
      })
  }, [automations])

  const workspaceRootPath = activeWorkspace?.rootPath

  const actions = workspaceRootPath ? (
    <>
      <EditPopover
        align="center"
        trigger={
          <Button size="sm">
            {t('common.sidebar.scheduledTasksPanel.create')}
          </Button>
        }
        {...getEditConfig('add-scheduled-task', workspaceRootPath, t)}
      />
      <EditPopover
        align="center"
        trigger={
          <Button size="sm" variant="outline">
            {t('common.sidebar.scheduledTasksPanel.advanced')}
          </Button>
        }
        {...getEditConfig('automation-config', workspaceRootPath, t)}
      />
    </>
  ) : null

  if (scheduledTasks.length === 0) {
    return (
      <div className="flex h-full flex-col px-4 py-4">
        <EntityListEmptyScreen
          icon={<Clock />}
          title={t('common.sidebar.scheduledTasksPanel.emptyTitle')}
          description={t('common.sidebar.scheduledTasksPanel.emptyDescription')}
          docKey="automations"
        >
          {actions}
        </EntityListEmptyScreen>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/50 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t('common.sidebar.scheduledTasksPanel.title')}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t('common.sidebar.scheduledTasksPanel.description')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 px-4 py-4">
          {scheduledTasks.map((task) => (
            <AutomationCard
              key={task.id}
              automation={task}
              onToggleEnabled={() => onToggleAutomation?.(task.id)}
              onTest={() => onTestAutomation?.(task.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
