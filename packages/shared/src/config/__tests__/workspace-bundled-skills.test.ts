import { describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { pathToFileURL } from 'url'

const STORAGE_MODULE_PATH = pathToFileURL(join(import.meta.dir, '..', 'storage.ts')).href

const CONFIG_DEFAULTS = {
  version: '1.0',
  description: 'Test defaults',
  defaults: {
    notificationsEnabled: true,
    colorTheme: 'default',
    uiLanguage: 'system',
    autoCapitalisation: true,
    sendMessageKey: 'enter',
    spellCheck: false,
    keepAwakeWhileRunning: false,
    richToolDescriptions: true,
  },
  workspaceDefaults: {
    thinkingLevel: 'think',
    permissionMode: 'safe',
    cyclablePermissionModes: ['safe', 'allow-all'],
    localMcpServers: {
      enabled: true,
    },
  },
}

function writeRootConfig(configDir: string, workspaces: any[] = []): string {
  const configPath = join(configDir, 'config.json')
  writeFileSync(
    configPath,
    JSON.stringify({
      workspaces,
      activeWorkspaceId: workspaces[0]?.id ?? null,
      activeSessionId: null,
    }, null, 2),
    'utf-8',
  )
  return configPath
}

function writeConfigDefaults(configDir: string): void {
  writeFileSync(join(configDir, 'config-defaults.json'), JSON.stringify(CONFIG_DEFAULTS, null, 2), 'utf-8')
}

function createBundledSkill(tempRoot: string, slug: string): void {
  const skillDir = join(tempRoot, 'resources', 'bundled-skills', slug)
  mkdirSync(join(skillDir, 'scripts'), { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), `---
name: "${slug}"
description: "Bundled ${slug} skill"
---

Use the ${slug} skill.
`, 'utf-8')
  writeFileSync(join(skillDir, 'scripts', 'run.sh'), '#!/bin/sh\necho bundled\n', 'utf-8')
}

function runStorageScript(tempRoot: string, configDir: string, script: string): void {
  const run = Bun.spawnSync([
    process.execPath,
    '--eval',
    script,
  ], {
    cwd: tempRoot,
    env: {
      ...process.env,
      ZHANGYUGE_AGENT_CONFIG_DIR: configDir,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (run.exitCode !== 0) {
    throw new Error(
      `storage subprocess failed (exit ${run.exitCode})\nstdout:\n${run.stdout.toString()}\nstderr:\n${run.stderr.toString()}`,
    )
  }
}

describe('workspace bundled skills seeding', () => {
  it('copies bundled skills into a newly created workspace', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'workspace-bundled-skills-'))
    const configDir = join(tempRoot, 'config')
    const workspaceRoot = join(tempRoot, 'workspaces', 'alpha')

    mkdirSync(configDir, { recursive: true })
    writeRootConfig(configDir)
    writeConfigDefaults(configDir)
    createBundledSkill(tempRoot, 'nano-pdf')

    runStorageScript(
      tempRoot,
      configDir,
      `import { addWorkspace } from '${STORAGE_MODULE_PATH}'; addWorkspace({ rootPath: ${JSON.stringify(workspaceRoot)}, name: 'Alpha Workspace' });`,
    )

    expect(existsSync(join(workspaceRoot, 'skills', 'nano-pdf', 'SKILL.md'))).toBe(true)
    expect(existsSync(join(workspaceRoot, 'skills', 'nano-pdf', 'scripts', 'run.sh'))).toBe(true)

    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('does not reseed bundled skills when loadStoredConfig repairs a workspace', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'workspace-bundled-skills-'))
    const configDir = join(tempRoot, 'config')
    const workspaceRoot = join(tempRoot, 'workspaces', 'beta')

    mkdirSync(configDir, { recursive: true })
    writeRootConfig(configDir)
    writeConfigDefaults(configDir)
    createBundledSkill(tempRoot, 'weather')

    runStorageScript(
      tempRoot,
      configDir,
      `import { addWorkspace } from '${STORAGE_MODULE_PATH}'; addWorkspace({ rootPath: ${JSON.stringify(workspaceRoot)}, name: 'Beta Workspace' });`,
    )

    rmSync(join(workspaceRoot, 'skills', 'weather'), { recursive: true, force: true })
    rmSync(join(workspaceRoot, 'config.json'), { force: true })

    const rootConfigPath = join(configDir, 'config.json')
    const rootConfig = JSON.parse(readFileSync(rootConfigPath, 'utf-8'))
    expect(rootConfig.workspaces).toHaveLength(1)

    runStorageScript(
      tempRoot,
      configDir,
      `import { loadStoredConfig } from '${STORAGE_MODULE_PATH}'; loadStoredConfig();`,
    )

    expect(existsSync(join(workspaceRoot, 'config.json'))).toBe(true)
    expect(existsSync(join(workspaceRoot, 'skills'))).toBe(true)
    expect(existsSync(join(workspaceRoot, 'skills', 'weather', 'SKILL.md'))).toBe(false)

    rmSync(tempRoot, { recursive: true, force: true })
  })
})
