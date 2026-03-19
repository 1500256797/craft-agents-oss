import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { useI18n } from '@/context/I18nContext'
import { routes } from '@/lib/navigate'
import WorkspaceSettingsPage from '@/pages/settings/WorkspaceSettingsPage'

export default function AgentsPage() {
  const { t } = useI18n()

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title={t('common.sidebar.nav.agents')}
        actions={<HeaderMenu route={routes.view.module('agents')} />}
      />

      <WorkspaceSettingsPage
        embedded
        emptyStateText={t('settings.lists.agents.emptySelection')}
      />
    </div>
  )
}
