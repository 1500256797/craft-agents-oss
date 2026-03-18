/**
 * CronBuilder
 *
 * Visual cron expression builder with three synchronized layers:
 * 1. Preset buttons — common schedules
 * 2. Visual fields — 5 interactive fields with dropdowns
 * 3. Raw expression — editable text input
 *
 * Plus human-readable summary and next-run preview.
 */

import * as React from 'react'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { describeCron as describeCronExpression, computeNextRuns } from './utils'
import { useI18n } from '@/context/I18nContext'

// ============================================================================
// Presets
// ============================================================================

interface CronPreset {
  labelKey: string
  cron: string
  descriptionKey: string
}

function getPresets(t: (key: string) => string): Array<{ label: string; cron: string; description: string }> {
  const presetConfigs: CronPreset[] = [
    { labelKey: 'common.cronBuilder.presets.everyMinute',    cron: '* * * * *',     descriptionKey: 'common.cronBuilder.descriptions.everyMinute' },
    { labelKey: 'common.cronBuilder.presets.every15Min',     cron: '*/15 * * * *',  descriptionKey: 'common.cronBuilder.descriptions.every15Min' },
    { labelKey: 'common.cronBuilder.presets.everyHour',      cron: '0 * * * *',     descriptionKey: 'common.cronBuilder.descriptions.everyHour' },
    { labelKey: 'common.cronBuilder.presets.dailyMidnight',  cron: '0 0 * * *',     descriptionKey: 'common.cronBuilder.descriptions.dailyMidnight' },
    { labelKey: 'common.cronBuilder.presets.daily9am',       cron: '0 9 * * *',     descriptionKey: 'common.cronBuilder.descriptions.daily9am' },
    { labelKey: 'common.cronBuilder.presets.weekdays9am',    cron: '0 9 * * 1-5',   descriptionKey: 'common.cronBuilder.descriptions.weekdays9am' },
    { labelKey: 'common.cronBuilder.presets.monthlyFirst',   cron: '0 0 1 * *',     descriptionKey: 'common.cronBuilder.descriptions.monthlyFirst' },
  ]

  return presetConfigs.map(p => ({
    label: t(p.labelKey),
    cron: p.cron,
    description: t(p.descriptionKey),
  }))
}

// ============================================================================
// Cron Field Definitions
// ============================================================================

interface FieldDef {
  labelKey: string
  min: number
  max: number
  options?: { value: string; labelKey: string }[]
}

function getFields(t: (key: string) => string): Array<{ label: string; min: number; max: number; options?: { value: string; label: string }[] }> {
  const fieldConfigs: FieldDef[] = [
    { labelKey: 'common.cronBuilder.fields.minute', min: 0, max: 59 },
    { labelKey: 'common.cronBuilder.fields.hour', min: 0, max: 23 },
    { labelKey: 'common.cronBuilder.fields.day', min: 1, max: 31 },
    { labelKey: 'common.cronBuilder.fields.month', min: 1, max: 12, options: [
      { value: '1', labelKey: 'common.cronBuilder.months.jan' }, { value: '2', labelKey: 'common.cronBuilder.months.feb' }, { value: '3', labelKey: 'common.cronBuilder.months.mar' },
      { value: '4', labelKey: 'common.cronBuilder.months.apr' }, { value: '5', labelKey: 'common.cronBuilder.months.may' }, { value: '6', labelKey: 'common.cronBuilder.months.jun' },
      { value: '7', labelKey: 'common.cronBuilder.months.jul' }, { value: '8', labelKey: 'common.cronBuilder.months.aug' }, { value: '9', labelKey: 'common.cronBuilder.months.sep' },
      { value: '10', labelKey: 'common.cronBuilder.months.oct' }, { value: '11', labelKey: 'common.cronBuilder.months.nov' }, { value: '12', labelKey: 'common.cronBuilder.months.dec' },
    ]},
    { labelKey: 'common.cronBuilder.fields.weekday', min: 0, max: 6, options: [
      { value: '0', labelKey: 'common.cronBuilder.weekdays.sun' }, { value: '1', labelKey: 'common.cronBuilder.weekdays.mon' }, { value: '2', labelKey: 'common.cronBuilder.weekdays.tue' },
      { value: '3', labelKey: 'common.cronBuilder.weekdays.wed' }, { value: '4', labelKey: 'common.cronBuilder.weekdays.thu' }, { value: '5', labelKey: 'common.cronBuilder.weekdays.fri' },
      { value: '6', labelKey: 'common.cronBuilder.weekdays.sat' },
    ]},
  ]

  return fieldConfigs.map(f => ({
    label: t(f.labelKey),
    min: f.min,
    max: f.max,
    options: f.options?.map(o => ({ value: o.value, label: t(o.labelKey) })),
  }))
}

// ============================================================================
// Helpers
// ============================================================================

function validateCron(cron: string, t: (key: string, params?: any) => string, fields: Array<{ label: string }>): string | null {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return t('common.cronBuilder.errors.needs5Parts')
  // Basic validation per field
  const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]]
  for (let i = 0; i < 5; i++) {
    const part = parts[i]
    if (part === '*') continue
    if (/^\*\/\d+$/.test(part)) continue
    if (/^[\d,\-\/]+$/.test(part)) continue
    return t('common.cronBuilder.errors.invalidValue', { field: fields[i]?.label ?? `field ${i + 1}`, value: part })
  }
  return null
}

// ============================================================================
// Field Editor
// ============================================================================

interface CronFieldProps {
  field: { label: string; min: number; max: number; options?: { value: string; label: string }[] }
  value: string
  onChange: (value: string) => void
}

function CronField({ field, value, onChange }: CronFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {field.label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full px-2 py-1.5 text-xs font-mono text-center rounded-md border border-border/50',
          'bg-background focus:outline-none focus:ring-1 focus:ring-accent/50',
        )}
        placeholder="*"
      />
    </div>
  )
}

// ============================================================================
// Component
// ============================================================================

export interface CronBuilderProps {
  value?: string
  onChange?: (cron: string) => void
  timezone?: string
  onTimezoneChange?: (tz: string) => void
  className?: string
}

export function CronBuilder({
  value = '0 9 * * 1-5',
  onChange,
  timezone,
  onTimezoneChange,
  className,
}: CronBuilderProps) {
  const { t } = useI18n()
  const [rawInput, setRawInput] = useState(value)
  const [fieldValues, setFieldValues] = useState<string[]>(value.split(/\s+/))

  const presets = useMemo(() => getPresets(t), [t])
  const fields = useMemo(() => getFields(t), [t])

  // Sync raw input and fields
  useEffect(() => {
    setRawInput(value)
    setFieldValues(value.split(/\s+/))
  }, [value])

  // Update from raw input
  const handleRawChange = useCallback((raw: string) => {
    setRawInput(raw)
    const parts = raw.trim().split(/\s+/)
    if (parts.length === 5) {
      setFieldValues(parts)
      onChange?.(raw.trim())
    }
  }, [onChange])

  // Update from field editor
  const handleFieldChange = useCallback((index: number, val: string) => {
    const newFields = [...fieldValues]
    newFields[index] = val || '*'
    setFieldValues(newFields)
    const cron = newFields.join(' ')
    setRawInput(cron)
    onChange?.(cron)
  }, [fieldValues, onChange])

  // Apply preset
  const handlePreset = useCallback((cron: string) => {
    setRawInput(cron)
    setFieldValues(cron.split(/\s+/))
    onChange?.(cron)
  }, [onChange])

  const validationError = useMemo(() => validateCron(rawInput, t, fields), [rawInput, t, fields])
  const description = useMemo(() => describeCronExpression(rawInput), [rawInput])
  const nextRuns = useMemo(() => computeNextRuns(rawInput), [rawInput])

  return (
    <div className={cn('space-y-5', className)}>
      {/* Layer 1: Common Schedules */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">
          {t('common.cronBuilder.commonSchedules')}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.cron}
              onClick={() => handlePreset(preset.cron)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                rawInput === preset.cron
                  ? 'bg-foreground/10 text-foreground ring-1 ring-border/50'
                  : 'bg-foreground/[0.03] text-foreground/70 hover:bg-foreground/[0.06] shadow-minimal'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layer 2: Custom Schedule */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">
          {t('common.cronBuilder.customSchedule')}
        </h4>
        <div className="grid grid-cols-5 gap-2">
          {fields.map((field, i) => (
            <CronField
              key={field.label}
              field={field}
              value={fieldValues[i] || '*'}
              onChange={(val) => handleFieldChange(i, val)}
            />
          ))}
        </div>
      </div>

      {/* Layer 3: Advanced */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">
          {t('common.cronBuilder.advanced')}
        </h4>
        <input
          type="text"
          value={rawInput}
          onChange={(e) => handleRawChange(e.target.value)}
          className={cn(
            'w-full px-3 py-2 text-sm font-mono rounded-md border',
            'bg-background focus:outline-none focus:ring-1',
            validationError
              ? 'border-destructive/50 focus:ring-destructive/30'
              : 'border-border/50 focus:ring-accent/50'
          )}
          placeholder="* * * * *"
        />
        {validationError && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {validationError}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-background shadow-minimal rounded-[8px] p-4 space-y-3">
        {/* Human-readable description */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{description}</span>
        </div>

        {/* Next runs */}
        {nextRuns.length > 0 && !validationError && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{t('common.cronBuilder.nextRuns')}</span>
            <div className="flex flex-col gap-0.5">
              {(() => {
                const spansYears = nextRuns.length > 1 && nextRuns[0].getFullYear() !== nextRuns[nextRuns.length - 1].getFullYear()
                return nextRuns.map((date, i) => (
                  <span key={i} className="text-xs text-foreground/70 tabular-nums">
                    {date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      ...(spansYears && { year: 'numeric' }),
                    })} {date.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </span>
                ))
              })()}
            </div>
          </div>
        )}

        {/* Timezone */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t('common.cronBuilder.timezone')}</span>
          <span className="font-medium text-foreground/70">{timezone || t('common.cronBuilder.systemDefault')}</span>
        </div>
      </div>
    </div>
  )
}
