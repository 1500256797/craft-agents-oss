import { ZhangyugeAgentSymbol } from "@/components/icons/ZhangyugeAgentSymbol"
import { StepFormLayout, ContinueButton } from "./primitives"
import { useI18n } from "@/context/I18nContext"

interface WelcomeStepProps {
  onContinue: () => void
  /** Whether this is an existing user updating settings */
  isExistingUser?: boolean
  /** Whether the app is loading (e.g., checking Git Bash on Windows) */
  isLoading?: boolean
}

/**
 * WelcomeStep - Initial welcome screen for onboarding
 *
 * Shows different messaging for new vs existing users:
 * - New users: Welcome to 章鱼哥AI
 * - Existing users: Update your API connection settings
 */
export function WelcomeStep({
  onContinue,
  isExistingUser = false,
  isLoading = false
}: WelcomeStepProps) {
  const { t } = useI18n()
  return (
    <StepFormLayout
      iconElement={
        <div className="flex size-16 items-center justify-center">
          <ZhangyugeAgentSymbol className="size-10 text-accent" />
        </div>
      }
      title={isExistingUser ? t('onboarding.welcome.titleExisting') : t('onboarding.welcome.titleNew')}
      description={
        isExistingUser
          ? t('onboarding.welcome.descriptionExisting')
          : t('onboarding.welcome.descriptionNew')
      }
      actions={
        <ContinueButton onClick={onContinue} className="w-full" loading={isLoading} loadingText={t('onboarding.welcome.checking')}>
          {isExistingUser ? t('onboarding.common.continue') : t('onboarding.welcome.getStarted')}
        </ContinueButton>
      }
    />
  )
}
