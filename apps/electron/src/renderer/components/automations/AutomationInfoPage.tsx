/**
 * AutomationInfoPage
 *
 * Detail view for a selected automation, using the Info_Page compound component system.
 * Follows SourceInfoPage pattern: Hero → Sections (When, Then, Settings, History, JSON).
 */

import * as React from 'react'
import { PauseCircle, AlertCircle } from 'lucide-react'
import {
  Info_Page,
  Info_Section,
  Info_Table,
  Info_Alert,
  Info_Badge,
  Info_Markdown,
} from '@/components/info'
import { EditPopover, EditButton, getEditConfig } from '@/components/ui/EditPopover'
import { useActiveWorkspace } from '@/context/AppShellContext'
import { AutomationAvatar } from './AutomationAvatar'
import { AutomationMenu } from './AutomationMenu'
import { AutomationActionRow } from './AutomationActionRow'
import { AutomationTestPanel } from './AutomationTestPanel'
import { AutomationEventTimeline } from './AutomationEventTimeline'
import { PhaseBadge } from './PhaseBadge'
import { getEventDisplayName, getPermissionDisplayName, type AutomationConditionUI, type AutomationListItem, type ExecutionEntry, type TestResult } from './types'
import { describeCron, computeNextRuns } from './utils'
import { useI18n } from '@/context/I18nContext'

// ============================================================================
// Condition display helpers
// ============================================================================

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
  fallback?: string,
) => string

function getConditionFieldLabel(field: string, t: TranslateFn): string {
  switch (field) {
    case 'permissionMode':
      return t('common.automationInfo.permissionModeField')
    case 'sessionStatus':
      return t('common.automationInfo.sessionStatusField')
    case 'isFlagged':
      return t('common.automationInfo.flaggedField')
    case 'labels':
      return t('common.automationInfo.labelField')
    case 'sessionName':
      return t('common.automationInfo.sessionNameField')
    default:
      return field
  }
}

function describeConditionLeaf(condition: AutomationConditionUI, t: TranslateFn): string {
  switch (condition.condition) {
    case 'time': {
      const parts: string[] = []
      if (condition.weekday?.length) parts.push(condition.weekday.join(', '))
      if (condition.after) parts.push(t('common.automationInfo.after', { value: condition.after }))
      if (condition.before) parts.push(t('common.automationInfo.before', { value: condition.before }))
      if (condition.timezone) parts.push(`(${condition.timezone})`)
      return parts.length > 0 ? parts.join(' ') : t('common.automationInfo.anyTime')
    }
    case 'state': {
      const field = getConditionFieldLabel(condition.field, t)
      if (condition.from !== undefined || condition.to !== undefined) {
        const from = condition.from !== undefined ? String(condition.from) : t('common.automationInfo.anyValue')
        const to = condition.to !== undefined ? String(condition.to) : t('common.automationInfo.anyValue')
        return t('common.automationInfo.changedFromTo', { field, from, to })
      }
      if (condition.contains) {
        return t('common.automationInfo.hasField', { field, value: condition.contains })
      }
      if (condition.not_value !== undefined) {
        if (condition.field === 'isFlagged') {
          return condition.not_value
            ? t('common.automationInfo.notFlagged')
            : t('common.automationInfo.isFlagged')
        }
        return t('common.automationInfo.isNotValue', { field, value: String(condition.not_value) })
      }
      if (condition.value !== undefined) {
        if (condition.field === 'isFlagged') {
          return condition.value
            ? t('common.automationInfo.isFlagged')
            : t('common.automationInfo.notFlagged')
        }
        return t('common.automationInfo.isValue', { field, value: String(condition.value) })
      }
      return field
    }
    case 'and':
    case 'or':
    case 'not': {
      const separator = condition.condition === 'not'
        ? t('common.automationInfo.conditionAndNot')
        : condition.condition === 'and'
          ? t('common.automationInfo.conditionAnd')
          : t('common.automationInfo.conditionOr')
      return condition.conditions.map((item) => describeConditionLeaf(item, t)).join(separator)
    }
  }
}

function flattenConditions(conditions: AutomationConditionUI[], t: TranslateFn): Array<{ label: string; description: string }> {
  const rows: Array<{ label: string; description: string }> = []
  for (const condition of conditions) {
    if (condition.condition === 'and' || condition.condition === 'or' || condition.condition === 'not') {
      const firstChild = condition.conditions[0]
      const label = firstChild
        ? firstChild.condition === 'time'
          ? t('common.automationInfo.timeCondition')
          : firstChild.condition === 'state'
            ? t('common.automationInfo.stateCondition')
            : t('common.automationInfo.condition')
        : t('common.automationInfo.condition')
      rows.push({ label, description: describeConditionLeaf(condition, t) })
      continue
    }
    rows.push({
      label: condition.condition === 'time'
        ? t('common.automationInfo.timeCondition')
        : t('common.automationInfo.stateCondition'),
      description: describeConditionLeaf(condition, t),
    })
  }
  return rows
}

// ============================================================================
// Component
// ============================================================================

export interface AutomationInfoPageProps {
  automation: AutomationListItem
  executions?: ExecutionEntry[]
  testResult?: TestResult
  onToggleEnabled?: () => void
  onTest?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onReplay?: (automationId: string, event: string) => void
  className?: string
}

export function AutomationInfoPage({
  automation,
  executions = [],
  testResult,
  onToggleEnabled,
  onTest,
  onDuplicate,
  onDelete,
  onReplay,
  className,
}: AutomationInfoPageProps) {
  const { t } = useI18n()
  const workspace = useActiveWorkspace()
  const nextRuns = automation.cron ? computeNextRuns(automation.cron) : []

  const editActions = workspace?.rootPath ? (
    <EditPopover
      trigger={<EditButton />}
      {...getEditConfig('automation-config', workspace.rootPath, t)}
      secondaryAction={{ label: t('common.automationInfo.editFile'), filePath: `${workspace.rootPath}/automations.json` }}
    />
  ) : undefined

  return (
    <Info_Page className={className}>
      <Info_Page.Header
        title={automation.name}
        titleMenu={
          <AutomationMenu
            automationId={automation.id}
            automationName={automation.name}
            enabled={automation.enabled}
            onToggleEnabled={onToggleEnabled}
            onTest={onTest}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        }
      />

      <Info_Page.Content>
        {/* Hero */}
        <div className="flex items-start justify-between">
          <Info_Page.Hero
            avatar={<AutomationAvatar event={automation.event} fluid />}
            title={automation.name}
            tagline={automation.summary}
          />
          {editActions}
        </div>

        {/* Disabled warning */}
        {!automation.enabled && (
          <Info_Alert variant="warning" icon={<PauseCircle className="h-4 w-4" />}>
            <Info_Alert.Title>{t('common.automationInfo.paused')}</Info_Alert.Title>
            <Info_Alert.Description>
              {t('common.automationInfo.pausedDescription')}
            </Info_Alert.Description>
          </Info_Alert>
        )}

        {/* Section: When */}
        <Info_Section
          title={t('common.automationInfo.when')}
          description={t('common.automationInfo.whenDescription')}
          actions={editActions}
        >
          <Info_Table>
            <Info_Table.Row label={t('common.automationInfo.event')}>
              <Info_Badge color="default">{getEventDisplayName(automation.event)}</Info_Badge>
            </Info_Table.Row>
            <Info_Table.Row label={t('common.automationInfo.timing')}>
              <PhaseBadge event={automation.event} />
            </Info_Table.Row>
            {automation.matcher && (
              <Info_Table.Row label={t('common.automationInfo.onlyWhenMatching')}>
                <code className="text-xs font-mono bg-foreground/5 px-1.5 py-0.5 rounded">
                  {automation.matcher}
                </code>
              </Info_Table.Row>
            )}
            {automation.cron && (
              <>
                <Info_Table.Row label={t('common.automationInfo.repeats')} value={describeCron(automation.cron)} />
                <Info_Table.Row label={t('common.automationInfo.scheduleExpression')}>
                  <code className="text-xs font-mono bg-foreground/5 px-1.5 py-0.5 rounded">
                    {automation.cron}
                  </code>
                </Info_Table.Row>
                {nextRuns.length > 0 && (
                  <Info_Table.Row label={t('common.automationInfo.nextRuns')}>
                    <div className="flex flex-col gap-0.5">
                      {(() => {
                        const spansYears = nextRuns.length > 1 && nextRuns[0].getFullYear() !== nextRuns[nextRuns.length - 1].getFullYear()
                        return nextRuns.map((date, i) => (
                          <span key={i} className="text-sm text-foreground/70">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(spansYears && { year: 'numeric' }) })}{' '}
                            {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        ))
                      })()}
                    </div>
                  </Info_Table.Row>
                )}
                <Info_Table.Row label={t('common.automationInfo.timezone')} value={automation.timezone || t('common.automationInfo.systemDefault')} />
              </>
            )}
          </Info_Table>
        </Info_Section>

        {/* Section: If (conditions) — hidden when empty */}
        {automation.conditions && automation.conditions.length > 0 && (
          <Info_Section
            title={t('common.automationInfo.if')}
            description={t('common.automationInfo.ifDescription')}
            actions={editActions}
          >
            <Info_Table>
              {flattenConditions(automation.conditions, t).map((row, i) => (
                <Info_Table.Row key={i} label={row.label}>
                  <span className="text-sm text-foreground/70">
                    {row.description}
                  </span>
                </Info_Table.Row>
              ))}
            </Info_Table>
          </Info_Section>
        )}

        {/* Section: Then */}
        <Info_Section
          title={t('common.automationInfo.then')}
          description={automation.actions.length === 1
            ? t('common.automationInfo.thenDescription', { count: automation.actions.length })
            : t('common.automationInfo.thenDescriptionPlural', { count: automation.actions.length })}
          actions={editActions}
        >
          <div className="divide-y divide-border/30">
            {automation.actions.map((action, i) => (
              <AutomationActionRow key={i} action={action} index={i} />
            ))}
          </div>
        </Info_Section>

        {/* Test results (if any) */}
        {testResult && testResult.state !== 'idle' && (
          <AutomationTestPanel result={testResult} />
        )}

        {/* Section: Settings */}
        <Info_Section title={t('common.automationInfo.settings')} actions={editActions}>
          <Info_Table>
            <Info_Table.Row label={t('common.automationInfo.accessLevel')} value={getPermissionDisplayName(automation.permissionMode)} />
            <Info_Table.Row label={t('common.automationInfo.status')}>
              <Info_Badge color={automation.enabled ? 'success' : 'muted'}>
                {automation.enabled ? t('common.automationInfo.active') : t('common.automationInfo.disabled')}
              </Info_Badge>
            </Info_Table.Row>
            {automation.labels && automation.labels.length > 0 && (
              <Info_Table.Row label={t('common.automationInfo.labels')}>
                <div className="flex gap-1.5 flex-wrap">
                  {automation.labels.map((l) => (
                    <Info_Badge key={l} color="muted">{l}</Info_Badge>
                  ))}
                </div>
              </Info_Table.Row>
            )}
          </Info_Table>
        </Info_Section>

        {/* Section: Recent Activity */}
        <Info_Section
          title={t('common.automationInfo.recentActivity')}
          description={executions.length > 0 ? t('common.automationInfo.lastRuns', { count: executions.length }) : undefined}
        >
          <AutomationEventTimeline entries={executions} onReplay={onReplay} />
        </Info_Section>

        {/* Section: Raw config (JSON) */}
        <Info_Section title={t('common.automationInfo.rawConfig')}>
          <div className="rounded-[8px] shadow-minimal overflow-hidden [&_pre]:!bg-transparent [&_.relative]:!bg-transparent [&_.relative]:!border-0 [&_.relative>div:first-child]:!bg-transparent [&_.relative>div:first-child]:!border-0">
            <Info_Markdown maxHeight={300} fullscreen>
              {`\`\`\`json\n${JSON.stringify({
                event: automation.event,
                matcher: automation.matcher,
                conditions: automation.conditions,
                cron: automation.cron,
                timezone: automation.timezone,
                permissionMode: automation.permissionMode,
                labels: automation.labels,
                enabled: automation.enabled,
                actions: automation.actions,
              }, null, 2)}\n\`\`\``}
            </Info_Markdown>
          </div>
        </Info_Section>
      </Info_Page.Content>
    </Info_Page>
  )
}
