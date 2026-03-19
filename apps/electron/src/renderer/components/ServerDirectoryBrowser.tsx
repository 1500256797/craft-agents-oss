import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRegisterModal } from '@/context/ModalContext'
import type { DirectoryListingResult } from '../../shared/types'
import { FolderIcon, FolderSymlinkIcon, ChevronRightIcon } from 'lucide-react'
import { Spinner } from '@zhangyuge-agent/ui'

function isWrongPlatformPath(path: string, serverHomePath: string | null): boolean {
  if (!serverHomePath) return false
  const serverIsUnix = serverHomePath.startsWith('/')
  if (serverIsUnix) {
    return /^[A-Za-z]:[/\\]/.test(path) || path.startsWith('\\\\')
  }
  return path.startsWith('/')
}

interface ServerDirectoryBrowserProps {
  open: boolean
  mode: 'browse' | 'manual'
  onSelect: (path: string) => void
  onCancel: () => void
  initialPath?: string
}

export function ServerDirectoryBrowser({
  open,
  mode,
  onSelect,
  onCancel,
  initialPath,
}: ServerDirectoryBrowserProps) {
  useRegisterModal(open, onCancel)

  const [listing, setListing] = useState<DirectoryListingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pathInput, setPathInput] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null)
  const [serverHomePath, setServerHomePath] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const navigateTo = useCallback(async (dirPath: string) => {
    setLoading(true)
    setError(null)
    setSelectedEntry(null)
    try {
      const result = await window.electronAPI.listServerDirectory(dirPath)
      setListing(result)
      setPathInput(result.currentPath)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list directory'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setListing(null)
      setError(null)
      setSelectedEntry(null)
      setPathInput('')
      setServerHomePath(null)
      return
    }

    const init = async () => {
      const homeDir = await window.electronAPI.getHomeDir()
      setServerHomePath(homeDir)

      if (mode === 'browse') {
        const useInitial = initialPath && !isWrongPlatformPath(initialPath, homeDir)
        void navigateTo(useInitial ? initialPath : homeDir)
      }
    }

    void init()
  }, [open, mode, initialPath, navigateTo])

  const handlePathSubmit = useCallback(() => {
    const trimmed = pathInput.trim()
    if (!trimmed) return

    if (isWrongPlatformPath(trimmed, serverHomePath)) {
      setError('This looks like a path from a different OS. Enter a path that exists on the server.')
      return
    }

    if (mode === 'browse') {
      void navigateTo(trimmed)
    } else {
      onSelect(trimmed)
    }
  }, [pathInput, serverHomePath, mode, navigateTo, onSelect])

  const handleSelect = useCallback(() => {
    if (mode === 'manual') {
      handlePathSubmit()
      return
    }

    if (selectedEntry) {
      onSelect(selectedEntry)
    } else if (listing) {
      onSelect(listing.currentPath)
    } else if (pathInput.trim()) {
      onSelect(pathInput.trim())
    }
  }, [mode, handlePathSubmit, selectedEntry, listing, pathInput, onSelect])

  const handleEntryDoubleClick = useCallback((entryPath: string) => {
    void navigateTo(entryPath)
  }, [navigateTo])

  const handleEntryClick = useCallback((entryPath: string) => {
    setSelectedEntry(prev => prev === entryPath ? null : entryPath)
  }, [])

  const renderBrowseMode = () => (
    <>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={pathInput}
          onChange={e => setPathInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handlePathSubmit()
          }}
          placeholder="Enter path..."
          className="flex-1 font-mono text-xs"
        />
        <Button variant="outline" size="sm" onClick={handlePathSubmit} disabled={loading}>
          Go
        </Button>
      </div>

      {listing && (
        <div className="flex items-center gap-0.5 text-xs text-muted-foreground overflow-x-auto py-1 min-h-[24px]">
          {listing.breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-0.5 shrink-0">
              {i > 0 && <ChevronRightIcon className="size-3 text-muted-foreground/50" />}
              <button
                type="button"
                onClick={() => navigateTo(crumb.path)}
                className="hover:text-foreground hover:underline transition-colors px-0.5"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="border border-foreground/10 rounded-md overflow-hidden flex-1 min-h-0">
        <div className="overflow-y-auto max-h-[300px]">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Spinner className="text-sm" />
              Loading...
            </div>
          )}

          {error && (
            <div className="px-3 py-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && listing?.truncated && (
            <div className="border-b border-foreground/10 px-3 py-2 text-xs text-muted-foreground">
              Showing the first {listing.entries.length} folders out of {listing.totalEntries}. Narrow the path if the folder you want is missing.
            </div>
          )}

          {!loading && !error && listing && listing.entries.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No subdirectories. Use the path input above to navigate.
            </div>
          )}

          {!loading && !error && listing && listing.entries.map(entry => (
            <button
              key={entry.path}
              type="button"
              onClick={() => handleEntryClick(entry.path)}
              onDoubleClick={() => handleEntryDoubleClick(entry.path)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors hover:bg-foreground/5 ${
                selectedEntry === entry.path ? 'bg-foreground/5' : ''
              }`}
            >
              {entry.isSymlink
                ? <FolderSymlinkIcon className="size-4 shrink-0 text-muted-foreground" />
                : <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
              }
              <span className="truncate">{entry.name}</span>
              {entry.isSymlink && (
                <span className="text-xs text-muted-foreground/60 shrink-0">symlink</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )

  const renderManualMode = () => (
    <>
      <p className="text-sm text-muted-foreground">
        Enter the full path on the server:
      </p>
      <Input
        ref={inputRef}
        value={pathInput}
        onChange={e => setPathInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSelect()
        }}
        placeholder="/Users/username/projects/my-project"
        className="font-mono text-xs"
        autoFocus
      />
    </>
  )

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Server Directory</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {mode === 'browse' ? renderBrowseMode() : renderManualMode()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSelect} disabled={loading || (!listing && !pathInput.trim())}>
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
