import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'

let originalPlatform: PropertyDescriptor | undefined
let originalArch: PropertyDescriptor | undefined

function setPlatform(value: string) {
  Object.defineProperty(process, 'platform', { value, configurable: true })
}

function setArch(value: string) {
  Object.defineProperty(process, 'arch', { value, configurable: true })
}

describe('checkVCRedistInstalled', () => {
  beforeEach(() => {
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')
    originalArch = Object.getOwnPropertyDescriptor(process, 'arch')
  })

  afterEach(() => {
    if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform)
    if (originalArch) Object.defineProperty(process, 'arch', originalArch)
  })

  it('returns installed=true on non-Windows platforms', async () => {
    setPlatform('darwin')
    const { checkVCRedistInstalled } = await import('./vcredist.ts')
    const result = checkVCRedistInstalled()
    expect(result.installed).toBe(true)
    expect(result.message).toContain('Not applicable')
    expect(result.downloadUrl).toBeUndefined()
  })

  it('returns installed=true when DLL exists in System32', async () => {
    if (process.platform !== 'win32') return

    const { checkVCRedistInstalled } = await import('./vcredist.ts')
    const sysRoot = process.env.SystemRoot ?? 'C:\\Windows'
    const dllPath = join(sysRoot, 'System32', 'vcruntime140.dll')

    const { existsSync } = await import('node:fs')
    if (existsSync(dllPath)) {
      const result = checkVCRedistInstalled()
      expect(result.installed).toBe(true)
      expect(result.message).toContain('vcruntime140.dll')
    }
  })

  it('returns correct x64 download URL when DLL not found', async () => {
    if (process.platform !== 'win32') return

    const origSystemRoot = process.env.SystemRoot
    process.env.SystemRoot = join(process.cwd(), '__nonexistent_sysroot__')
    setArch('x64')

    try {
      delete require.cache[require.resolve('./vcredist.ts')]
      const { checkVCRedistInstalled } = require('./vcredist.ts')
      const result = checkVCRedistInstalled()
      expect(result.installed).toBe(false)
      expect(result.downloadUrl).toBe('https://aka.ms/vs/17/release/vc_redist.x64.exe')
      expect(result.message).toContain('not installed')
    } finally {
      if (origSystemRoot) {
        process.env.SystemRoot = origSystemRoot
      }
    }
  })

  it('returns correct ARM64 download URL on ARM64 architecture', async () => {
    if (process.platform !== 'win32') return

    const origSystemRoot = process.env.SystemRoot
    process.env.SystemRoot = join(process.cwd(), '__nonexistent_sysroot__')
    setArch('arm64')

    try {
      delete require.cache[require.resolve('./vcredist.ts')]
      const { checkVCRedistInstalled } = require('./vcredist.ts')
      const result = checkVCRedistInstalled()
      expect(result.installed).toBe(false)
      expect(result.downloadUrl).toBe('https://aka.ms/vs/17/release/vc_redist.arm64.exe')
    } finally {
      if (origSystemRoot) {
        process.env.SystemRoot = origSystemRoot
      }
    }
  })
})
