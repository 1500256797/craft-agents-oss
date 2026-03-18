import { cn } from "@/lib/utils"
import { Key, Monitor } from "lucide-react"
import { ZhangyugeAgentSymbol } from "@/components/icons/ZhangyugeAgentSymbol"
import { StepFormLayout } from "./primitives"
import { useI18n } from "@/context/I18nContext"

import claudeIcon from "@/assets/provider-icons/claude.svg"
import openaiIcon from "@/assets/provider-icons/openai.svg"
import copilotIcon from "@/assets/provider-icons/copilot.svg"

/**
 * The high-level provider choice the user makes on first launch.
 * This maps to one or more ApiSetupMethods downstream.
 */
export type ProviderChoice = 'claude' | 'chatgpt' | 'copilot' | 'api_key' | 'local'

interface ProviderOption {
  id: ProviderChoice
  name: string
  description: string
  icon: React.ReactNode
}

interface ProviderSelectStepProps {
  /** Called when the user selects a provider */
  onSelect: (choice: ProviderChoice) => void
}

/**
 * ProviderSelectStep — First screen after install.
 *
 * Welcomes the user and asks them to pick their subscription / auth method.
 * Selecting a card immediately advances to the next step.
 */
export function ProviderSelectStep({ onSelect }: ProviderSelectStepProps) {
  const { t } = useI18n()
  const providerOptions: ProviderOption[] = [
    {
      id: 'claude',
      name: t('onboarding.providerSelect.claudeName'),
      description: t('onboarding.providerSelect.claudeDescription'),
      icon: <img src={claudeIcon} alt="" className="size-5 rounded-[3px]" />,
    },
    {
      id: 'chatgpt',
      name: t('onboarding.providerSelect.chatgptName'),
      description: t('onboarding.providerSelect.chatgptDescription'),
      icon: <img src={openaiIcon} alt="" className="size-5 rounded-[3px]" />,
    },
    {
      id: 'copilot',
      name: t('onboarding.providerSelect.copilotName'),
      description: t('onboarding.providerSelect.copilotDescription'),
      icon: <img src={copilotIcon} alt="" className="size-5 rounded-[3px]" />,
    },
    {
      id: 'api_key',
      name: t('onboarding.providerSelect.apiKeyName'),
      description: t('onboarding.providerSelect.apiKeyDescription'),
      icon: <Key className="size-5" />,
    },
    {
      id: 'local',
      name: t('onboarding.providerSelect.localName'),
      description: t('onboarding.providerSelect.localDescription'),
      icon: <Monitor className="size-5" />,
    },
  ]

  return (
    <StepFormLayout
      iconElement={
        <div className="flex size-16 items-center justify-center">
          <ZhangyugeAgentSymbol className="size-10 text-accent" />
        </div>
      }
      title={t('onboarding.providerSelect.title')}
      description={t('onboarding.providerSelect.description')}
    >
      <div className="space-y-3">
        {providerOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex w-full items-start gap-4 rounded-xl bg-foreground-2 p-4 text-left transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "hover:bg-foreground/[0.02] shadow-minimal",
            )}
          >
            {/* Icon */}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {option.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm">{option.name}</span>
              <p className="mt-0 text-xs text-muted-foreground">
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </StepFormLayout>
  )
}
