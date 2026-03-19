/**
 * MarkdownVideoBlock - Renders ```video-preview code blocks as inline video previews.
 */

import * as React from 'react'
import { Film, Maximize2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { CodeBlock } from './CodeBlock'
import { ItemNavigator } from '../overlay/ItemNavigator'
import { VideoPreviewOverlay } from '../overlay/VideoPreviewOverlay'
import { usePlatform } from '../../context/PlatformContext'
import { getVideoMimeType } from '../../lib/video'

interface PreviewItem {
  src: string
  label?: string
}

interface VideoPreviewSpec {
  src?: string
  title?: string
  items?: PreviewItem[]
}

class VideoBlockErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error) {
    console.warn('[MarkdownVideoBlock] Render failed, falling back to CodeBlock:', error)
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export interface MarkdownVideoBlockProps {
  code: string
  className?: string
}

export function MarkdownVideoBlock({ code, className }: MarkdownVideoBlockProps) {
  const { onReadFileBinary } = usePlatform()

  const spec = React.useMemo<VideoPreviewSpec | null>(() => {
    try {
      const raw = JSON.parse(code)
      if (raw.items && Array.isArray(raw.items) && raw.items.length > 0) {
        return raw as VideoPreviewSpec
      }
      if (raw.src && typeof raw.src === 'string') {
        return raw as VideoPreviewSpec
      }
      return null
    } catch {
      return null
    }
  }, [code])

  const items = React.useMemo<PreviewItem[]>(() => {
    if (!spec) return []
    if (spec.items && spec.items.length > 0) return spec.items
    if (spec.src) return [{ src: spec.src }]
    return []
  }, [spec])

  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const activeItem = items[activeIndex]
  const hasMultiple = items.length > 1

  React.useEffect(() => {
    if (!activeItem?.src || !onReadFileBinary) return

    let cancelled = false
    let objectUrl: string | null = null
    setLoading(true)
    setError(null)
    setVideoUrl(null)

    onReadFileBinary(activeItem.src)
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
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [activeItem?.src, onReadFileBinary])

  const loadVideoData = React.useCallback(async (path: string) => {
    if (!onReadFileBinary) throw new Error('Cannot load video')
    return onReadFileBinary(path)
  }, [onReadFileBinary])

  if (!spec || items.length === 0 || !onReadFileBinary) {
    return <CodeBlock code={code} language="json" mode="full" className={className} />
  }

  const fallback = <CodeBlock code={code} language="json" mode="full" className={className} />

  return (
    <VideoBlockErrorBoundary fallback={fallback}>
      <div className={cn('relative group rounded-[8px] overflow-hidden border bg-muted/10', className)}>
        <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-[12px] text-muted-foreground font-medium flex-1">
            {spec.title || 'Video Preview'}
          </span>
          <div className="flex items-center gap-1">
            <ItemNavigator items={items} activeIndex={activeIndex} onSelect={setActiveIndex} />
            <button
              onClick={() => setIsFullscreen(true)}
              className={cn(
                'p-1 rounded-[6px] transition-all select-none',
                'bg-background shadow-minimal',
                'text-muted-foreground/50 hover:text-foreground',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:opacity-100',
                hasMultiple ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
              title="View Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative h-[320px] overflow-hidden bg-black">
          {loading && !videoUrl && (
            <div className="h-full flex items-center justify-center text-muted-foreground text-[13px] bg-muted/20">
              Loading...
            </div>
          )}
          {!loading && !videoUrl && error && (
            <div className="h-full flex items-center justify-center text-destructive/70 text-[13px] bg-muted/20">
              {error}
            </div>
          )}
          {videoUrl && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="h-full w-full"
            >
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-contain"
              />
            </button>
          )}
        </div>
      </div>

      <VideoPreviewOverlay
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        filePath={activeItem!.src}
        items={items}
        initialIndex={activeIndex}
        title={spec.title}
        loadVideoData={loadVideoData}
      />
    </VideoBlockErrorBoundary>
  )
}
