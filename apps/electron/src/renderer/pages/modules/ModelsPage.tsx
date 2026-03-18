import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Edit2, Plus, Power, ShieldOff, Trash2 } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SettingsPageFrame } from '@/components/settings'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { routes } from '@/lib/navigate'
import { useI18n } from '@/context/I18nContext'
import type {
  CreateModelProviderForm,
  ModelProviderItem,
  ProviderModelItem,
  ProviderStatus,
} from '../../../shared/types'

interface ProviderFormState {
  providerKey: string
  displayName: string
  baseUrl: string
  apiKey: string
  modelLines: string
  priority: string
  remark: string
  status: ProviderStatus
}

const PROVIDER_STATUS_BADGE_CLASS: Record<ProviderStatus, string> = {
  1: 'bg-success/10 text-success border-success/20',
  2: 'bg-warning/10 text-warning border-warning/20',
  3: 'bg-destructive/10 text-destructive border-destructive/20',
}

function defaultFormState(): ProviderFormState {
  return {
    providerKey: '',
    displayName: '',
    baseUrl: '',
    apiKey: '',
    modelLines: '',
    priority: '100',
    remark: '',
    status: 1,
  }
}

function serializeModels(models: ProviderModelItem[]): string {
  return models.map(model => model.name).join('\n')
}

function buildModels(lines: string, previousModels: ProviderModelItem[] = []): ProviderModelItem[] {
  const previousByName = new Map(previousModels.map(model => [model.name.trim(), model]))
  return lines
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((name, index) => {
      const previous = previousByName.get(name)
      return {
        name,
        status: previous?.status ?? 1,
        priority: previous?.priority ?? (index + 1) * 10,
        remark: previous?.remark ?? '',
      }
    })
}

function buildCreatePayload(form: ProviderFormState): CreateModelProviderForm {
  return {
    provider_key: form.providerKey.trim(),
    display_name: form.displayName.trim() || form.providerKey.trim(),
    base_url: form.baseUrl.trim(),
    api_key: form.apiKey.trim(),
    models: buildModels(form.modelLines),
    priority: Number(form.priority) || 100,
    remark: form.remark.trim() || undefined,
    status: form.status,
  }
}

interface ModelsPageProps {
  headerRoute?: string
  layout?: 'module' | 'settings'
}

export default function ModelsPage({
  headerRoute = routes.view.module('models'),
  layout = 'module',
}: ModelsPageProps) {
  const { t } = useI18n()
  const [providers, setProviders] = useState<ModelProviderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ModelProviderItem | null>(null)
  const [editingProvider, setEditingProvider] = useState<ModelProviderItem | null>(null)
  const [formState, setFormState] = useState<ProviderFormState>(defaultFormState())
  const [submitting, setSubmitting] = useState(false)

  const loadProviders = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.listModelProviders()
      setProviders(result.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load model providers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProviders()
  }, [loadProviders])

  const filteredProviders = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return providers
    return providers.filter(provider =>
      provider.display_name.toLowerCase().includes(keyword)
      || provider.provider_key.toLowerCase().includes(keyword)
      || provider.base_url.toLowerCase().includes(keyword)
      || provider.models.some(model => model.name.toLowerCase().includes(keyword))
    )
  }, [providers, search])

  const openCreateDialog = useCallback(() => {
    setEditingProvider(null)
    setFormState(defaultFormState())
    setFormOpen(true)
  }, [])

  const openEditDialog = useCallback((provider: ModelProviderItem) => {
    setEditingProvider(provider)
    setFormState({
      providerKey: provider.provider_key,
      displayName: provider.display_name,
      baseUrl: provider.base_url,
      apiKey: '',
      modelLines: serializeModels(provider.models),
      priority: String(provider.priority || 100),
      remark: provider.remark || '',
      status: provider.status,
    })
    setFormOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    setSubmitting(true)
    setError(null)
    try {
      if (editingProvider) {
        await window.electronAPI.updateModelProvider(editingProvider.id, {
          display_name: formState.displayName.trim() || formState.providerKey.trim(),
          base_url: formState.baseUrl.trim(),
          api_key: formState.apiKey.trim() || undefined,
          models: buildModels(formState.modelLines, editingProvider.models),
          priority: Number(formState.priority) || 100,
          remark: formState.remark.trim() || undefined,
          status: formState.status,
        })
      } else {
        await window.electronAPI.createModelProvider(buildCreatePayload(formState))
      }

      setFormOpen(false)
      setEditingProvider(null)
      setFormState(defaultFormState())
      await loadProviders()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save model provider')
    } finally {
      setSubmitting(false)
    }
  }, [editingProvider, formState, loadProviders])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    setError(null)
    try {
      await window.electronAPI.deleteModelProvider(deleteTarget.id)
      setDeleteTarget(null)
      await loadProviders()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete model provider')
    } finally {
      setSubmitting(false)
    }
  }, [deleteTarget, loadProviders])

  const handleToggleStatus = useCallback(async (provider: ModelProviderItem) => {
    const nextStatus: ProviderStatus = provider.status === 1 ? 2 : 1
    try {
      await window.electronAPI.updateModelProviderStatus(provider.id, nextStatus)
      await loadProviders()
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update provider status')
    }
  }, [loadProviders])

  const pageContent = (
    <>
      <div className="flex flex-col gap-3 rounded-[14px] border border-foreground/10 bg-background px-5 py-4 shadow-minimal sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t('settings.models.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('settings.models.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[240px]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('settings.models.searchPlaceholder')} />
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            {t('settings.models.addProvider')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-[12px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-[14px] border border-foreground/10 bg-background px-5 py-8 text-sm text-muted-foreground shadow-minimal">
          {t('settings.models.loading')}
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-foreground/15 bg-foreground/[0.02] px-5 py-8 text-sm text-muted-foreground">
          {t('settings.models.empty')}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProviders.map(provider => (
            <div key={provider.id} className="rounded-[14px] border border-foreground/10 bg-background px-5 py-5 shadow-minimal">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{provider.display_name}</h3>
                    <Badge className={PROVIDER_STATUS_BADGE_CLASS[provider.status]}>
                      {provider.status === 1
                        ? t('settings.models.statusEnabled')
                        : provider.status === 2
                          ? t('settings.models.statusOff')
                          : t('settings.models.statusDisabled')}
                    </Badge>
                    <Badge variant="secondary">{provider.provider_key}</Badge>
                  </div>
                  <p className="mt-2 break-all text-sm text-muted-foreground">{provider.base_url}</p>
                  {provider.remark && (
                    <p className="mt-2 text-sm text-muted-foreground/80">{provider.remark}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleToggleStatus(provider)}>
                    {provider.status === 1 ? <ShieldOff className="size-4" /> : <Power className="size-4" />}
                    {provider.status === 1 ? t('settings.models.turnOff') : t('settings.models.enable')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openEditDialog(provider)}>
                    <Edit2 className="size-4" />
                    {t('settings.models.edit')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(provider)}>
                    <Trash2 className="size-4" />
                    {t('settings.models.delete')}
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {provider.models.map(model => (
                  <Badge key={`${provider.id}:${model.name}`} variant="secondary">
                    {model.name}
                  </Badge>
                ))}
              </div>

              <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <span>{t('settings.models.priority', { value: provider.priority })}</span>
                <span>{t('settings.models.created', { value: provider.created_at || '-' })}</span>
                <span>{t('settings.models.updated', { value: provider.updated_at || '-' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title={t('settings.pages.models.title')}
        actions={<HeaderMenu route={headerRoute} />}
      />

      {layout === 'settings' ? (
        <SettingsPageFrame contentClassName="space-y-4">
          {pageContent}
        </SettingsPageFrame>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            {pageContent}
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProvider ? t('settings.models.dialog.editTitle') : t('settings.models.dialog.addTitle')}</DialogTitle>
            <DialogDescription>
              {t('settings.models.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('settings.models.dialog.providerKey')}</Label>
                <Input
                  value={formState.providerKey}
                  disabled={!!editingProvider}
                  onChange={(event) => setFormState((prev) => ({ ...prev, providerKey: event.target.value }))}
                  placeholder="openai"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.models.dialog.displayName')}</Label>
                <Input
                  value={formState.displayName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, displayName: event.target.value }))}
                  placeholder="OpenAI"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('settings.models.dialog.baseUrl')}</Label>
              <Input
                value={formState.baseUrl}
                onChange={(event) => setFormState((prev) => ({ ...prev, baseUrl: event.target.value }))}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div className="space-y-2">
              <Label>{editingProvider ? t('settings.models.dialog.apiKeyKeepCurrent') : t('settings.models.dialog.apiKey')}</Label>
              <Input
                type="password"
                value={formState.apiKey}
                onChange={(event) => setFormState((prev) => ({ ...prev, apiKey: event.target.value }))}
                placeholder="sk-..."
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_160px_160px]">
              <div className="space-y-2">
                <Label>{t('settings.models.dialog.models')}</Label>
                <Textarea
                  value={formState.modelLines}
                  onChange={(event) => setFormState((prev) => ({ ...prev, modelLines: event.target.value }))}
                  placeholder={'gpt-4o\ntext-embedding-3-large'}
                  className="min-h-32"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.models.dialog.status')}</Label>
                <Select
                  value={String(formState.status)}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, status: Number(value) as ProviderStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('settings.models.statusEnabled')}</SelectItem>
                    <SelectItem value="2">{t('settings.models.statusOff')}</SelectItem>
                    <SelectItem value="3">{t('settings.models.statusDisabled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.models.dialog.priority')}</Label>
                <Input
                  value={formState.priority}
                  onChange={(event) => setFormState((prev) => ({ ...prev, priority: event.target.value }))}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('settings.models.dialog.remark')}</Label>
              <Textarea
                value={formState.remark}
                onChange={(event) => setFormState((prev) => ({ ...prev, remark: event.target.value }))}
                placeholder={t('settings.models.dialog.optionalRemark')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={() => void handleSave()} disabled={submitting}>
              <CheckCircle2 className="size-4" />
              {submitting ? t('settings.models.dialog.saving') : t('settings.models.dialog.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.models.dialog.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {deleteTarget ? t('settings.models.dialog.deleteDescription', { name: deleteTarget.display_name }) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={submitting}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={submitting}>
              {t('common.actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
