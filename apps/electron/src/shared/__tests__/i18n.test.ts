import { describe, expect, it } from 'bun:test'
import { translateUi } from '../i18n'

describe('translateUi namespace aliases', () => {
  it('resolves sourceInfo keys from settings namespace', () => {
    expect(translateUi('en', 'sourceInfo.labels.type')).toBe('Type')
  })

  it('resolves skillInfo keys from settings namespace', () => {
    expect(translateUi('en', 'skillInfo.labels.slug')).toBe('Slug')
  })

  it('resolves common.cronBuilder keys from settings namespace', () => {
    expect(translateUi('en', 'common.cronBuilder.commonSchedules')).toBe('Common Schedules')
  })

  it('resolves common.editPopover keys from settings namespace', () => {
    expect(translateUi('en', 'common.editPopover.processingMessages.0')).toBe('Thinking...')
  })

  it('resolves updates keys from settings namespace', () => {
    expect(translateUi('en', 'updates.upToDate')).toBe("You're up to date")
  })

  it('resolves common.chatPage keys from settings namespace', () => {
    expect(translateUi('en', 'common.chatPage.linkCopied')).toBe('Link copied to clipboard')
  })

  it('resolves auth keys from settings namespace', () => {
    expect(translateUi('en', 'auth.login.title')).toBe('Sign In')
  })
})
