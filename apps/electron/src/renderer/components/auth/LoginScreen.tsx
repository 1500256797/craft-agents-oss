import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react'
import { StepFormLayout } from '@/components/onboarding/primitives'
import { 章鱼哥AIAppIcon } from '@/components/icons/ZhangyugeAgentAppIcon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/context/I18nContext'

interface LoginScreenProps {
  onLoginSuccess: () => Promise<void>
  onReset: () => void
}

export function LoginScreen({ onLoginSuccess, onReset }: LoginScreenProps) {
  const { t } = useI18n()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSubmitDisabled = useMemo(() => {
    return isSubmitting
      || isLoadingCaptcha
      || !username.trim()
      || !password
      || !captchaId
      || !captchaCode.trim()
  }, [captchaCode, captchaId, isLoadingCaptcha, isSubmitting, password, username])

  const loadCaptcha = useCallback(async (reload = false) => {
    setIsLoadingCaptcha(true)
    try {
      const nextCaptchaId = reload || !captchaId
        ? await window.electronAPI.getCaptchaId()
        : captchaId
      const image = await window.electronAPI.getCaptchaImage(nextCaptchaId, reload)
      setCaptchaId(nextCaptchaId)
      setCaptchaImage(image)
      setCaptchaCode('')
    } catch (captchaError) {
      setError(captchaError instanceof Error ? captchaError.message : t('auth.login.failedLoadCaptcha'))
    } finally {
      setIsLoadingCaptcha(false)
    }
  }, [captchaId, t])

  useEffect(() => {
    void loadCaptcha(false)
  }, [loadCaptcha])

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await window.electronAPI.login({
        username: username.trim(),
        password,
        captchaId,
        captchaCode: captchaCode.trim(),
      })

      if (!result.success) {
        setError(result.error || t('auth.login.loginFailed'))
        await loadCaptcha(true)
        return
      }

      await onLoginSuccess()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : t('auth.login.loginFailed'))
      await loadCaptcha(true)
    } finally {
      setIsSubmitting(false)
    }
  }, [captchaCode, captchaId, loadCaptcha, onLoginSuccess, password, t, username])

  return (
    <div className="flex min-h-screen flex-col bg-foreground-2">
      <div className="titlebar-drag-region fixed top-0 left-0 right-0 h-[50px] z-titlebar" />

      <main className="flex flex-1 items-center justify-center p-8">
        <StepFormLayout
          iconElement={
            <div className="mb-1 flex items-center justify-center">
              <章鱼哥AIAppIcon size={72} className="size-[72px]" />
            </div>
          }
          title={t('auth.login.title')}
          description={t('auth.login.description')}
          actions={
            <div className="flex flex-col gap-3 w-full">
              <Button
                type="submit"
                form="desktop-login-form"
                disabled={isSubmitDisabled}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {t('auth.login.signingIn')}
                  </>
                ) : (
                  t('auth.login.signIn')
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onReset}
                disabled={isSubmitting}
                className="w-full"
              >
                {t('auth.login.resetApp')}
              </Button>
            </div>
          }
        >
          <form id="desktop-login-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="desktop-login-username">{t('auth.login.username')}</Label>
              <Input
                id="desktop-login-username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t('auth.login.usernamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desktop-login-password">{t('auth.login.password')}</Label>
              <div className="relative">
                <Input
                  id="desktop-login-password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="desktop-login-captcha">{t('auth.login.captcha')}</Label>
                <button
                  type="button"
                  onClick={() => void loadCaptcha(true)}
                  disabled={isLoadingCaptcha || isSubmitting}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={`size-3 ${isLoadingCaptcha ? 'animate-spin' : ''}`} />
                  {t('auth.login.refreshCaptcha')}
                </button>
              </div>
              <div className="grid grid-cols-[1fr_112px] gap-3">
                <Input
                  id="desktop-login-captcha"
                  autoComplete="off"
                  value={captchaCode}
                  onChange={(event) => setCaptchaCode(event.target.value)}
                  placeholder={t('auth.login.captchaPlaceholder')}
                />
                <div className="flex h-9 items-center justify-center overflow-hidden rounded-md border border-foreground/15 bg-background">
                  {captchaImage ? (
                    <img src={captchaImage} alt="Captcha" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {isLoadingCaptcha ? t('auth.login.loadingCaptcha') : t('auth.login.unavailableCaptcha')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </StepFormLayout>
      </main>
    </div>
  )
}
