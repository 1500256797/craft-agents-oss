import { describe, expect, it } from 'bun:test'
import { buildCompoundRoute, parseCompoundRoute } from '../route-parser'

describe('route-parser: module routes', () => {
  it('parses "module/agents" as module navigator', () => {
    expect(parseCompoundRoute('module/agents')).toEqual({
      navigator: 'module',
      details: { type: 'agents', id: 'agents' },
    })
  })

  it('parses "module/models" as module navigator', () => {
    expect(parseCompoundRoute('module/models')).toEqual({
      navigator: 'module',
      details: { type: 'models', id: 'models' },
    })
  })

  it('roundtrips module route state', () => {
    const parsed = {
      navigator: 'module' as const,
      details: { type: 'knowledge-base', id: 'knowledge-base' },
    }
    expect(buildCompoundRoute(parsed)).toBe('module/knowledge-base')
  })
})
