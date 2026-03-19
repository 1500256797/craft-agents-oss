import { describe, expect, it } from 'bun:test'
import { classifyFile } from '../file-classification'

describe('classifyFile', () => {
  it('classifies mp4 files as video previews', () => {
    expect(classifyFile('/Users/ouhuang/output/video.mp4')).toEqual({
      type: 'video',
      canPreview: true,
    })
  })

  it('classifies webm files as video previews', () => {
    expect(classifyFile('/Users/ouhuang/output/demo.webm')).toEqual({
      type: 'video',
      canPreview: true,
    })
  })
})
