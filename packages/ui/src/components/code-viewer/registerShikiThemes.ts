import { registerCustomTheme, resolveTheme } from '@pierre/diffs'

const GLOBAL_THEME_KEY = '__zhangyugeShikiThemesRegistered__'

/**
 * Register zhangyuge-dark / zhangyuge-light Shiki themes once per runtime.
 * Prevents duplicate registration warnings during HMR or StrictMode re-mounts.
 */
export function register章鱼哥AIShikiThemes() {
  if (typeof globalThis === 'undefined') return
  const globalRef = globalThis as typeof globalThis & { [GLOBAL_THEME_KEY]?: boolean }
  if (globalRef[GLOBAL_THEME_KEY]) return
  globalRef[GLOBAL_THEME_KEY] = true

  registerCustomTheme('zhangyuge-dark', async () => {
    const theme = await resolveTheme('pierre-dark')
    return { ...theme, name: 'zhangyuge-dark', bg: 'transparent', colors: { ...theme.colors, 'editor.background': 'transparent' } }
  })

  registerCustomTheme('zhangyuge-light', async () => {
    const theme = await resolveTheme('pierre-light')
    return { ...theme, name: 'zhangyuge-light', bg: 'transparent', colors: { ...theme.colors, 'editor.background': 'transparent' } }
  })
}
