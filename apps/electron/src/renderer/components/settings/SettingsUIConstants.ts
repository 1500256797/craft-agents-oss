/**
 * SettingsUIConstants
 *
 * Centralized style definitions for consistent settings UI appearance.
 */

export const settingsUI = {
  /** Shared outer shell for settings pages with a masked scroll viewport */
  pageShell: 'flex-1 min-h-0 mask-fade-y',

  /** Shared scroll area sizing for settings pages */
  pageScrollArea: 'h-full',

  /** Shared content width + padding for settings pages */
  pageContent: 'px-5 py-7 max-w-3xl mx-auto',

  /** Label style for setting titles */
  label: 'text-sm font-medium',

  /** Description style for setting subtitles */
  description: 'text-sm text-muted-foreground',

  /** Smaller description for compact contexts (e.g., menu options) */
  descriptionSmall: 'text-xs text-muted-foreground',

  /** Gap between label and description (applied to description as margin-top) */
  labelDescriptionGap: 'mt-0',

  /** Gap for label group containers (applied as space-y) */
  labelGroup: 'space-y-0',
}
