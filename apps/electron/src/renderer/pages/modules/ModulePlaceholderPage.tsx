import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { routes } from '@/lib/navigate'
import { getModulePage, type ModuleSubpage } from '../../../shared/module-registry'

interface ModulePlaceholderPageProps {
  subpage: ModuleSubpage
  route?: string
}

export default function ModulePlaceholderPage({ subpage, route = routes.view.module(subpage) }: ModulePlaceholderPageProps) {
  const modulePage = getModulePage(subpage)

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title={modulePage.label}
        actions={<HeaderMenu route={route} />}
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <div className="rounded-[14px] border border-foreground/10 bg-background px-5 py-5 shadow-minimal">
            <h2 className="text-base font-semibold text-foreground">{modulePage.label}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {modulePage.description}
            </p>
          </div>

          <div className="rounded-[14px] border border-dashed border-foreground/15 bg-foreground/[0.02] px-5 py-6">
            <p className="text-sm font-medium text-foreground">Desktop shell ready</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This area is now reserved in the Client information architecture. The next implementation step is to port the module behavior from Web using Client-native UI and interaction patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
