/**
 * ApiKeyInput - Reusable API key entry form control
 *
 * Renders a password input for the API key, a preset selector for Base URL,
 * and an optional Model override field.
 *
 * Does NOT include layout wrappers or action buttons — the parent
 * controls placement via the form ID ("api-key-form") for submit binding.
 *
 * Used in: Onboarding CredentialsStep, Settings API dialog
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { Command as CommandPrimitive } from "cmdk"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  StyledDropdownMenuContent,
  StyledDropdownMenuItem,
} from "@/components/ui/styled-dropdown"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react"
import { pickTierDefaults, resolveTierModels, type PiModelInfo } from "./tier-models"
import {
  resolvePiAuthProviderForSubmit,
  resolvePresetStateForBaseUrlChange,
  type PresetKey,
} from "./submit-helpers"
import { useI18n } from '@/context/I18nContext'

import type { CustomEndpointApi, CustomEndpointConfig } from '@config/llm-connections'

export type ApiKeyStatus = 'idle' | 'validating' | 'success' | 'error'

export type { CustomEndpointApi }

export interface ApiKeySubmitData {
  apiKey: string
  baseUrl?: string
  connectionDefaultModel?: string
  models?: string[]
  piAuthProvider?: string
  modelSelectionMode?: 'automaticallySyncedFromProvider' | 'userDefined3Tier'
  /** Custom endpoint protocol — set when user configures an arbitrary API endpoint */
  customEndpoint?: CustomEndpointConfig
}

export interface ApiKeyInputProps {
  /** Current validation status */
  status: ApiKeyStatus
  /** Error message to display when status is 'error' */
  errorMessage?: string
  /** Called when the form is submitted with the key and optional endpoint config */
  onSubmit: (data: ApiKeySubmitData) => void
  /** Form ID for external submit button binding (default: "api-key-form") */
  formId?: string
  /** Disable the input (e.g. during validation) */
  disabled?: boolean
  /** Provider type determines which presets and placeholders to show */
  providerType?: 'anthropic' | 'openai' | 'pi' | 'google' | 'pi_api_key'
  /** Pre-fill values when editing an existing connection */
  initialValues?: {
    apiKey?: string
    baseUrl?: string
    connectionDefaultModel?: string
    activePreset?: string
    models?: string[]
    /** Pre-fill the protocol toggle for custom endpoints */
    customApi?: CustomEndpointApi
  }
}

interface Preset {
  key: PresetKey
  label: string
  url: string
  placeholder?: string
}

function getAnthropicPresets(t: (key: string) => string): Preset[] {
  return [
    { key: 'anthropic', label: t('common.apiKeyInput.providers.anthropic'), url: 'https://api.anthropic.com', placeholder: 'sk-ant-...' },
    { key: 'openai', label: t('common.apiKeyInput.providers.openai'), url: 'https://api.openai.com/v1', placeholder: 'sk-...' },
    { key: 'openai-eu', label: t('common.apiKeyInput.providers.openaiEu'), url: 'https://eu.api.openai.com/v1', placeholder: 'sk-...' },
    { key: 'openai-us', label: t('common.apiKeyInput.providers.openaiUs'), url: 'https://us.api.openai.com/v1', placeholder: 'sk-...' },
    { key: 'google', label: t('common.apiKeyInput.providers.googleAiStudio'), url: 'https://generativelanguage.googleapis.com/v1beta', placeholder: 'AIza...' },
    { key: 'openrouter', label: t('common.apiKeyInput.providers.openrouter'), url: 'https://openrouter.ai/api/v1', placeholder: 'sk-or-...' },
    { key: 'azure-openai-responses', label: t('common.apiKeyInput.providers.azureOpenai'), url: '', placeholder: t('common.apiKeyInput.pasteKeyPlaceholder') },
    { key: 'amazon-bedrock', label: t('common.apiKeyInput.providers.amazonBedrock'), url: 'https://bedrock-runtime.us-east-1.amazonaws.com', placeholder: 'AKIA...' },
    { key: 'groq', label: t('common.apiKeyInput.providers.groq'), url: 'https://api.groq.com/openai/v1', placeholder: 'gsk_...' },
    { key: 'mistral', label: t('common.apiKeyInput.providers.mistral'), url: 'https://api.mistral.ai/v1', placeholder: t('common.apiKeyInput.pasteKeyPlaceholder') },
    { key: 'xai', label: t('common.apiKeyInput.providers.xai'), url: 'https://api.x.ai/v1', placeholder: 'xai-...' },
    { key: 'cerebras', label: t('common.apiKeyInput.providers.cerebras'), url: 'https://api.cerebras.ai/v1', placeholder: 'csk-...' },
    { key: 'zai', label: t('common.apiKeyInput.providers.zai'), url: 'https://api.z.ai/api/coding/paas/v4', placeholder: t('common.apiKeyInput.pasteKeyPlaceholder') },
    { key: 'huggingface', label: t('common.apiKeyInput.providers.huggingface'), url: 'https://router.huggingface.co/v1', placeholder: 'hf_...' },
    { key: 'minimax-global', label: t('common.apiKeyInput.providers.minimaxGlobal'), url: 'https://api.minimax.io/anthropic', placeholder: t('common.apiKeyInput.pasteKeyPlaceholder') },
    { key: 'minimax-cn', label: t('common.apiKeyInput.providers.minimaxCn'), url: 'https://api.minimaxi.com/anthropic', placeholder: t('common.apiKeyInput.pasteKeyPlaceholder') },
    { key: 'kimi-coding', label: t('common.apiKeyInput.providers.kimiCoding'), url: 'https://api.kimi.com/coding', placeholder: 'sk-kimi-...' },
    { key: 'vercel-ai-gateway', label: t('common.apiKeyInput.providers.vercelAiGateway'), url: 'https://ai-gateway.vercel.sh', placeholder: t('common.apiKeyInput.pasteKeyPlaceholder') },
    { key: 'custom', label: t('common.apiKeyInput.providers.custom'), url: '', placeholder: t('common.apiKeyInput.pasteKeyPlaceholder') },
  ]
}

function getOpenaiPresets(t: (key: string) => string): Preset[] {
  return [
    { key: 'openai', label: t('common.apiKeyInput.providers.openai'), url: '' },
  ]
}

function getPiPresets(t: (key: string) => string): Preset[] {
  return [
    { key: 'pi', label: t('common.apiKeyInput.providers.zhangyugeAgentBackend'), url: '' },
    { key: 'openrouter', label: t('common.apiKeyInput.providers.openrouter'), url: 'https://openrouter.ai/api' },
    { key: 'custom', label: t('common.apiKeyInput.providers.custom'), url: '' },
  ]
}

function getGooglePresets(t: (key: string) => string): Preset[] {
  return [
    { key: 'google', label: t('common.apiKeyInput.providers.googleAiStudio'), url: '' },
  ]
}

/** Presets that require the Pi SDK for authentication — hidden in Anthropic API Key mode */
const PI_ONLY_PRESET_KEYS: ReadonlySet<string> = new Set(['minimax-global', 'minimax-cn'])

const COMPAT_ANTHROPIC_DEFAULTS = 'claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5'
const COMPAT_OPENAI_DEFAULTS = 'gpt-5.4, gpt-5.2, gpt-5.1'
const COMPAT_OPENAI_GATEWAY_DEFAULTS = 'openai/gpt-5.4, openai/gpt-5.2, openai/gpt-5.1'
const COMPAT_GOOGLE_DEFAULTS = 'gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite'
const COMPAT_MINIMAX_DEFAULTS = 'MiniMax-M2.5, MiniMax-M2.5-highspeed'
const COMPAT_KIMI_DEFAULTS = 'k2p5, kimi-k2-thinking'
const AUTO_MODEL_DEFAULTS = new Set([
  COMPAT_ANTHROPIC_DEFAULTS,
  COMPAT_OPENAI_DEFAULTS,
  COMPAT_OPENAI_GATEWAY_DEFAULTS,
  COMPAT_GOOGLE_DEFAULTS,
  COMPAT_MINIMAX_DEFAULTS,
  COMPAT_KIMI_DEFAULTS,
])

function getRecommendedModelDefaults(
  presetKey: PresetKey,
  providerType: 'anthropic' | 'openai' | 'pi' | 'google' | 'pi_api_key',
  customApi: CustomEndpointApi,
): string {
  switch (presetKey) {
    case 'anthropic':
      return COMPAT_ANTHROPIC_DEFAULTS
    case 'openai':
    case 'openai-eu':
    case 'openai-us':
    case 'azure-openai-responses':
      return COMPAT_OPENAI_DEFAULTS
    case 'google':
      return COMPAT_GOOGLE_DEFAULTS
    case 'openrouter':
    case 'vercel-ai-gateway':
      return COMPAT_OPENAI_GATEWAY_DEFAULTS
    case 'minimax-global':
    case 'minimax-cn':
      return COMPAT_MINIMAX_DEFAULTS
    case 'kimi-coding':
      return COMPAT_KIMI_DEFAULTS
    case 'custom':
      return customApi === 'anthropic-messages' ? COMPAT_ANTHROPIC_DEFAULTS : COMPAT_OPENAI_DEFAULTS
    default:
      return providerType === 'openai' ? COMPAT_OPENAI_DEFAULTS : COMPAT_ANTHROPIC_DEFAULTS
  }
}

function shouldReplaceAutoModelDefaults(value: string): boolean {
  const normalized = value.trim()
  return !normalized || AUTO_MODEL_DEFAULTS.has(normalized)
}

function getPresetsForProvider(providerType: 'anthropic' | 'openai' | 'pi' | 'google' | 'pi_api_key', t: (key: string) => string): Preset[] {
  const anthropicPresets = getAnthropicPresets(t)
  if (providerType === 'pi_api_key') return anthropicPresets
  if (providerType === 'google') return getGooglePresets(t)
  if (providerType === 'pi') return getPiPresets(t)
  if (providerType === 'openai') return getOpenaiPresets(t)
  // Anthropic mode: exclude presets that only work via Pi SDK
  return anthropicPresets.filter(p => !PI_ONLY_PRESET_KEYS.has(p.key))
}

function getPresetForUrl(url: string, presets: Preset[]): PresetKey {
  const match = presets.find(p => p.key !== 'custom' && p.url === url)
  return match?.key ?? 'custom'
}

function parseModelList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

// ============================================================
// Pi model tier selection (for providers with many models)
// ============================================================

export function ApiKeyInput({
  status,
  errorMessage,
  onSubmit,
  formId = "api-key-form",
  disabled,
  providerType = 'anthropic',
  initialValues,
}: ApiKeyInputProps) {
  const { t } = useI18n()

  // Get presets based on provider type
  const presets = getPresetsForProvider(providerType, t)
  const defaultPreset = presets[0]

  // Compute initial preset: explicit (Pi piAuthProvider), derived from URL, or default
  const initialPreset = initialValues?.activePreset
    ?? (initialValues?.baseUrl ? getPresetForUrl(initialValues.baseUrl, presets) : defaultPreset.key)

  const [apiKey, setApiKey] = useState(initialValues?.apiKey ?? '')
  const [showValue, setShowValue] = useState(false)
  const [baseUrl, setBaseUrl] = useState(initialValues?.baseUrl ?? defaultPreset.url)
  const [activePreset, setActivePreset] = useState<PresetKey>(initialPreset)
  const [lastNonCustomPreset, setLastNonCustomPreset] = useState<PresetKey | null>(
    initialPreset !== 'custom' ? initialPreset : defaultPreset.key
  )
  const [connectionDefaultModel, setConnectionDefaultModel] = useState(initialValues?.connectionDefaultModel ?? '')
  const [customApi, setCustomApi] = useState<CustomEndpointApi>(initialValues?.customApi ?? 'openai-completions')
  const [modelError, setModelError] = useState<string | null>(null)

  // Pi model tier state (for providers with many models like OpenRouter, Vercel)
  const [piModels, setPiModels] = useState<PiModelInfo[]>([])
  const [piModelsLoading, setPiModelsLoading] = useState(false)
  const [bestModel, setBestModel] = useState('')
  const [defaultModel, setDefaultModel] = useState('')
  const [cheapModel, setCheapModel] = useState('')
  const [openTier, setOpenTier] = useState<string | null>(null)
  const [tierFilter, setTierFilter] = useState('')
  const [tierDropdownPosition, setTierDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const tierFilterInputRef = useRef<HTMLInputElement>(null)
  const hydratedTierProviderRef = useRef<string | null>(null)

  const isDisabled = disabled || status === 'validating'

  const isPiApiKeyFlow = providerType === 'pi_api_key'
  // Hide endpoint/model fields for providers with well-known endpoints handled by the SDK
  const DEFAULT_ENDPOINT_PROVIDERS = new Set(['anthropic', 'openai', 'pi', 'google'])
  const isDefaultProviderPreset = DEFAULT_ENDPOINT_PROVIDERS.has(activePreset)

  // Provider-specific placeholders from the active preset
  const activePresetObj = presets.find(p => p.key === activePreset)
  const apiKeyPlaceholder = activePresetObj?.placeholder
    ?? (providerType === 'google' ? 'AIza...'
    : providerType === 'pi' ? 'pi-...'
    : providerType === 'openai' ? 'sk-...'
    : t('common.apiKeyInput.pasteKeyPlaceholder'))
  const modelPlaceholder = getRecommendedModelDefaults(activePreset, providerType, customApi)

  // Fetch Pi SDK models when a provider is selected in pi_api_key flow.
  // Returns all models sorted by cost (expensive-first) for the searchable tier dropdowns.
  const loadPiModels = useCallback(async (provider: string) => {
    if (!isPiApiKeyFlow || !provider || provider === 'custom' || DEFAULT_ENDPOINT_PROVIDERS.has(provider)) {
      setPiModels([])
      return
    }
    setPiModelsLoading(true)
    try {
      const result = await window.electronAPI.getPiProviderModels(provider)
      setPiModels(result.models)

      if (hydratedTierProviderRef.current !== provider) {
        const tiers = resolveTierModels(result.models, provider === initialPreset ? initialValues?.models : undefined)
        setBestModel(tiers.best)
        setDefaultModel(tiers.default_)
        setCheapModel(tiers.cheap)
        hydratedTierProviderRef.current = provider
      }
    } catch (err) {
      console.error('[ApiKeyInput] Failed to load models for', provider, err)
      setPiModels([])
    } finally {
      setPiModelsLoading(false)
    }
  }, [isPiApiKeyFlow])

  useEffect(() => {
    loadPiModels(activePreset)
  }, [activePreset, loadPiModels])

  // Whether to show 3 tier dropdowns instead of text input
  const hasPiModels = isPiApiKeyFlow && piModels.length > 0 && !isDefaultProviderPreset && activePreset !== 'custom'

  useEffect(() => {
    if (activePreset !== 'custom' || isDefaultProviderPreset || hasPiModels) return

    setConnectionDefaultModel((prev) => {
      if (!shouldReplaceAutoModelDefaults(prev)) return prev
      const next = getRecommendedModelDefaults('custom', providerType, customApi)
      return prev === next ? prev : next
    })
  }, [activePreset, customApi, hasPiModels, isDefaultProviderPreset, providerType])

  const handlePresetSelect = (preset: Preset) => {
    setActivePreset(preset.key)
    if (preset.key !== 'custom') {
      setLastNonCustomPreset(preset.key)
    }
    if (preset.key === 'custom') {
      setBaseUrl('')
    } else {
      setBaseUrl(preset.url)
    }
    setModelError(null)
    // Pre-fill recommended model for Ollama; clear for all others
    // (Default provider presets hide the field entirely, others default to provider model IDs when empty)
    if (preset.key === 'ollama') {
      setConnectionDefaultModel('qwen3-coder')
    } else if (preset.key === 'custom'
      || preset.key === 'openrouter'
      || preset.key === 'vercel-ai-gateway'
      || preset.key === 'minimax-global'
      || preset.key === 'minimax-cn'
      || preset.key === 'kimi-coding'
      || preset.key === 'openai'
      || preset.key === 'openai-eu'
      || preset.key === 'openai-us'
      || preset.key === 'azure-openai-responses'
      || preset.key === 'google'
      || preset.key === 'anthropic'
    ) {
      setConnectionDefaultModel(getRecommendedModelDefaults(preset.key, providerType, customApi))
    } else {
      setConnectionDefaultModel('')
    }
  }

  const handleBaseUrlChange = (value: string) => {
    setBaseUrl(value)
    const presetKey = getPresetForUrl(value, presets)
    const currentPresetObj = presets.find(p => p.key === activePreset)
    const nextPresetState = resolvePresetStateForBaseUrlChange({
      matchedPreset: presetKey,
      activePreset,
      activePresetHasEmptyUrl: currentPresetObj?.url === '',
      lastNonCustomPreset,
    })
    setActivePreset(nextPresetState.activePreset)
    setLastNonCustomPreset(nextPresetState.lastNonCustomPreset)
    setModelError(null)
    if (!connectionDefaultModel.trim()) {
      if (presetKey === 'ollama') {
        setConnectionDefaultModel('qwen3-coder')
      } else if (
        presetKey === 'anthropic'
        || presetKey === 'openai'
        || presetKey === 'openai-eu'
        || presetKey === 'openai-us'
        || presetKey === 'azure-openai-responses'
        || presetKey === 'google'
        || presetKey === 'openrouter'
        || presetKey === 'vercel-ai-gateway'
        || presetKey === 'minimax-global'
        || presetKey === 'minimax-cn'
        || presetKey === 'kimi-coding'
        || presetKey === 'custom'
      ) {
        setConnectionDefaultModel(getRecommendedModelDefaults(presetKey, providerType, customApi))
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const effectivePiAuthProvider = isPiApiKeyFlow
      ? resolvePiAuthProviderForSubmit(activePreset, lastNonCustomPreset)
      : undefined

    // Pi API key flow with tier dropdowns — submit selected models
    if (hasPiModels) {
      if (!bestModel || !defaultModel || !cheapModel) {
        setModelError(t('common.apiKeyInput.tierSelectionRequiredError'))
        return
      }
      const models: string[] = [bestModel, defaultModel, cheapModel]
      onSubmit({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        connectionDefaultModel: bestModel,
        models,
        piAuthProvider: effectivePiAuthProvider,
        modelSelectionMode: 'userDefined3Tier',
      })
      return
    }

    const effectiveBaseUrl = baseUrl.trim()

    const parsedModels = parseModelList(connectionDefaultModel)

    const isUsingDefaultEndpoint = isDefaultProviderPreset || !effectiveBaseUrl
    const requiresModel = !isDefaultProviderPreset && !!effectiveBaseUrl
    if (requiresModel && parsedModels.length === 0) {
      setModelError(t('common.apiKeyInput.modelRequiredError'))
      return
    }

    // Include custom endpoint protocol when user configured a custom base URL
    const isCustomEndpoint = activePreset === 'custom' && !!effectiveBaseUrl
    const customEndpoint = isCustomEndpoint ? { api: customApi } : undefined
    const resolvedPiAuthProvider = isCustomEndpoint
      ? (customApi === 'anthropic-messages' ? 'anthropic' : 'openai')
      : effectivePiAuthProvider

    onSubmit({
      apiKey: apiKey.trim(),
      baseUrl: isUsingDefaultEndpoint ? undefined : effectiveBaseUrl,
      connectionDefaultModel: parsedModels[0],
      models: parsedModels.length > 0 ? parsedModels : undefined,
      piAuthProvider: resolvedPiAuthProvider,
      modelSelectionMode: isPiApiKeyFlow
        ? (parsedModels.length > 0 ? 'userDefined3Tier' : 'automaticallySyncedFromProvider')
        : undefined,
      customEndpoint,
    })
  }

  const tierConfigs = [
    { label: t('common.apiKeyInput.tierBest'), desc: t('common.apiKeyInput.tierBestDesc'), value: bestModel, onChange: setBestModel },
    { label: t('common.apiKeyInput.tierBalanced'), desc: t('common.apiKeyInput.tierBalancedDesc'), value: defaultModel, onChange: setDefaultModel },
    { label: t('common.apiKeyInput.tierFast'), desc: t('common.apiKeyInput.tierFastDesc'), value: cheapModel, onChange: setCheapModel },
  ]
  const activeTierConfig = openTier ? tierConfigs.find(t => t.label === openTier) : null

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      {/* API Key */}
      <div className="space-y-2">
        <Label htmlFor="api-key">{t('common.apiKeyInput.apiKey')}</Label>
        <div className={cn(
          "relative rounded-md shadow-minimal transition-colors",
          "bg-foreground-2 focus-within:bg-background"
        )}>
          <Input
            id="api-key"
            type={showValue ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={apiKeyPlaceholder}
            className={cn(
              "pr-10 border-0 bg-transparent shadow-none",
              status === 'error' && "focus-visible:ring-destructive"
            )}
            disabled={isDisabled}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showValue ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* Endpoint/Provider Preset Selector - hidden when only one preset (e.g. Codex/OpenAI direct) */}
      {presets.length > 1 && (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="base-url">{t('common.apiKeyInput.endpoint')}</Label>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isDisabled}
              className="flex h-6 items-center gap-1 rounded-[6px] bg-background shadow-minimal pl-2.5 pr-2 text-[12px] font-medium text-foreground/50 hover:bg-foreground/5 hover:text-foreground focus:outline-none"
            >
              {presets.find(p => p.key === activePreset)?.label}
              <ChevronDown className="size-2.5 opacity-50" />
            </DropdownMenuTrigger>
            <StyledDropdownMenuContent align="end" className="z-floating-menu">
              {presets.map((preset) => (
                <StyledDropdownMenuItem
                  key={preset.key}
                  onClick={() => handlePresetSelect(preset)}
                  className="justify-between"
                >
                  {preset.label}
                  <Check className={cn("size-3", activePreset === preset.key ? "opacity-100" : "opacity-0")} />
                </StyledDropdownMenuItem>
              ))}
            </StyledDropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Base URL input - hidden for default provider presets (Anthropic/OpenAI) */}
        {!isDefaultProviderPreset && (
          <div className={cn(
            "rounded-md shadow-minimal transition-colors",
            "bg-foreground-2 focus-within:bg-background"
          )}>
            <Input
              id="base-url"
              type="text"
              value={baseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder={t('common.apiKeyInput.baseUrlPlaceholder')}
              className="border-0 bg-transparent shadow-none"
              disabled={isDisabled}
            />
          </div>
        )}
      </div>
      )}

      {/* Protocol Toggle — visible as soon as Custom preset is selected */}
      {activePreset === 'custom' && !isDefaultProviderPreset && (
        <div className="space-y-2">
          <Label>{t('common.apiKeyInput.protocol')}</Label>
          <div className={cn(
            "flex rounded-md shadow-minimal overflow-hidden",
            "bg-foreground-2",
            isDisabled && "opacity-50 pointer-events-none"
          )}>
            {([
              { value: 'openai-completions' as const, label: t('common.apiKeyInput.openaiCompatible') },
              { value: 'anthropic-messages' as const, label: t('common.apiKeyInput.anthropicCompatible') },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={isDisabled}
                onClick={() => setCustomApi(value)}
                className={cn(
                  "flex-1 py-1.5 text-[12px] font-medium transition-colors",
                  customApi === value
                    ? "bg-background text-foreground shadow-minimal"
                    : "text-foreground/50 hover:text-foreground/70"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-foreground/30">
            {t('common.apiKeyInput.protocolHint')}
          </p>
        </div>
      )}

      {/* Model Selection — 3 tier dropdowns for Pi providers, text input for custom/compat */}
      {hasPiModels ? (
        <div className="space-y-3">
          {piModelsLoading ? (
            <div className="flex items-center gap-2 py-3 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span className="text-xs">{t('common.apiKeyInput.loadingModels')}</span>
            </div>
          ) : (
            <>
              {tierConfigs.map(({ label, desc, value }) => (
                <div key={label} className="space-y-1.5">
                  <Label className="text-muted-foreground font-normal text-xs">
                    {label}{' '}
                    <span className="text-foreground/30">· {desc}</span>
                  </Label>
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={(e) => {
                      if (openTier === label) {
                        setOpenTier(null)
                        setTierFilter('')
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTierDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width })
                        setOpenTier(label)
                        setTierFilter('')
                        setTimeout(() => tierFilterInputRef.current?.focus(), 0)
                      }
                    }}
                    className={cn(
                      "flex h-9 w-full items-center justify-between rounded-md px-3 text-sm",
                      "bg-foreground-2 shadow-minimal transition-colors",
                      "hover:bg-background focus:outline-none focus:bg-background",
                      isDisabled && "opacity-50 pointer-events-none"
                    )}
                  >
                    <span className="truncate text-foreground">
                      {piModels.find(m => m.id === value)?.name ?? t('common.apiKeyInput.selectModel')}
                    </span>
                    <ChevronDown className="size-3 opacity-50 shrink-0" />
                  </button>
                </div>
              ))}
              {activeTierConfig && tierDropdownPosition && (
                <>
                  <div
                    className="fixed inset-0 z-floating-backdrop"
                    onClick={() => { setOpenTier(null); setTierFilter('') }}
                  />
                  <div
                    className="fixed z-floating-menu min-w-[200px] overflow-hidden rounded-[8px] bg-background text-foreground shadow-modal-small"
                    style={{
                      top: tierDropdownPosition.top,
                      left: tierDropdownPosition.left,
                      width: tierDropdownPosition.width,
                    }}
                  >
                    <CommandPrimitive
                      className="min-w-[200px]"
                      shouldFilter={false}
                    >
                      <div className="border-b border-border/50 px-3 py-2">
                        <CommandPrimitive.Input
                          ref={tierFilterInputRef}
                          value={tierFilter}
                          onValueChange={setTierFilter}
                          placeholder={t('common.apiKeyInput.searchModels')}
                          autoFocus
                          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground placeholder:select-none"
                        />
                      </div>
                      <CommandPrimitive.List className="max-h-[240px] overflow-y-auto p-1">
                        {piModels
                          .filter(m => m.name.toLowerCase().includes(tierFilter.toLowerCase()))
                          .map((model) => (
                            <CommandPrimitive.Item
                              key={model.id}
                              value={model.id}
                              onSelect={() => {
                                activeTierConfig.onChange(model.id)
                                setOpenTier(null)
                                setTierFilter('')
                              }}
                              className={cn(
                                "flex cursor-pointer select-none items-center justify-between gap-3 rounded-[6px] px-3 py-2 text-[13px]",
                                "outline-none data-[selected=true]:bg-foreground/5"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="truncate">{model.name}</span>
                                {model.reasoning && (
                                  <span className="text-[10px] text-foreground/30 shrink-0">{t('common.apiKeyInput.reasoning')}</span>
                                )}
                              </div>
                              <Check className={cn("size-3 shrink-0", activeTierConfig.value === model.id ? "opacity-100" : "opacity-0")} />
                            </CommandPrimitive.Item>
                          ))}
                      </CommandPrimitive.List>
                    </CommandPrimitive>
                  </div>
                </>
              )}
              {modelError && (
                <p className="text-xs text-destructive">{modelError}</p>
              )}
            </>
          )}
        </div>
      ) : !isDefaultProviderPreset && (
        <div className="space-y-2">
          <Label htmlFor="connection-default-model" className="text-muted-foreground font-normal">
            {t('common.apiKeyInput.defaultModel')}{' '}
            <span className="text-foreground/30">
              · {baseUrl.trim() ? t('common.apiKeyInput.required') : t('common.apiKeyInput.optional')}
            </span>
          </Label>
          <div className={cn(
            "rounded-md shadow-minimal transition-colors",
            "bg-foreground-2 focus-within:bg-background",
            modelError && "ring-1 ring-destructive/40"
          )}>
            <Input
              id="connection-default-model"
              type="text"
              value={connectionDefaultModel}
              onChange={(e) => {
                setConnectionDefaultModel(e.target.value)
                setModelError(null)
              }}
              placeholder={modelPlaceholder || t('common.apiKeyInput.modelPlaceholder')}
              className="border-0 bg-transparent shadow-none"
              disabled={isDisabled}
            />
          </div>
          {modelError && (
            <p className="text-xs text-destructive">{modelError}</p>
          )}
          <p className="text-xs text-foreground/30">
            {t('common.apiKeyInput.modelListHint')}
          </p>
          {(activePreset === 'custom' || !activePreset) && (
            <p className="text-xs text-foreground/30">
              {t('common.apiKeyInput.customEndpointHint')}
            </p>
          )}
        </div>
      )}

      {/* Error message */}
      {status === 'error' && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </form>
  )
}
