import type { ResolvedUiLanguage, UiLanguage } from '@craft-agent/shared/config'
import type { SettingsSubpage } from './settings-registry'
import type { MenuItem, MenuSection } from './menu-schema'
import enMessages from '../locales/en.json'
import zhCNMessages from '../locales/zh-CN.json'

export const UI_LANGUAGE_OPTIONS: UiLanguage[] = ['system', 'en', 'zh-CN']

type TranslationParams = Record<string, string | number>

const UI_MESSAGES = {
  en: enMessages,
  'zh-CN': zhCNMessages,
} as const

type MessageKey = string

function lookupMessage(locale: ResolvedUiLanguage, key: MessageKey): string | undefined {
  const messages = UI_MESSAGES[locale]
  if (!messages) return undefined

  const parts = key.split('.')
  let current: any = messages

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      return undefined
    }
  }

  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? `{{${key}}}`))
}

function normalizeUiLanguage(locale?: string | null): ResolvedUiLanguage {
  if (!locale) return 'en'
  const normalized = locale.toLowerCase()
  if (normalized.startsWith('zh')) return 'zh-CN'
  return 'en'
}

export function resolveUiLanguage(selection: UiLanguage, systemLocale?: string | null): ResolvedUiLanguage {
  if (selection === 'system') {
    return normalizeUiLanguage(systemLocale)
  }
  return selection
}

export function translateUi(
  locale: ResolvedUiLanguage,
  key: string,
  params?: TranslationParams,
  fallback?: string,
): string {
  const message = lookupMessage(locale, key) ?? lookupMessage('en', key) ?? fallback ?? key
  return interpolate(message, params)
}

export function getSettingsPageCopy(
  locale: ResolvedUiLanguage,
  pageId: SettingsSubpage,
  fallbackLabel: string,
  fallbackDescription: string,
): { label: string; description: string; title: string } {
  return {
    label: translateUi(locale, `settings.pages.${pageId}.label`, undefined, fallbackLabel),
    description: translateUi(locale, `settings.pages.${pageId}.description`, undefined, fallbackDescription),
    title: translateUi(locale, `settings.pages.${pageId}.title`, undefined, fallbackLabel),
  }
}

export function getMenuSectionLabel(
  locale: ResolvedUiLanguage,
  section: MenuSection,
): string {
  return translateUi(locale, `menu.sections.${section.id}`, undefined, section.label)
}

export function getMenuItemLabel(
  locale: ResolvedUiLanguage,
  item: MenuItem,
): string | null {
  if (item.type === 'separator') return null
  if (item.type === 'role') {
    return translateUi(locale, `menu.items.role.${item.role}`, undefined, item.label)
  }
  return translateUi(locale, `menu.items.action.${item.id}`, undefined, item.label)
}
