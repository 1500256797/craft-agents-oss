import * as React from 'react'
import type { ResolvedUiLanguage, UiLanguage } from '@craft-agent/shared/config'
import { resolveUiLanguage, translateUi } from '../../shared/i18n'

type TranslationParams = Record<string, string | number>

interface I18nContextValue {
  uiLanguage: UiLanguage
  resolvedLanguage: ResolvedUiLanguage
  setUiLanguage: (language: UiLanguage) => Promise<void>
  t: (key: string, params?: TranslationParams, fallback?: string) => string
}

const defaultResolvedLanguage = resolveUiLanguage('system', typeof navigator !== 'undefined' ? navigator.language : 'en')

const defaultContext: I18nContextValue = {
  uiLanguage: 'system',
  resolvedLanguage: defaultResolvedLanguage,
  setUiLanguage: async () => {},
  t: (key, params, fallback) => translateUi(defaultResolvedLanguage, key, params, fallback),
}

const I18nContext = React.createContext<I18nContextValue>(defaultContext)

interface I18nProviderProps {
  children: React.ReactNode
}

function getSystemLocale() {
  if (typeof navigator === 'undefined') return 'en'
  return navigator.languages?.[0] || navigator.language || 'en'
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [uiLanguage, setUiLanguageState] = React.useState<UiLanguage>('system')
  const [systemLocale, setSystemLocale] = React.useState<string>(getSystemLocale)

  React.useEffect(() => {
    setSystemLocale(getSystemLocale())
  }, [])

  React.useEffect(() => {
    if (!window.electronAPI?.getUiLanguage) return

    let cancelled = false

    void window.electronAPI.getUiLanguage().then((nextLanguage) => {
      if (!cancelled) {
        setUiLanguageState(nextLanguage)
      }
    }).catch(() => {})

    const cleanup = window.electronAPI.onUiLanguageChange?.((nextLanguage) => {
      setUiLanguageState(nextLanguage)
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  const resolvedLanguage = React.useMemo(
    () => resolveUiLanguage(uiLanguage, systemLocale),
    [systemLocale, uiLanguage],
  )

  React.useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = resolvedLanguage
  }, [resolvedLanguage])

  const setUiLanguage = React.useCallback(async (language: UiLanguage) => {
    setUiLanguageState(language)
    await window.electronAPI?.setUiLanguage?.(language)
  }, [])

  const t = React.useCallback((
    key: string,
    params?: TranslationParams,
    fallback?: string,
  ) => translateUi(resolvedLanguage, key, params, fallback), [resolvedLanguage])

  const value = React.useMemo<I18nContextValue>(() => ({
    uiLanguage,
    resolvedLanguage,
    setUiLanguage,
    t,
  }), [resolvedLanguage, setUiLanguage, t, uiLanguage])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return React.useContext(I18nContext)
}
