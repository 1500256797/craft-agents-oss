import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, FolderPlus, Loader2, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import type {
  DocumentIndexItem,
  KnowledgeBaseItem,
  KnowledgeBaseStatus,
} from '../../../shared/types'

interface KnowledgeBaseFormState {
  name: string
  description: string
  category: string
  status: KnowledgeBaseStatus
}

function defaultKnowledgeBaseForm(): KnowledgeBaseFormState {
  return {
    name: '',
    description: '',
    category: '',
    status: 1,
  }
}

function getStatusLabel(status: KnowledgeBaseStatus): string {
  return status === 1 ? 'Enabled' : 'Disabled'
}

function getDocumentStatusLabel(status: number): string {
  if (status === 2) return 'Indexed'
  if (status === 1) return 'Processing'
  if (status === 3) return 'Failed'
  return 'Queued'
}

function formatBytes(value?: number | string): string {
  const numericValue = typeof value === 'string' ? Number(value) : value
  if (!numericValue || !Number.isFinite(numericValue)) return '-'
  if (numericValue <= 0) return '0 B'

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const factor = Math.min(Math.floor(Math.log(numericValue) / Math.log(1024)), sizes.length - 1)
  const amount = numericValue / 1024 ** factor
  return `${parseFloat(amount.toFixed(1))} ${sizes[factor]}`
}

export default function KnowledgeBasePage() {
  const [bases, setBases] = useState<KnowledgeBaseItem[]>([])
  const [documents, setDocuments] = useState<DocumentIndexItem[]>([])
  const [selectedBaseId, setSelectedBaseId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [isLoadingBases, setIsLoadingBases] = useState(true)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingBase, setEditingBase] = useState<KnowledgeBaseItem | null>(null)
  const [deleteBaseTarget, setDeleteBaseTarget] = useState<KnowledgeBaseItem | null>(null)
  const [deleteDocumentTarget, setDeleteDocumentTarget] = useState<DocumentIndexItem | null>(null)
  const [formState, setFormState] = useState<KnowledgeBaseFormState>(defaultKnowledgeBaseForm())
  const [submitting, setSubmitting] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const pollingTimerRef = useRef<number | null>(null)

  const selectedBase = useMemo(() => {
    return bases.find(base => base.id === selectedBaseId) ?? null
  }, [bases, selectedBaseId])

  const filteredDocuments = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return documents
    return documents.filter(document => document.file_name.toLowerCase().includes(keyword))
  }, [documents, search])

  const clearPolling = useCallback(() => {
    if (pollingTimerRef.current !== null) {
      window.clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }, [])

  const loadBases = useCallback(async () => {
    setIsLoadingBases(true)
    setError(null)
    try {
      const result = await window.electronAPI.listKnowledgeBases({ current: 1, pageSize: 100 })
      setBases(result.data)
      setSelectedBaseId((current) => {
        if (current && result.data.some(base => base.id === current)) return current
        return result.data[0]?.id ?? null
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load knowledge bases')
    } finally {
      setIsLoadingBases(false)
    }
  }, [])

  const loadDocuments = useCallback(async (knowledgeBaseName: string) => {
    setIsLoadingDocuments(true)
    setError(null)
    try {
      const result = await window.electronAPI.listKnowledgeDocuments(knowledgeBaseName)
      setDocuments(result.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load documents')
    } finally {
      setIsLoadingDocuments(false)
    }
  }, [])

  useEffect(() => {
    void loadBases()
    return () => clearPolling()
  }, [clearPolling, loadBases])

  useEffect(() => {
    if (!selectedBase?.name) {
      setDocuments([])
      return
    }
    void loadDocuments(selectedBase.name)
  }, [loadDocuments, selectedBase?.name])

  useEffect(() => {
    if (!activeTaskId || !selectedBase?.name) return

    pollingTimerRef.current = window.setInterval(() => {
      void window.electronAPI.getKnowledgeTaskStatus(activeTaskId).then((task) => {
        if (task.status === 'completed' || task.status === 'failed') {
          clearPolling()
          setActiveTaskId(null)
          setIsUploading(false)
          void loadDocuments(selectedBase.name)
          void loadBases()
        }
      }).catch((taskError) => {
        console.error('[KnowledgeBase] task polling failed', taskError)
        clearPolling()
        setActiveTaskId(null)
        setIsUploading(false)
      })
    }, 1500)

    return clearPolling
  }, [activeTaskId, clearPolling, loadBases, loadDocuments, selectedBase?.name])

  const openCreateDialog = useCallback(() => {
    setEditingBase(null)
    setFormState(defaultKnowledgeBaseForm())
    setFormOpen(true)
  }, [])

  const openEditDialog = useCallback((knowledgeBase: KnowledgeBaseItem) => {
    setEditingBase(knowledgeBase)
    setFormState({
      name: knowledgeBase.name,
      description: knowledgeBase.description || '',
      category: knowledgeBase.category || '',
      status: knowledgeBase.status,
    })
    setFormOpen(true)
  }, [])

  const handleSaveKnowledgeBase = useCallback(async () => {
    setSubmitting(true)
    setError(null)
    try {
      if (editingBase) {
        await window.electronAPI.updateKnowledgeBase(editingBase.id, {
          name: formState.name.trim(),
          description: formState.description.trim(),
          category: formState.category.trim() || undefined,
          status: formState.status,
        })
      } else {
        await window.electronAPI.createKnowledgeBase({
          name: formState.name.trim(),
          description: formState.description.trim(),
          category: formState.category.trim() || undefined,
        })
      }
      setFormOpen(false)
      setEditingBase(null)
      setFormState(defaultKnowledgeBaseForm())
      await loadBases()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save knowledge base')
    } finally {
      setSubmitting(false)
    }
  }, [editingBase, formState, loadBases])

  const handleDeleteKnowledgeBase = useCallback(async () => {
    if (!deleteBaseTarget) return
    setSubmitting(true)
    setError(null)
    try {
      await window.electronAPI.deleteKnowledgeBase(deleteBaseTarget.id)
      setDeleteBaseTarget(null)
      await loadBases()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete knowledge base')
    } finally {
      setSubmitting(false)
    }
  }, [deleteBaseTarget, loadBases])

  const handleDeleteDocument = useCallback(async () => {
    if (!deleteDocumentTarget || !selectedBase?.name) return
    setSubmitting(true)
    setError(null)
    try {
      await window.electronAPI.deleteKnowledgeDocument(deleteDocumentTarget.id)
      setDeleteDocumentTarget(null)
      await loadDocuments(selectedBase.name)
      await loadBases()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete document')
    } finally {
      setSubmitting(false)
    }
  }, [deleteDocumentTarget, loadBases, loadDocuments, selectedBase?.name])

  const handleUpload = useCallback(async () => {
    if (!selectedBase?.name) return
    setError(null)
    const paths = await window.electronAPI.openFileDialog()
    if (!paths.length) return

    setIsUploading(true)
    try {
      const result = await window.electronAPI.uploadKnowledgeDocument(selectedBase.name, paths[0])
      setActiveTaskId(result.task_id)
    } catch (uploadError) {
      setIsUploading(false)
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload document')
    }
  }, [selectedBase?.name])

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Knowledge Base"
        actions={<HeaderMenu route={routes.view.module('knowledge-base')} />}
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-[14px] border border-foreground/10 bg-background p-4 shadow-minimal">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Folders</h2>
                <p className="mt-1 text-xs text-muted-foreground">Knowledge containers aligned with the Web product, expressed in Client UI.</p>
              </div>
              <Button size="sm" onClick={openCreateDialog}>
                <FolderPlus className="size-4" />
                Add
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {isLoadingBases ? (
                <div className="rounded-[10px] border border-foreground/10 px-3 py-6 text-sm text-muted-foreground">
                  Loading folders...
                </div>
              ) : bases.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-foreground/15 px-3 py-6 text-sm text-muted-foreground">
                  No knowledge bases configured yet.
                </div>
              ) : (
                bases.map(base => (
                  <button
                    key={base.id}
                    type="button"
                    onClick={() => setSelectedBaseId(base.id)}
                    className={`w-full rounded-[12px] border px-3 py-3 text-left transition-colors ${
                      selectedBaseId === base.id
                        ? 'border-accent/30 bg-accent/5'
                        : 'border-foreground/10 hover:bg-foreground/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{base.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{base.description || 'No description'}</p>
                      </div>
                      <Badge className={base.status === 1 ? 'bg-success/10 text-success border-success/20' : 'bg-foreground/5 text-muted-foreground border-foreground/10'}>
                        {getStatusLabel(base.status)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{base.documents_count ?? 0} docs</span>
                      <span>{base.updated_at || '-'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-foreground/10 bg-background p-4 shadow-minimal">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{selectedBase?.name || 'Documents'}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedBase?.description || 'Select a folder to inspect indexed files and upload new documents.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-[220px]">
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files" />
                </div>
                <Button variant="secondary" size="sm" onClick={() => selectedBase && openEditDialog(selectedBase)} disabled={!selectedBase}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setDeleteBaseTarget(selectedBase)} disabled={!selectedBase}>
                  <Trash2 className="size-4" />
                  Delete
                </Button>
                <Button size="sm" onClick={() => void handleUpload()} disabled={!selectedBase || isUploading}>
                  {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Upload
                </Button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-[12px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {!selectedBase ? (
                <div className="rounded-[12px] border border-dashed border-foreground/15 px-4 py-8 text-sm text-muted-foreground">
                  Select a knowledge base folder to inspect its documents.
                </div>
              ) : isLoadingDocuments ? (
                <div className="rounded-[12px] border border-foreground/10 px-4 py-8 text-sm text-muted-foreground">
                  Loading documents...
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-foreground/15 px-4 py-8 text-sm text-muted-foreground">
                  No documents found in this folder.
                </div>
              ) : (
                filteredDocuments.map(document => (
                  <div key={document.id} className="flex flex-col gap-3 rounded-[12px] border border-foreground/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <p className="truncate text-sm font-medium text-foreground">{document.file_name}</p>
                        <Badge variant="secondary">{getDocumentStatusLabel(document.status)}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatBytes(document.file_size ?? document.size ?? document.bytes)}</span>
                        <span>{document.chunks_count ?? 0} chunks</span>
                        <span>{document.updated_at || document.created_at || '-'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setDeleteDocumentTarget(document)}>
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => selectedBase?.name && void loadDocuments(selectedBase.name)} disabled={!selectedBase || isLoadingDocuments}>
                <RefreshCw className={`size-4 ${isLoadingDocuments ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBase ? 'Edit Knowledge Base' : 'Create Knowledge Base'}</DialogTitle>
            <DialogDescription>
              Use Client-native controls to manage the same knowledge-base capabilities available on Web.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} placeholder="project-docs" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formState.description} onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))} placeholder="What this folder is used for" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={formState.category} onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))} placeholder="engineering" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={String(formState.status)} onValueChange={(value) => setFormState((prev) => ({ ...prev, status: Number(value) as KnowledgeBaseStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Enabled</SelectItem>
                    <SelectItem value="2">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveKnowledgeBase()} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteBaseTarget} onOpenChange={(open) => { if (!open) setDeleteBaseTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Knowledge Base</DialogTitle>
            <DialogDescription>
              {deleteBaseTarget ? `Delete ${deleteBaseTarget.name}? This also removes its document index references.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteBaseTarget(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteKnowledgeBase()} disabled={submitting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDocumentTarget} onOpenChange={(open) => { if (!open) setDeleteDocumentTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              {deleteDocumentTarget ? `Delete ${deleteDocumentTarget.file_name} from the knowledge base index?` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteDocumentTarget(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteDocument()} disabled={submitting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
