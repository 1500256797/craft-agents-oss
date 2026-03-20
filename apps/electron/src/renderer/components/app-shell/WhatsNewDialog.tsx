import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useI18n } from "@/context/I18nContext"

interface WhatsNewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  version?: string
  onOpenUrl?: (url: string) => void
}

function formatVersionLabel(version?: string) {
  const value = version?.trim()
  if (!value) return null
  return value.startsWith("v") ? value : `v${value}`
}

export function WhatsNewDialog({
  open,
  onOpenChange,
  content,
  version,
  onOpenUrl,
}: WhatsNewDialogProps) {
  const { t } = useI18n()
  const versionLabel = formatVersionLabel(version)
  const hasContent = content.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden p-0 sm:max-w-3xl">
        <div className="flex max-h-[80vh] min-h-0 flex-col">
          <div className="shrink-0 border-b border-border/60 px-6 py-4">
            <DialogHeader className="gap-0 text-left">
              <div className="flex items-center justify-between gap-3 pr-8">
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold">
                    {t('common.sidebar.whatsNewDialog.title')}
                  </DialogTitle>
                </div>
                {versionLabel && (
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {t('common.sidebar.whatsNewDialog.latestVersion')} {versionLabel}
                  </div>
                )}
              </div>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 px-6 py-3">
            {hasContent ? (
              <div className="h-full min-h-0 overflow-y-scroll pr-3">
                <div className="pb-2 text-sm leading-6">
                  <Markdown mode="minimal" onUrlClick={onOpenUrl}>
                    {content}
                  </Markdown>
                </div>
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground">
                {t('common.sidebar.whatsNewDialog.empty')}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 px-6 py-3 sm:justify-end">
            <Button size="sm" onClick={() => onOpenChange(false)}>
              {t('common.sidebar.whatsNewDialog.acknowledge')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
