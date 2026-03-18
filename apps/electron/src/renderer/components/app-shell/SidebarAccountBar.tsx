import * as React from 'react'
import { LogOut } from 'lucide-react'
import { CrossfadeAvatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  StyledDropdownMenuContent,
  StyledDropdownMenuItem,
  StyledDropdownMenuSeparator,
} from '@/components/ui/styled-dropdown'
import { useI18n } from '@/context/I18nContext'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import type { AccountUser, Workspace } from '../../../shared/types'

interface SidebarAccountBarProps {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  onSelectWorkspace: (workspaceId: string, openInNewWindow?: boolean) => void
  onWorkspaceCreated?: (workspace: Workspace) => void
  workspaceUnreadMap?: Record<string, boolean>
  onLogout: () => void
}

function getInitials(user: AccountUser | null): string {
  const base = user?.name?.trim() || user?.username?.trim() || 'U'
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }
  return base.slice(0, 1).toUpperCase()
}

export function SidebarAccountBar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onWorkspaceCreated,
  workspaceUnreadMap,
  onLogout,
}: SidebarAccountBarProps) {
  const { t } = useI18n()
  const [currentUser, setCurrentUser] = React.useState<AccountUser | null>(null)

  React.useEffect(() => {
    let cancelled = false

    const loadCurrentUser = async () => {
      try {
        const user = await window.electronAPI.getCurrentUser()
        if (!cancelled) {
          setCurrentUser(user)
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null)
        }
      }
    }

    void loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])

  const displayName = currentUser?.name?.trim() || currentUser?.username?.trim() || t('common.account.guest')
  const secondaryText = currentUser?.email?.trim() || currentUser?.username?.trim() || ''

  return (
    <div className="shrink-0 border-t border-foreground/8 px-2 pt-2 pb-2">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('common.account.menuAria')}
              className="titlebar-no-drag flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-border/60 hover:bg-foreground/5 transition-colors"
            >
              <CrossfadeAvatar
                src={currentUser?.avatar || undefined}
                alt={displayName}
                className="h-9 w-9 rounded-full"
                fallbackClassName="bg-foreground/6 text-foreground/75 text-xs font-semibold rounded-full"
                fallback={getInitials(currentUser)}
              />
            </button>
          </DropdownMenuTrigger>
          <StyledDropdownMenuContent side="top" align="start" minWidth="min-w-56">
            <div className="px-2 py-2">
              <div className="text-sm font-medium text-foreground">{displayName}</div>
              {secondaryText && (
                <div className="mt-0.5 text-xs text-muted-foreground truncate">
                  {secondaryText}
                </div>
              )}
            </div>
            <StyledDropdownMenuSeparator />
            <StyledDropdownMenuItem onClick={onLogout}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="flex-1">{t('common.account.logout')}</span>
            </StyledDropdownMenuItem>
          </StyledDropdownMenuContent>
        </DropdownMenu>

        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher
            variant="sidebar"
            showAvatars={false}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelect={onSelectWorkspace}
            onWorkspaceCreated={onWorkspaceCreated}
            workspaceUnreadMap={workspaceUnreadMap}
          />
        </div>
      </div>
    </div>
  )
}
