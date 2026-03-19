import { describe, it, expect } from 'bun:test'
import { classifyMarkdownLinkTarget } from '../link-target'

describe('classifyMarkdownLinkTarget', () => {
  it('classifies absolute unix file paths as file', () => {
    expect(classifyMarkdownLinkTarget('/Users/balintorosz/.zhangyuge-agent/sessions/abc/image.jpg')).toBe('file')
  })

  it('classifies parent-relative file paths as file', () => {
    expect(classifyMarkdownLinkTarget('../downloads/assets/screenshot.png')).toBe('file')
  })

  it('classifies repo-relative file paths as file', () => {
    expect(classifyMarkdownLinkTarget('apps/electron/resources/docs/browser-tools.md')).toBe('file')
  })

  it('classifies explicit directory paths as file', () => {
    expect(classifyMarkdownLinkTarget('/Users/ouhuang/.zhangyuge-agent/workspaces/222/sessions/260319-fine-lily/xhs-images/zhangyuge-agent-xiaohongshu')).toBe('file')
  })

  it('classifies file URLs as file', () => {
    expect(classifyMarkdownLinkTarget('file:///Users/ouhuang/Desktop/image.png')).toBe('file')
  })

  it('classifies local video paths as file', () => {
    expect(classifyMarkdownLinkTarget('/Users/ouhuang/.zhangyuge-agent/workspaces/222/sessions/260319-sharp-pebble/zhangyuge-promo/out/video.mp4')).toBe('file')
  })

  it('classifies https links as url', () => {
    expect(classifyMarkdownLinkTarget('https://example.com/image.jpg')).toBe('url')
  })

  it('classifies mailto links as url', () => {
    expect(classifyMarkdownLinkTarget('mailto:test@example.com')).toBe('url')
  })
})
