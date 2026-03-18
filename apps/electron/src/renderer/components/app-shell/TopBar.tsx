/**
 * TopBar - Persistent top bar above all panels (Slack-style)
 *
 * Layout: [Sidebar] ... [Browser strip] [+] [Help]
 *
 * Fixed at top of window, 40px tall.
 */

import * as Icons from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@craft-agent/ui"
import { PanelLeftRounded } from "../icons/PanelLeftRounded"
import { TopBarButton } from "../ui/TopBarButton"
import { isMac } from "@/lib/platform"
import { useActionLabel } from "@/actions"
import { useI18n } from "@/context/I18nContext"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  DropdownMenuSub,
  StyledDropdownMenuContent,
  StyledDropdownMenuItem,
  StyledDropdownMenuSeparator,
  StyledDropdownMenuSubTrigger,
  StyledDropdownMenuSubContent,
} from "@/components/ui/styled-dropdown"
import {
  EDIT_MENU,
  VIEW_MENU,
  WINDOW_MENU,
  SETTINGS_ITEMS,
  getShortcutDisplay,
} from "../../../shared/menu-schema"
import type { MenuItem, MenuSection, SettingsMenuItem } from "../../../shared/menu-schema"
import { SETTINGS_ICONS } from "../icons/SettingsIcons"
import { SquarePenRounded } from "../icons/SquarePenRounded"
import { useEffect, useRef, useState } from "react"
import { BrowserTabStrip } from "../browser/BrowserTabStrip"
import type { Workspace } from "../../../shared/types"
import { getDocUrl } from "@craft-agent/shared/docs/doc-links"
import { getMenuItemLabel, getMenuSectionLabel, getSettingsPageCopy } from "../../../shared/i18n"

// --- Menu rendering (moved from AppMenu) ---

type MenuActionHandlers = {
  toggleFocusMode?: () => void
  toggleSidebar?: () => void
}

const roleHandlers: Record<string, () => void> = {
  undo: () => window.electronAPI.menuUndo(),
  redo: () => window.electronAPI.menuRedo(),
  cut: () => window.electronAPI.menuCut(),
  copy: () => window.electronAPI.menuCopy(),
  paste: () => window.electronAPI.menuPaste(),
  selectAll: () => window.electronAPI.menuSelectAll(),
  zoomIn: () => window.electronAPI.menuZoomIn(),
  zoomOut: () => window.electronAPI.menuZoomOut(),
  resetZoom: () => window.electronAPI.menuZoomReset(),
  minimize: () => window.electronAPI.menuMinimize(),
  zoom: () => window.electronAPI.menuMaximize(),
}

const RIGHT_SLOT_FULL_BADGES_THRESHOLD = 420
const RIGHT_SLOT_TWO_BADGES_THRESHOLD = 300
const MAC_WINDOWED_LEFT_PADDING = 86
const MAC_FULLSCREEN_LEFT_PADDING = 12
const FULLSCREEN_VIEWPORT_TOLERANCE = 4

function detectMacFullscreenFromViewport(): boolean {
  if (!isMac || typeof window === 'undefined') return false

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const screenWidth = window.screen.availWidth || window.screen.width
  const screenHeight = window.screen.availHeight || window.screen.height

  return Math.abs(viewportWidth - screenWidth) <= FULLSCREEN_VIEWPORT_TOLERANCE
    && Math.abs(viewportHeight - screenHeight) <= FULLSCREEN_VIEWPORT_TOLERANCE
}

function getIcon(name: string): React.ComponentType<{ className?: string }> | null {
  const IconComponent = Icons[name as keyof typeof Icons] as React.ComponentType<{ className?: string }> | undefined
  return IconComponent ?? null
}

function renderMenuItem(
  item: MenuItem,
  index: number,
  actionHandlers: MenuActionHandlers,
  locale: 'en' | 'zh-CN',
): React.ReactNode {
  if (item.type === 'separator') {
    return <StyledDropdownMenuSeparator key={`sep-${index}`} />
  }

  const Icon = getIcon(item.icon)
  const shortcut = getShortcutDisplay(item, isMac)
  const label = getMenuItemLabel(locale, item) ?? item.label

  if (item.type === 'role') {
    const handler = roleHandlers[item.role]
    const safeHandler = handler ?? (() => {
      console.warn(`[TopBar] No handler registered for role: ${item.role}`)
    })
    return (
      <StyledDropdownMenuItem key={item.role} onClick={safeHandler}>
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
        {shortcut && <DropdownMenuShortcut className="pl-6">{shortcut}</DropdownMenuShortcut>}
      </StyledDropdownMenuItem>
    )
  }

  if (item.type === 'action') {
    const handler = item.id === 'toggleFocusMode'
      ? actionHandlers.toggleFocusMode
      : item.id === 'toggleSidebar'
        ? actionHandlers.toggleSidebar
        : undefined
    return (
      <StyledDropdownMenuItem key={item.id} onClick={handler}>
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
        {shortcut && <DropdownMenuShortcut className="pl-6">{shortcut}</DropdownMenuShortcut>}
      </StyledDropdownMenuItem>
    )
  }

  return null
}

function renderMenuSection(
  section: MenuSection,
  actionHandlers: MenuActionHandlers,
  locale: 'en' | 'zh-CN',
): React.ReactNode {
  const Icon = getIcon(section.icon)
  return (
    <DropdownMenuSub key={section.id}>
      <StyledDropdownMenuSubTrigger>
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {getMenuSectionLabel(locale, section)}
      </StyledDropdownMenuSubTrigger>
      <StyledDropdownMenuSubContent>
        {section.items.map((item, index) => renderMenuItem(item, index, actionHandlers, locale))}
      </StyledDropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

// --- TopBar ---

interface TopBarProps {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  onSelectWorkspace: (workspaceId: string, openInNewWindow?: boolean) => void
  workspaceUnreadMap?: Record<string, boolean>
  onWorkspaceCreated?: (workspace: Workspace) => void
  activeSessionId?: string | null
  onNewChat: () => void
  onNewWindow?: () => void
  onOpenSettings: () => void
  onOpenSettingsSubpage: (subpage: SettingsMenuItem['id']) => void
  onOpenKeyboardShortcuts: () => void
  onOpenStoredUserPreferences: () => void
  onToggleSidebar: () => void
  onToggleFocusMode: () => void
  onAddSessionPanel: () => void
  onAddBrowserPanel: () => void
}

export function TopBar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  workspaceUnreadMap,
  onWorkspaceCreated,
  activeSessionId,
  onNewChat,
  onNewWindow,
  onOpenSettings,
  onOpenSettingsSubpage,
  onOpenKeyboardShortcuts,
  onOpenStoredUserPreferences,
  onToggleSidebar,
  onToggleFocusMode,
  onAddSessionPanel,
  onAddBrowserPanel,
}: TopBarProps) {
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [isWindowFullscreen, setIsWindowFullscreen] = useState(false)
  const [maxVisibleBrowserBadges, setMaxVisibleBrowserBadges] = useState(3)
  const rightSlotRef = useRef<HTMLDivElement | null>(null)
  const { t, resolvedLanguage } = useI18n()

  const newChatHotkey = useActionLabel('app.newChat').hotkey
  const newWindowHotkey = useActionLabel('app.newWindow').hotkey
  const settingsHotkey = useActionLabel('app.settings').hotkey
  const keyboardShortcutsHotkey = useActionLabel('app.keyboardShortcuts').hotkey
  const quitHotkey = useActionLabel('app.quit').hotkey
  useEffect(() => {
    window.electronAPI.isDebugMode().then(setIsDebugMode)
  }, [])

  useEffect(() => {
    if (!isMac) return

    let mounted = true
    let resizeSyncTimer: number | null = null

    const setFullscreenState = (fullscreen: boolean) => {
      if (!mounted) return
      setIsWindowFullscreen((prev) => (prev === fullscreen ? prev : fullscreen))
    }

    const syncWindowFullscreenState = () => {
      void window.electronAPI.getWindowFullscreenState().then((fullscreen) => {
        if (!mounted) return
        setFullscreenState(fullscreen)
      }).catch(() => {
        setFullscreenState(detectMacFullscreenFromViewport())
      })
    }

    syncWindowFullscreenState()

    const cleanup = window.electronAPI.onWindowFullscreenChange((fullscreen) => {
      setFullscreenState(fullscreen)
      requestAnimationFrame(syncWindowFullscreenState)
    })

    const scheduleViewportSync = () => {
      setFullscreenState(detectMacFullscreenFromViewport())
      if (resizeSyncTimer !== null) {
        window.clearTimeout(resizeSyncTimer)
      }
      resizeSyncTimer = window.setTimeout(() => {
        resizeSyncTimer = null
        syncWindowFullscreenState()
      }, 120)
    }

    window.addEventListener('resize', scheduleViewportSync)

    return () => {
      mounted = false
      window.removeEventListener('resize', scheduleViewportSync)
      if (resizeSyncTimer !== null) {
        window.clearTimeout(resizeSyncTimer)
      }
      cleanup()
    }
  }, [])

  useEffect(() => {
    const slotEl = rightSlotRef.current
    if (!slotEl) return

    let frame = 0

    const updateBadgeDensity = () => {
      const slotWidth = slotEl.getBoundingClientRect().width
      const nextMaxVisibleBadges = slotWidth >= RIGHT_SLOT_FULL_BADGES_THRESHOLD
        ? 3
        : slotWidth >= RIGHT_SLOT_TWO_BADGES_THRESHOLD
          ? 2
          : 1

      setMaxVisibleBrowserBadges((prev) => (prev === nextMaxVisibleBadges ? prev : nextMaxVisibleBadges))
    }

    const schedule = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateBadgeDensity)
    }

    const observer = new ResizeObserver(schedule)
    observer.observe(slotEl)
    updateBadgeDensity()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [workspaces.length, activeWorkspaceId])

  const actionHandlers: MenuActionHandlers = {
    toggleFocusMode: onToggleFocusMode,
    toggleSidebar: onToggleSidebar,
  }

  const menuLeftPadding = isMac ? (isWindowFullscreen ? MAC_FULLSCREEN_LEFT_PADDING : MAC_WINDOWED_LEFT_PADDING) : 12

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[40px] z-panel titlebar-drag-region"
    >
      <div className="flex h-full w-full items-center justify-start gap-2">
      {/* === LEFT: Sidebar Toggle === */}
      {/* Keep this container draggable. Only individual interactive controls should use titlebar-no-drag. */}
      <div className="pointer-events-auto flex min-w-0 items-center gap-0.5" style={{ paddingLeft: menuLeftPadding }}>
        <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <TopBarButton
              onClick={onToggleSidebar}
              aria-label={t('menu.topBar.toggleSidebarAria')}
              className="h-7 w-7 rounded-lg"
            >
              <PanelLeftRounded className="h-[18px] w-[18px] text-foreground/70" />
            </TopBarButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('menu.topBar.toggleSidebar')}</TooltipContent>
        </Tooltip>
        </div>
      </div>

      {/* === RIGHT: Browser strip + add + help === */}
      <div ref={rightSlotRef} className="flex min-w-0 shrink-0 items-center justify-end gap-1 ml-auto" style={{ paddingRight: 12 }}>
        <div className="min-w-0">
          <BrowserTabStrip activeSessionId={activeSessionId} maxVisibleBadges={maxVisibleBrowserBadges} />
        </div>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <TopBarButton aria-label={t('menu.topBar.addPanelMenuAria')} className="ml-1 h-7 w-7 rounded-lg">
              <Icons.Plus className="h-[18px] w-[18px] text-foreground/50" strokeWidth={1.5} />
            </TopBarButton>
          </DropdownMenuTrigger>
          <StyledDropdownMenuContent align="end" minWidth="min-w-56">
            <StyledDropdownMenuItem onClick={onAddSessionPanel}>
              <SquarePenRounded className="h-3.5 w-3.5" />
              {t('menu.topBar.newSessionPanel')}
            </StyledDropdownMenuItem>
            <StyledDropdownMenuItem onClick={onAddBrowserPanel}>
              <Icons.Globe className="h-3.5 w-3.5" />
              {t('menu.topBar.newBrowserWindow')}
            </StyledDropdownMenuItem>
          </StyledDropdownMenuContent>
        </DropdownMenu>

        {/* Help button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <TopBarButton aria-label={t('menu.topBar.helpDocsAria')} className="h-7 w-7 rounded-lg">
              <Icons.HelpCircle className="h-[18px] w-[18px] text-foreground/50" strokeWidth={1.5} />
            </TopBarButton>
          </DropdownMenuTrigger>
          <StyledDropdownMenuContent align="end" minWidth="min-w-48">
            <StyledDropdownMenuItem onClick={() => window.electronAPI.openUrl(getDocUrl('sources'))}>
              <Icons.DatabaseZap className="h-3.5 w-3.5" />
              <span className="flex-1">{t('menu.topBar.sources')}</span>
              <Icons.ExternalLink className="h-3 w-3 text-muted-foreground" />
            </StyledDropdownMenuItem>
            <StyledDropdownMenuItem onClick={() => window.electronAPI.openUrl(getDocUrl('skills'))}>
              <Icons.Zap className="h-3.5 w-3.5" />
              <span className="flex-1">{t('menu.topBar.skills')}</span>
              <Icons.ExternalLink className="h-3 w-3 text-muted-foreground" />
            </StyledDropdownMenuItem>
            <StyledDropdownMenuItem onClick={() => window.electronAPI.openUrl(getDocUrl('statuses'))}>
              <Icons.CheckCircle2 className="h-3.5 w-3.5" />
              <span className="flex-1">{t('menu.topBar.statuses')}</span>
              <Icons.ExternalLink className="h-3 w-3 text-muted-foreground" />
            </StyledDropdownMenuItem>
            <StyledDropdownMenuItem onClick={() => window.electronAPI.openUrl(getDocUrl('permissions'))}>
              <Icons.Settings className="h-3.5 w-3.5" />
              <span className="flex-1">{t('menu.topBar.permissions')}</span>
              <Icons.ExternalLink className="h-3 w-3 text-muted-foreground" />
            </StyledDropdownMenuItem>
            <StyledDropdownMenuItem onClick={() => window.electronAPI.openUrl(getDocUrl('automations'))}>
              <Icons.Webhook className="h-3.5 w-3.5" />
              <span className="flex-1">{t('menu.topBar.automations')}</span>
              <Icons.ExternalLink className="h-3 w-3 text-muted-foreground" />
            </StyledDropdownMenuItem>
            <StyledDropdownMenuSeparator />
            <StyledDropdownMenuItem onClick={() => window.electronAPI.openUrl('https://agents.craft.do/docs')}>
              <Icons.ExternalLink className="h-3.5 w-3.5" />
              <span className="flex-1">{t('menu.topBar.allDocumentation')}</span>
            </StyledDropdownMenuItem>
          </StyledDropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
    </div>
  )
}
