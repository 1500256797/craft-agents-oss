import type { ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { settingsUI } from './SettingsUIConstants'

interface SettingsPageFrameProps {
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function SettingsPageFrame({
  children,
  className,
  contentClassName,
}: SettingsPageFrameProps) {
  return (
    <div className={cn(settingsUI.pageShell, className)}>
      <ScrollArea className={settingsUI.pageScrollArea}>
        <div className={cn(settingsUI.pageContent, contentClassName)}>
          {children}
        </div>
      </ScrollArea>
    </div>
  )
}
