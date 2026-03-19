/**
 * VideoPreviewOverlay - In-app video preview using object URLs from file bytes.
 */

import { useState, useEffect, useMemo } from 'react'
import { Film } from 'lucide-react'
import { PreviewOverlay } from './PreviewOverlay'
import { CopyButton } from './CopyButton'
import { ItemNavigator } from './ItemNavigator'
import { getVideoMimeType } from '../../lib/video'

interface PreviewItem {
  src: string
  label?: string
}

export interface VideoPreviewOverlayProps {
  isOpen: boolean
  onClose: () => void
  filePath: string
  items?: PreviewItem[]
  initialIndex?: number
  title?: string
  loadVideoData: (path: string) => Promise<Uint8Array>
  theme?: 'light' | 'dark'
}

export function VideoPreviewOverlay({
  isOpen,
  onClose,
  filePath,
  items,
  initialIndex = 0,
  title,
  loadVideoData,
  theme = 'light',
}: VideoPreviewOverlayProps) {
  const resolvedItems = useMemo<PreviewItem[]>(() => {
    if (items && items.length > 0) return items
    return [{ src: filePath }]
  }, [items, filePath])

  const [activeIdx, setActiveIdx] = useState(initialIndex)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const activeItem = resolvedItems[activeIdx]

  useEffect(() => {
    if (isOpen) {
      const bounded = Math.max(0, Math.min(initialIndex, resolvedItems.length - 1))
      setActiveIdx(bounded)
    }
  }, [isOpen, initialIndex, resolvedItems.length])

  useEffect(() => {
    if (!isOpen || !activeItem?.src) return

    let cancelled = false
    let objectUrl: string | null = null
    setIsLoading(true)
    setError(null)
    setVideoUrl(null)

    loadVideoData(activeItem.src)
      .then((data) => {
        if (cancelled) return
        const bytes = new Uint8Array(data)
        const blob = new Blob([bytes.buffer], { type: getVideoMimeType(activeItem.src) })
        objectUrl = URL.createObjectURL(blob)
        setVideoUrl(objectUrl)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load video')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isOpen, activeItem?.src, loadVideoData])

  const headerActions = (
    <div className="flex items-center gap-2">
      <ItemNavigator items={resolvedItems} activeIndex={activeIdx} onSelect={setActiveIdx} size="md" />
      <CopyButton content={activeItem?.src || filePath} title="Copy path" className="bg-background shadow-minimal" />
    </div>
  )

  return (
    <PreviewOverlay
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      typeBadge={{
        icon: Film,
        label: 'Video',
        variant: 'purple',
      }}
      filePath={activeItem?.src || filePath}
      title={title}
      error={error ? { label: 'Load Failed', message: error } : undefined}
      headerActions={headerActions}
    >
      <div className="min-h-full flex items-center justify-center p-4">
        {isLoading && !videoUrl && (
          <div className="text-muted-foreground text-sm">Loading video...</div>
        )}
        {videoUrl && (
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="max-h-full max-w-full rounded-[8px] bg-black shadow-minimal"
          />
        )}
      </div>
    </PreviewOverlay>
  )
}
