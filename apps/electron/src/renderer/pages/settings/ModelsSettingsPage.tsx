import ModelsPage from '../modules/ModelsPage'
import { routes } from '@/lib/navigate'

export const meta = {
  navigator: 'settings',
  slug: 'models',
}

export default function ModelsSettingsPage() {
  return <ModelsPage headerRoute={routes.view.settings('models')} layout="settings" />
}
